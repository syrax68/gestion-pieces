import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { logActivity } from "../lib/activityLog.js";
import { serializeFacture } from "../utils/decimal.js";
import { generateNumero } from "../utils/generateNumero.js";
import { handleRouteError } from "../utils/handleError.js";
import { adjustStock } from "../services/stockService.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";

const router = Router();
router.use(authenticate, injectBoutique);

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
router.get("/", async (req, res) => {
  try {
    const { statut, clientId } = req.query;
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;
    if (clientId) where.clientId = clientId;
    where.boutiqueId = (req as AuthRequest).boutiqueId;

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
router.get("/:id", async (req, res) => {
  try {
    const facture = await prisma.facture.findUnique({
      where: { id: req.params.id },
      include: {
        ...factureIncludes,
        createur: { select: { id: true, nom: true, prenom: true } },
      },
    });

    if (!(await ensureBoutique(facture, req as AuthRequest, res, "Facture"))) return;

    res.json(serializeFacture(facture!));
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Helper: compute item totals
function computeFactureTotals(items: z.infer<typeof factureItemSchema>[], remise: number) {
  const itemsWithTotals = items.map((item) => {
    const itemTotal = item.quantite * item.prixUnitaire * (1 - item.remise / 100);
    return { ...item, total: itemTotal };
  });

  const sousTotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
  const sousTotalApresRemise = sousTotal - remise;
  const tvaTotal = itemsWithTotals.reduce((sum, item) => {
    const itemHT = item.total * (sousTotal > 0 ? sousTotalApresRemise / sousTotal : 1);
    return sum + itemHT * (item.tva / 100);
  }, 0);
  const total = sousTotalApresRemise + tvaTotal;

  return { itemsWithTotals, sousTotal, tvaTotal, total };
}

// Create facture (as BROUILLON — no stock adjustment yet)
router.post("/", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = factureSchema.parse(req.body);
    const numero = await generateNumero("facture", "F");

    const { itemsWithTotals, sousTotal, tvaTotal, total } = computeFactureTotals(data.items, data.remise);

    const facture = await prisma.facture.create({
      data: {
        numero,
        clientId: data.clientId,
        createurId: req.user!.userId,
        boutiqueId: req.boutiqueId!,
        sousTotal,
        remise: data.remise,
        remisePourcent: sousTotal > 0 ? (data.remise / sousTotal) * 100 : 0,
        tva: tvaTotal,
        total,
        statut: "BROUILLON",
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

    await logActivity(
      req.user!.userId,
      "CREATE",
      "FACTURE",
      facture.id,
      `Création brouillon facture ${facture.numero} — ${Number(facture.total).toLocaleString("fr-FR")} Fmg`,
    );

    res.status(201).json(serializeFacture(facture));
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update facture (only BROUILLON can be edited)
router.put("/:id", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.facture.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req, res, "Facture"))) return;
    if (existing!.statut !== "BROUILLON") {
      return res.status(400).json({ error: "Seules les factures en brouillon peuvent être modifiées" });
    }

    const data = factureSchema.parse(req.body);
    const { itemsWithTotals, sousTotal, tvaTotal, total } = computeFactureTotals(data.items, data.remise);

    const facture = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.factureItem.deleteMany({ where: { factureId: id } });

      // Update facture with new data
      const updated = await tx.facture.update({
        where: { id },
        data: {
          clientId: data.clientId || null,
          sousTotal,
          remise: data.remise,
          remisePourcent: sousTotal > 0 ? (data.remise / sousTotal) * 100 : 0,
          tva: tvaTotal,
          total,
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

      return updated;
    });

    await logActivity(req.user!.userId, "UPDATE", "FACTURE", facture.id, `Modification brouillon facture ${facture.numero}`);

    res.json(serializeFacture(facture));
  } catch (error) {
    handleRouteError(res, error, "la modification");
  }
});

// Update facture status (with stock adjustment on validation from BROUILLON)
router.patch("/:id/statut", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { statut, montantPaye, methodePaiement } = req.body;

    if (!["BROUILLON", "EN_ATTENTE", "PAYEE", "PARTIELLEMENT_PAYEE", "ANNULEE"].includes(statut)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const existing = await prisma.facture.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!(await ensureBoutique(existing, req, res, "Facture"))) return;

    // When validating from BROUILLON → non-BROUILLON/non-ANNULEE, adjust stock (SORTIE)
    const isValidation = existing!.statut === "BROUILLON" && statut !== "BROUILLON" && statut !== "ANNULEE";

    // When annulating a validated facture → return stock (RETOUR)
    const isAnnulation = statut === "ANNULEE" && existing!.statut !== "BROUILLON" && existing!.statut !== "ANNULEE";

    if (isValidation) {
      // Verify stock availability
      for (const item of existing!.items) {
        if (item.pieceId) {
          const piece = await prisma.piece.findUnique({ where: { id: item.pieceId } });
          if (!piece) {
            return res.status(400).json({ error: `Pièce non trouvée` });
          }
          if (piece.stock < item.quantite) {
            return res.status(400).json({
              error: `Stock insuffisant pour ${piece.nom} (disponible: ${piece.stock}, demandé: ${item.quantite})`,
            });
          }
        }
      }
    }

    const updateData: Record<string, unknown> = { statut };
    if (montantPaye !== undefined) updateData.montantPaye = montantPaye;
    if (methodePaiement) updateData.methodePaiement = methodePaiement;
    if (statut === "PAYEE") updateData.datePaiement = new Date();

    const facture = await prisma.$transaction(async (tx) => {
      const updated = await tx.facture.update({
        where: { id },
        data: updateData,
        include: factureIncludes,
      });

      // Adjust stock on validation (SORTIE)
      if (isValidation) {
        for (const item of existing!.items) {
          if (item.pieceId) {
            await adjustStock({
              tx,
              pieceId: item.pieceId,
              type: "SORTIE",
              quantite: item.quantite,
              motif: `Vente facture ${existing!.numero}`,
              reference: existing!.numero,
              userId: req.user!.userId,
            });
          }
        }
      }

      // Return stock on annulation (RETOUR)
      if (isAnnulation) {
        for (const item of existing!.items) {
          if (item.pieceId) {
            await adjustStock({
              tx,
              pieceId: item.pieceId,
              type: "RETOUR",
              quantite: item.quantite,
              motif: `Annulation facture ${existing!.numero}`,
              reference: existing!.numero,
              userId: req.user!.userId,
            });
          }
        }
      }

      return updated;
    });

    await logActivity(req.user!.userId, "STATUS_CHANGE", "FACTURE", facture.id, `Facture ${facture.numero} → ${statut}`);

    res.json(serializeFacture(facture));
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete facture (admin only)
router.delete("/:id", isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const facture = await prisma.facture.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!(await ensureBoutique(facture, req, res, "Facture"))) return;

    // If facture was validated (not BROUILLON/ANNULEE), return stock before deleting
    const wasValidated = facture!.statut !== "BROUILLON" && facture!.statut !== "ANNULEE";

    await prisma.$transaction(async (tx) => {
      if (wasValidated) {
        for (const item of facture!.items) {
          if (item.pieceId) {
            await adjustStock({
              tx,
              pieceId: item.pieceId,
              type: "RETOUR",
              quantite: item.quantite,
              motif: `Suppression facture ${facture!.numero}`,
              reference: facture!.numero,
              userId: req.user!.userId,
            });
          }
        }
      }

      await tx.facture.delete({ where: { id } });
    });

    await logActivity(req.user!.userId, "DELETE", "FACTURE", id, `Suppression de la facture ${facture!.numero}`);
    res.json({ message: "Facture supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
