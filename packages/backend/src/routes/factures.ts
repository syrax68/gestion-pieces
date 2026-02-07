import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { logActivity } from "../lib/activityLog.js";
import { serializeFacture } from "../utils/decimal.js";
import { generateNumero } from "../utils/generateNumero.js";
import { handleRouteError } from "../utils/handleError.js";
import { adjustStock } from "../services/stockService.js";

const router = Router();

const factureItemSchema = z.object({
  pieceId: z.string().optional(),
  designation: z.string().min(1, "Désignation requise"),
  description: z.string().optional(),
  quantite: z.number().int().positive(),
  prixUnitaire: z.number().positive(),
  remise: z.number().min(0).max(100).default(0),
  tva: z.number().min(0).max(100).default(0),
});

const factureSchema = z.object({
  clientId: z.string().optional(),
  items: z.array(factureItemSchema).min(1, "Au moins un article requis"),
  remise: z.number().min(0).default(0),
  methodePaiement: z.string().optional(),
  notes: z.string().optional(),
});

const factureIncludes = {
  client: true,
  items: { include: { piece: true } },
} as const;

// Get all factures
router.get("/", authenticate, async (req, res) => {
  try {
    const { statut, clientId } = req.query;
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;
    if (clientId) where.clientId = clientId;

    const factures = await prisma.facture.findMany({
      where,
      include: factureIncludes,
      orderBy: { dateFacture: "desc" },
    });

    res.json(factures.map(serializeFacture));
  } catch (error) {
    handleRouteError(res, error, "la récupération des factures");
  }
});

// Get facture by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const facture = await prisma.facture.findUnique({
      where: { id: req.params.id },
      include: {
        ...factureIncludes,
        createur: { select: { id: true, nom: true, prenom: true } },
      },
    });

    if (!facture) {
      return res.status(404).json({ error: "Facture non trouvée" });
    }

    res.json(serializeFacture(facture));
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Create facture (with automatic stock update)
router.post("/", authenticate, isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = factureSchema.parse(req.body);
    const numero = await generateNumero("facture", "F");

    const itemsWithTotals = data.items.map((item) => {
      const itemTotal = item.quantite * item.prixUnitaire * (1 - item.remise / 100);
      return { ...item, total: itemTotal };
    });

    const sousTotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
    const sousTotalApresRemise = sousTotal - data.remise;
    const tvaTotal = itemsWithTotals.reduce((sum, item) => {
      const itemHT = item.total * (sousTotal > 0 ? sousTotalApresRemise / sousTotal : 1);
      return sum + itemHT * (item.tva / 100);
    }, 0);
    const total = sousTotalApresRemise + tvaTotal;

    // Verify stock availability for pieces
    for (const item of data.items) {
      if (item.pieceId) {
        const piece = await prisma.piece.findUnique({ where: { id: item.pieceId } });
        if (!piece) {
          return res.status(400).json({ error: `Pièce ${item.pieceId} non trouvée` });
        }
        if (piece.stock < item.quantite) {
          return res.status(400).json({
            error: `Stock insuffisant pour ${piece.nom} (disponible: ${piece.stock}, demandé: ${item.quantite})`,
          });
        }
      }
    }

    const facture = await prisma.$transaction(async (tx) => {
      const newFacture = await tx.facture.create({
        data: {
          numero,
          clientId: data.clientId,
          createurId: req.user!.userId,
          sousTotal,
          remise: data.remise,
          remisePourcent: sousTotal > 0 ? (data.remise / sousTotal) * 100 : 0,
          tva: tvaTotal,
          total,
          statut: "EN_ATTENTE",
          methodePaiement: data.methodePaiement,
          notes: data.notes,
          items: {
            create: itemsWithTotals.map((item) => ({
              pieceId: item.pieceId || null,
              designation: item.designation,
              description: item.description,
              quantite: item.quantite,
              prixUnitaire: item.prixUnitaire,
              remise: item.remise,
              tva: item.tva,
              total: item.total,
            })),
          },
        },
        include: factureIncludes,
      });

      // Update stock for each item with pieceId
      for (const item of data.items) {
        if (item.pieceId) {
          await adjustStock({
            tx,
            pieceId: item.pieceId,
            type: "SORTIE",
            quantite: item.quantite,
            motif: `Vente facture ${numero}`,
            reference: numero,
            userId: req.user!.userId,
          });
        }
      }

      return newFacture;
    });

    await logActivity(
      req.user!.userId,
      "CREATE",
      "FACTURE",
      facture.id,
      `Création de la facture ${facture.numero} — ${Number(facture.total).toLocaleString("fr-FR")} Fmg`,
    );

    res.status(201).json(serializeFacture(facture));
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update facture status
router.patch("/:id/statut", authenticate, isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { statut, montantPaye, methodePaiement } = req.body;

    if (!["BROUILLON", "EN_ATTENTE", "PAYEE", "PARTIELLEMENT_PAYEE", "ANNULEE"].includes(statut)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const updateData: Record<string, unknown> = { statut };
    if (montantPaye !== undefined) updateData.montantPaye = montantPaye;
    if (methodePaiement) updateData.methodePaiement = methodePaiement;
    if (statut === "PAYEE") updateData.datePaiement = new Date();

    const facture = await prisma.facture.update({
      where: { id },
      data: updateData,
      include: factureIncludes,
    });

    await logActivity(req.user!.userId, "STATUS_CHANGE", "FACTURE", facture.id, `Facture ${facture.numero} → ${statut}`);

    res.json(serializeFacture(facture));
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete facture (admin only)
router.delete("/:id", authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const facture = await prisma.facture.findUnique({ where: { id } });
    await prisma.facture.delete({ where: { id } });
    await logActivity(req.user!.userId, "DELETE", "FACTURE", id, `Suppression de la facture ${facture?.numero}`);
    res.json({ message: "Facture supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
