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
router.get("/", async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;
    const { from, to, limit = "30" } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { boutiqueId };
    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const ventes = await prisma.venteJournaliere.findMany({
      where,
      orderBy: { date: "desc" },
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
