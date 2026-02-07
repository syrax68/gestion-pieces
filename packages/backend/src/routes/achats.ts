import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { logActivity } from "../lib/activityLog.js";
import { serializeAchat } from "../utils/decimal.js";
import { generateNumero } from "../utils/generateNumero.js";
import { handleRouteError } from "../utils/handleError.js";
import { adjustStock } from "../services/stockService.js";

const router = Router();

const achatItemSchema = z.object({
  pieceId: z.string(),
  quantite: z.number().int().positive(),
  prixUnitaire: z.number().positive(),
  tva: z.number().min(0).max(100).default(20),
});

const achatSchema = z.object({
  fournisseurId: z.string().optional(),
  numeroFacture: z.string().optional(),
  items: z.array(achatItemSchema).min(1, "Au moins un article requis"),
  notes: z.string().optional(),
});

const achatIncludes = {
  fournisseur: true,
  items: { include: { piece: true } },
} as const;

// Get all achats
router.get("/", authenticate, async (req, res) => {
  try {
    const { statut } = req.query;
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;

    const achats = await prisma.achat.findMany({
      where,
      include: achatIncludes,
      orderBy: { dateAchat: "desc" },
    });

    res.json(achats.map(serializeAchat));
  } catch (error) {
    handleRouteError(res, error, "la récupération des achats");
  }
});

// Get achat by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const achat = await prisma.achat.findUnique({
      where: { id: req.params.id },
      include: achatIncludes,
    });

    if (!achat) {
      return res.status(404).json({ error: "Achat non trouvé" });
    }

    res.json(serializeAchat(achat));
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Create achat (with automatic stock update)
router.post("/", authenticate, isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = achatSchema.parse(req.body);
    const numero = await generateNumero("achat", "ACH");

    const itemsWithTotals = data.items.map((item) => {
      const totalHT = item.quantite * item.prixUnitaire;
      const totalTTC = totalHT * (1 + item.tva / 100);
      return { ...item, total: totalTTC };
    });

    const sousTotal = itemsWithTotals.reduce((sum, item) => sum + item.quantite * item.prixUnitaire, 0);
    const tvaTotal = itemsWithTotals.reduce((sum, item) => sum + item.quantite * item.prixUnitaire * (item.tva / 100), 0);
    const total = sousTotal + tvaTotal;

    const achat = await prisma.$transaction(async (tx) => {
      const newAchat = await tx.achat.create({
        data: {
          numero,
          numeroFacture: data.numeroFacture,
          fournisseurId: data.fournisseurId,
          sousTotal,
          tva: tvaTotal,
          total,
          statut: "PAYEE",
          notes: data.notes,
          items: {
            create: itemsWithTotals.map((item) => ({
              pieceId: item.pieceId,
              quantite: item.quantite,
              prixUnitaire: item.prixUnitaire,
              tva: item.tva,
              total: item.total,
            })),
          },
        },
        include: achatIncludes,
      });

      for (const item of data.items) {
        await adjustStock({
          tx,
          pieceId: item.pieceId,
          type: "ENTREE",
          quantite: item.quantite,
          motif: `Achat ${numero}`,
          reference: numero,
          userId: req.user!.userId,
        });
      }

      return newAchat;
    });

    await logActivity(
      req.user!.userId,
      "CREATE",
      "ACHAT",
      achat.id,
      `Création de l'achat ${achat.numero} — ${Number(achat.total).toLocaleString("fr-FR")} Fmg`,
    );

    res.status(201).json(serializeAchat(achat));
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update achat status
router.patch("/:id/statut", authenticate, isVendeurOrAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!["PAYEE", "EN_ATTENTE", "ANNULEE"].includes(statut)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const achat = await prisma.achat.update({
      where: { id },
      data: { statut },
      include: achatIncludes,
    });

    await logActivity(req.user!.userId, "STATUS_CHANGE", "ACHAT", achat.id, `Achat ${achat.numero} → ${statut}`);

    res.json(serializeAchat(achat));
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete achat (admin only)
router.delete("/:id", authenticate, isAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const achat = await prisma.achat.findUnique({ where: { id } });
    await prisma.achat.delete({ where: { id } });
    await logActivity(req.user!.userId, "DELETE", "ACHAT", id, `Suppression de l'achat ${achat?.numero}`);
    res.json({ message: "Achat supprimé" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
