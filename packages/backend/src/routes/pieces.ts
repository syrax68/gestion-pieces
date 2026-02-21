import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { logActivity } from "../lib/activityLog.js";
import { serializePiece, serializeHistoriquePrix } from "../utils/decimal.js";
import { handleRouteError } from "../utils/handleError.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";
import { adjustStock } from "../services/stockService.js";

const router = Router();
router.use(authenticate, injectBoutique);

const pieceSchema = z.object({
  reference: z.string().min(1, "Référence requise"),
  codeBarres: z.string().optional().nullable(),
  nom: z.string().min(1, "Nom requis"),
  description: z.string().optional().nullable(),
  prixVente: z.number().positive("Le prix de vente doit être positif"),
  prixAchat: z.number().positive().optional().nullable(),
  tauxTVA: z.number().min(0).max(100).default(0),
  stock: z.number().int().min(0).default(0),
  stockMin: z.number().int().min(0).default(0),
  stockMax: z.number().int().min(0).optional().nullable(),
  poids: z.number().positive().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  actif: z.boolean().default(true),
  enPromotion: z.boolean().default(false),
  prixPromo: z.number().positive().optional().nullable(),
  marqueId: z.string().optional().nullable(),
  categorieId: z.string().optional().nullable(),
  sousCategorieId: z.string().optional().nullable(),
  fournisseurId: z.string().optional().nullable(),
  emplacementId: z.string().optional().nullable(),
});

const pieceIncludes = {
  marque: true,
  categorie: true,
  sousCategorie: true,
  fournisseur: true,
  emplacement: true,
  images: { where: { principale: true }, take: 1, select: { url: true } },
} as const;

// Get all pieces
router.get("/", async (req, res) => {
  try {
    const { search, categorie, marque, stockBas, actif } = req.query;
    const where: Record<string, unknown> = {};
    where.boutiqueId = (req as AuthRequest).boutiqueId;

    if (search) {
      where.OR = [
        { nom: { contains: search as string, mode: "insensitive" } },
        { reference: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { codeBarres: { contains: search as string, mode: "insensitive" } },
      ];
    }
    if (categorie) where.categorieId = categorie;
    if (marque) where.marqueId = marque;
    if (stockBas === "true") where.stock = { lte: prisma.piece.fields.stockMin };
    if (actif !== undefined) where.actif = actif === "true";

    const pieces = await prisma.piece.findMany({
      where,
      include: pieceIncludes,
      orderBy: { updatedAt: "desc" },
    });

    res.json(pieces.map(serializePiece));
  } catch (error) {
    handleRouteError(res, error, "la récupération des pièces");
  }
});

// Get piece by ID
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const piece = await prisma.piece.findUnique({
      where: { id: req.params.id },
      include: {
        ...pieceIncludes,
        images: { orderBy: { ordre: "asc" } },
        modelesCompatibles: {
          include: { modele: { include: { marque: true } } },
        },
        fournisseurs: { include: { fournisseur: true } },
        mouvements: {
          orderBy: { date: "desc" },
          take: 10,
          include: { user: { select: { nom: true, prenom: true } } },
        },
        historiquePrix: {
          orderBy: { dateChangement: "desc" },
          take: 50,
        },
      },
    });

    if (!(await ensureBoutique(piece, req, res, "Pièce"))) return;

    res.json({
      ...serializePiece(piece!),
      historiquePrix: piece!.historiquePrix.map(serializeHistoriquePrix),
      fournisseurs: piece!.fournisseurs.map((f) => ({
        ...f,
        prixAchat: Number(f.prixAchat),
      })),
    });
  } catch (error) {
    handleRouteError(res, error, "la récupération de la pièce");
  }
});

// Create piece
router.post("/", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = pieceSchema.parse(req.body);

    const existing = await prisma.piece.findUnique({ where: { reference: data.reference } });
    if (existing) {
      return res.status(400).json({ error: "Cette référence existe déjà" });
    }

    if (data.codeBarres) {
      const existingBarcode = await prisma.piece.findUnique({ where: { codeBarres: data.codeBarres } });
      if (existingBarcode) {
        return res.status(400).json({ error: "Ce code-barres existe déjà" });
      }
    }

    const piece = await prisma.piece.create({
      data: { ...data, boutiqueId: req.boutiqueId! },
      include: pieceIncludes,
    });

    // Enregistrer le prix initial dans l'historique
    await prisma.historiquePrix.create({
      data: {
        pieceId: piece.id,
        prixVente: data.prixVente,
        prixAchat: data.prixAchat ?? null,
        motif: "Prix initial",
      },
    });

    await logActivity(req.user!.userId, "CREATE", "PIECE", piece.id, `Création de la pièce "${piece.nom}" (${piece.reference})`);

    res.status(201).json(serializePiece(piece));
  } catch (error) {
    handleRouteError(res, error, "la création de la pièce");
  }
});

