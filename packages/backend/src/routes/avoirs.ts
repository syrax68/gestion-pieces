import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { logActivity } from "../lib/activityLog.js";
import { serializeAvoir } from "../utils/decimal.js";
import { generateNumero } from "../utils/generateNumero.js";
import { handleRouteError } from "../utils/handleError.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";
import { adjustStock } from "../services/stockService.js";

const router = Router();
router.use(authenticate, injectBoutique);

const avoirItemSchema = z.object({
  pieceId: z.string().optional(),
  designation: z.string().min(1, "Désignation requise"),
  quantite: z.number().int().positive(),
  prixUnitaire: z.number().positive(),
  tva: z.number().min(0).max(100).default(0),
  retourStock: z.boolean().default(true),
});

const avoirSchema = z.object({
  clientId: z.string().optional(),
  factureId: z.string().optional(),
  motif: z.string().min(1, "Motif requis"),
  items: z.array(avoirItemSchema).min(1, "Au moins un article requis"),
  notes: z.string().optional(),
});

const avoirIncludes = {
  client: true,
  facture: { select: { id: true, numero: true, statut: true } },
  items: { include: { piece: true } },
} as const;

function computeAvoirTotals(items: z.infer<typeof avoirItemSchema>[]) {
  const itemsWithTotals = items.map((item) => {
    const itemTotal = item.quantite * item.prixUnitaire;
    return { ...item, total: itemTotal };
  });

  const sousTotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
  const tvaTotal = itemsWithTotals.reduce((sum, item) => {
    return sum + item.total * (item.tva / 100);
  }, 0);
  const total = sousTotal + tvaTotal;

  return { itemsWithTotals, sousTotal, tvaTotal, total };
}

// Get all avoirs
router.get("/", async (req, res) => {
  try {
    const { statut, clientId } = req.query;
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;
    if (clientId) where.clientId = clientId;
    where.boutiqueId = (req as AuthRequest).boutiqueId;

    const avoirs = await prisma.avoir.findMany({
      where,
      include: avoirIncludes,
      orderBy: { dateAvoir: "desc" },
    });

    res.json(avoirs.map(serializeAvoir));
  } catch (error) {
    handleRouteError(res, error, "la récupération des avoirs");
  }
});

// Get avoir by ID
router.get("/:id", async (req, res) => {
  try {
    const avoir = await prisma.avoir.findUnique({
      where: { id: req.params.id },
      include: avoirIncludes,
    });

    if (!(await ensureBoutique(avoir, req as AuthRequest, res, "Avoir"))) return;

    res.json(serializeAvoir(avoir!));
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Create avoir
router.post("/", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = avoirSchema.parse(req.body);
    const numero = await generateNumero("avoir", "AV");

    const { itemsWithTotals, sousTotal, tvaTotal, total } = computeAvoirTotals(data.items);

    const avoir = await prisma.avoir.create({
      data: {
        numero,
        motif: data.motif,
        clientId: data.clientId,
        factureId: data.factureId,
        boutiqueId: req.boutiqueId!,
        sousTotal,
        tva: tvaTotal,
        total,
        statut: "EN_ATTENTE",
        notes: data.notes,
        items: {
          create: itemsWithTotals.map((item) => ({
            pieceId: item.pieceId || null,
            designation: item.designation,
            quantite: item.quantite,
            prixUnitaire: item.prixUnitaire,
            tva: item.tva,
            total: item.total,
            retourStock: item.retourStock,
          })),
        },
      },
      include: avoirIncludes,
    });

    await logActivity(
      req.user!.userId,
      "CREATE",
      "AVOIR",
      avoir.id,
      `Création avoir ${avoir.numero} — ${Number(avoir.total).toLocaleString("fr-FR")} Fmg`,
    );

    res.status(201).json(serializeAvoir(avoir));
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Validate avoir (EN_ATTENTE → VALIDE) — returns items to stock
router.patch("/:id/statut", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!["EN_ATTENTE", "VALIDE", "REMBOURSE"].includes(statut)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const existing = await prisma.avoir.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!(await ensureBoutique(existing, req, res, "Avoir"))) return;

    // When validating: return items to stock
    const isValidation = existing!.statut === "EN_ATTENTE" && statut === "VALIDE";

    const avoir = await prisma.$transaction(async (tx) => {
      const updated = await tx.avoir.update({
        where: { id },
        data: { statut },
        include: avoirIncludes,
      });

      if (isValidation) {
        for (const item of existing!.items) {
          if (item.pieceId && item.retourStock) {
            await adjustStock({
              tx,
              pieceId: item.pieceId,
              type: "RETOUR",
              quantite: item.quantite,
              motif: `Avoir ${existing!.numero} — ${existing!.motif}`,
              reference: existing!.numero,
              userId: req.user!.userId,
            });
          }
        }
      }

      return updated;
    });

    await logActivity(req.user!.userId, "STATUS_CHANGE", "AVOIR", avoir.id, `Avoir ${avoir.numero} → ${statut}`);

    res.json(serializeAvoir(avoir));
  } catch (error) {
    handleRouteError(res, error, "la mise à jour du statut");
  }
});

// Delete avoir (admin only, only EN_ATTENTE)
router.delete("/:id", isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const avoir = await prisma.avoir.findUnique({ where: { id } });
    if (!(await ensureBoutique(avoir, req, res, "Avoir"))) return;

    if (avoir!.statut !== "EN_ATTENTE") {
      return res.status(400).json({ error: "Seuls les avoirs en attente peuvent être supprimés" });
    }

    await prisma.avoir.delete({ where: { id } });

    await logActivity(req.user!.userId, "DELETE", "AVOIR", id, `Suppression de l'avoir ${avoir!.numero}`);
    res.json({ message: "Avoir supprimé" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
