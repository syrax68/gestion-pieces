import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, AuthRequest, isVendeurOrAdmin } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { handleRouteError } from "../utils/handleError.js";
import { logActivity } from "../lib/activityLog.js";

const router = Router();
router.use(authenticate, injectBoutique);

const venteSchema = z.object({
  montant: z.number().positive("Le montant doit être positif"),
  date: z.string().optional(),
  notes: z.string().optional(),
});

// Liste des ventes journalières
// - Sans `page` : renvoie un tableau simple (rétro-compatible), trié date desc.
// - Avec `page`  : renvoie { data, pagination } avec tri serveur (date | montant, asc | desc).
router.get("/", async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;
    const { from, to, limit = "30", page, sortBy = "date", sortDir = "desc" } =
      req.query as Record<string, string>;

    const where: Record<string, unknown> = { boutiqueId };
    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    // Tri serveur — liste blanche stricte pour éviter toute injection de champ.
    const sortField = sortBy === "montant" ? "montant" : "date";
    const sortOrder = sortDir === "asc" ? "asc" : "desc";
    const orderBy = [{ [sortField]: sortOrder }] as Record<string, "asc" | "desc">[];

    // Mode paginé
    if (page !== undefined) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const take = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageNum - 1) * take;

      const [ventes, total] = await prisma.$transaction([
        prisma.venteJournaliere.findMany({ where, orderBy, take, skip }),
        prisma.venteJournaliere.count({ where }),
      ]);

      return res.json({
        data: ventes.map((v) => ({ ...v, montant: Number(v.montant) })),
        pagination: {
          page: pageNum,
          limit: take,
          total,
          totalPages: Math.max(1, Math.ceil(total / take)),
        },
      });
    }

    // Mode simple (rétro-compatible)
    const ventes = await prisma.venteJournaliere.findMany({
      where,
      orderBy,
      take: Math.min(100, parseInt(limit, 10)),
    });

    res.json(ventes.map((v) => ({ ...v, montant: Number(v.montant) })));
  } catch (error) {
    handleRouteError(res, error, "la récupération des ventes journalières");
  }
});

// Créer une vente journalière
router.post("/", isVendeurOrAdmin, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const boutiqueId = authReq.boutiqueId;
    const { montant, date, notes } = venteSchema.parse(req.body);

    const vente = await prisma.venteJournaliere.create({
      data: {
        boutiqueId: boutiqueId!,
        montant,
        notes,
        date: date ? new Date(date) : new Date(),
      },
    });

    await logActivity(
      authReq.user!.userId,
      "CREATE",
      "VenteJournaliere",
      vente.id,
      `Vente journalière de ${montant} Ar enregistrée`,
      boutiqueId,
    );

    res.status(201).json({ ...vente, montant: Number(vente.montant) });
  } catch (error) {
    handleRouteError(res, error, "l'enregistrement de la vente journalière");
  }
});

// Modifier une vente journalière
router.put("/:id", isVendeurOrAdmin, async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;
    const { montant, date, notes } = venteSchema.parse(req.body);

    const existing = await prisma.venteJournaliere.findFirst({
      where: { id: req.params.id, boutiqueId },
    });
    if (!existing) return res.status(404).json({ error: "Vente introuvable" });

    const vente = await prisma.venteJournaliere.update({
      where: { id: req.params.id },
      data: { montant, notes, date: date ? new Date(date) : existing.date },
    });

    res.json({ ...vente, montant: Number(vente.montant) });
  } catch (error) {
    handleRouteError(res, error, "la modification de la vente journalière");
  }
});

// Supprimer une vente journalière
router.delete("/:id", isVendeurOrAdmin, async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;

    const existing = await prisma.venteJournaliere.findFirst({
      where: { id: req.params.id, boutiqueId },
    });
    if (!existing) return res.status(404).json({ error: "Vente introuvable" });

    await prisma.venteJournaliere.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    handleRouteError(res, error, "la suppression de la vente journalière");
  }
});

export default router;