// Update piece
router.put("/:id", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = pieceSchema.partial().parse(req.body);

    // Verify ownership
    const existing = await prisma.piece.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req, res, "Pièce"))) return;

    if (data.reference) {
      const existing = await prisma.piece.findFirst({ where: { reference: data.reference, NOT: { id } } });
      if (existing) return res.status(400).json({ error: "Cette référence existe déjà" });
    }

    if (data.codeBarres) {
      const existingBarcode = await prisma.piece.findFirst({ where: { codeBarres: data.codeBarres, NOT: { id } } });
      if (existingBarcode) return res.status(400).json({ error: "Ce code-barres existe déjà" });
    }

    const oldPiece = await prisma.piece.findUnique({ where: { id } });

    const piece = await prisma.piece.update({
      where: { id },
      data,
      include: pieceIncludes,
    });

    // Record price change if price changed
    if (oldPiece && data.prixVente && Number(oldPiece.prixVente) !== data.prixVente) {
      await prisma.historiquePrix.create({
        data: {
          pieceId: id,
          prixVente: data.prixVente,
          prixAchat: data.prixAchat || (oldPiece.prixAchat ? Number(oldPiece.prixAchat) : null),
          motif: "Mise à jour manuelle",
        },
      });
    }

    await logActivity(req.user!.userId, "UPDATE", "PIECE", piece.id, `Modification de la pièce "${piece.nom}"`);

    res.json(serializePiece(piece));
  } catch (error) {
    handleRouteError(res, error, "la mise à jour de la pièce");
  }
});

// Delete piece (admin only)
router.delete("/:id", isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const piece = await prisma.piece.findUnique({ where: { id } });
    if (!(await ensureBoutique(piece, req, res, "Pièce"))) return;
    await prisma.piece.delete({ where: { id } });
    await logActivity(req.user!.userId, "DELETE", "PIECE", id, `Suppression de la pièce "${piece?.nom}"`);
    res.json({ message: "Pièce supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression de la pièce");
  }
});

// Adjust stock
router.post("/:id/stock", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, quantite, motif, reference } = req.body;

    // Verify ownership
    const piece = await prisma.piece.findUnique({ where: { id } });
    if (!(await ensureBoutique(piece, req, res, "Pièce"))) return;

    if (!["ENTREE", "SORTIE", "AJUSTEMENT", "INVENTAIRE", "RETOUR", "TRANSFERT"].includes(type)) {
      return res.status(400).json({ error: "Type de mouvement invalide" });
    }

    const { oldStock, newStock } = await (async () => {
      // For AJUSTEMENT/INVENTAIRE, use prisma.$transaction with adjustStock
      return prisma.$transaction(async (tx) => {
        return adjustStock({
          tx,
          pieceId: id,
          type,
          quantite,
          motif: motif || `${type} manuel`,
          reference: reference || null,
          userId: req.user!.userId,
        });
      });
    })();

    const updatedPiece = await prisma.piece.findUnique({
      where: { id },
      include: pieceIncludes,
    });

    await logActivity(
      req.user!.userId,
      "STOCK_ADJUST",
      "PIECE",
      id,
      `${type} de ${quantite} unités sur "${updatedPiece!.nom}" (${oldStock} → ${newStock})`,
    );

    res.json(serializePiece(updatedPiece!));
  } catch (error) {
    handleRouteError(res, error, "l'ajustement du stock");
  }
});

// Add compatible model to piece
router.post("/:id/modeles", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { modeleId, notes } = req.body;

    // Verify ownership
    const piece = await prisma.piece.findUnique({ where: { id } });
    if (!(await ensureBoutique(piece, req, res, "Pièce"))) return;

    if (!modeleId) {
      return res.status(400).json({ error: "modeleId requis" });
    }

    const compatibility = await prisma.pieceModeleVehicule.create({
      data: { pieceId: id, modeleId, notes },
      include: { modele: { include: { marque: true } } },
    });

    res.status(201).json(compatibility);
  } catch (error) {
    handleRouteError(res, error, "l'ajout de la compatibilité");
  }
});

// Replace piece (transfer all references from old piece to new piece)
router.post("/:id/remplacer", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id: oldPieceId } = req.params;
    const { newPieceId } = req.body;

    if (!newPieceId) {
      return res.status(400).json({ error: "newPieceId requis" });
    }
    if (oldPieceId === newPieceId) {
      return res.status(400).json({ error: "La pièce de remplacement doit être différente" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldPiece = await tx.piece.findUnique({ where: { id: oldPieceId }, include: { fournisseur: true } });
      if (!oldPiece || oldPiece.boutiqueId !== req.boutiqueId) throw new Error("Ancienne pièce non trouvée");

      const newPiece = await tx.piece.findUnique({ where: { id: newPieceId }, include: { fournisseur: true } });
      if (!newPiece || newPiece.boutiqueId !== req.boutiqueId) throw new Error("Nouvelle pièce non trouvée");

      // 1. Get facture items that will be transferred (to update prices and recalculate)
      const factureItems = await tx.factureItem.findMany({ where: { pieceId: oldPieceId } });

      // 2. Transfer all references from old to new
      const [fiCount, aiCount, diCount, aviCount, mvtCount, invCount] = await Promise.all([
        tx.factureItem.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
        tx.achatItem.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
        tx.devisItem.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
        tx.avoirItem.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
        tx.mouvementStock.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
        tx.inventaireItem.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
      ]);

      // 3. Update prices in transferred facture items and collect affected factures
      const affectedFactureIds = new Set<string>();
      let totalQteVendue = 0;

      for (const item of factureItems) {
        const newTotal = Number(newPiece.prixVente) * item.quantite;
        await tx.factureItem.update({
          where: { id: item.id },
          data: {
            prixUnitaire: Number(newPiece.prixVente),
            total: newTotal,
            designation: newPiece.nom,
          },
        });
        affectedFactureIds.add(item.factureId);
        totalQteVendue += item.quantite;
      }

      // 4. Recalculate totals for each affected facture
      for (const factureId of affectedFactureIds) {
        const items = await tx.factureItem.findMany({ where: { factureId } });
        const sousTotal = items.reduce((sum, item) => sum + Number(item.total), 0);
        const facture = await tx.facture.findUnique({ where: { id: factureId } });
        const tvaPourcent = facture ? Number(facture.tva) / (Number(facture.sousTotal) || 1) : 0;
        const tva = Math.round(sousTotal * tvaPourcent);
        const total = sousTotal + tva;
        await tx.facture.update({
          where: { id: factureId },
          data: { sousTotal, tva, total },
        });
      }

      // 5. Decrement new piece stock for sold quantities
      if (totalQteVendue > 0) {
        await tx.piece.update({
          where: { id: newPieceId },
          data: { stock: { decrement: totalQteVendue } },
        });
      }

      // 6. Delete old piece (cascade will handle images, historiquePrix, pieceFournisseur, pieceModeleVehicule)
      await tx.piece.delete({ where: { id: oldPieceId } });

      return {
        oldPiece: { reference: oldPiece.reference, nom: oldPiece.nom, fournisseur: oldPiece.fournisseur?.nom },
        newPiece: { reference: newPiece.reference, nom: newPiece.nom, fournisseur: newPiece.fournisseur?.nom },
        stats: {
          factureItems: fiCount.count,
          achatItems: aiCount.count,
          devisItems: diCount.count,
          avoirItems: aviCount.count,
          mouvements: mvtCount.count,
          inventaireItems: invCount.count,
          facturesRecalculees: affectedFactureIds.size,
          stockDecremente: totalQteVendue,
        },
      };
    });

    await logActivity(
      req.user!.userId,
      "UPDATE",
      "PIECE",
      newPieceId,
      `Remplacement de "${result.oldPiece.nom}" (${result.oldPiece.reference}) par "${result.newPiece.nom}" (${result.newPiece.reference})`,
    );

    res.json({
      message: `Pièce "${result.oldPiece.nom}" remplacée par "${result.newPiece.nom}"`,
      ...result,
    });
  } catch (error) {
    handleRouteError(res, error, "le remplacement de la pièce");
  }
});

// Remove compatible model from piece
router.delete("/:id/modeles/:modeleId", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id, modeleId } = req.params;

    // Verify ownership
    const piece = await prisma.piece.findUnique({ where: { id } });
    if (!(await ensureBoutique(piece, req, res, "Pièce"))) return;

    await prisma.pieceModeleVehicule.delete({
      where: { pieceId_modeleId: { pieceId: id, modeleId } },
    });
    res.json({ message: "Compatibilité supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression de la compatibilité");
  }
});

export default router;
