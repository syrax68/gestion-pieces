import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { logActivity } from "../lib/activityLog.js";
import { serializePiece, serializeHistoriquePrix } from "../utils/decimal.js";
import { handleRouteError } from "../utils/handleError.js";
import { adjustStock } from "../services/stockService.js";

const router = Router();

const pieceSchema = z.object({
  reference: z.string().min(1, "Référence requise"),
  codeBarres: z.string().optional().nullable(),
  nom: z.string().min(1, "Nom requis"),
  description: z.string().optional().nullable(),
  prixVente: z.number().positive("Le prix de vente doit être positif"),
  prixAchat: z.number().positive().optional().nullable(),
  tauxTVA: z.number().min(0).max(100).default(20),
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
} as const;

// Get all pieces
router.get("/", authenticate, async (req, res) => {
  try {
    const { search, categorie, marque, stockBas, actif } = req.query;
    const where: Record<string, unknown> = {};

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
router.get("/:id", authenticate, async (req, res) => {
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
          take: 5,
        },
      },
    });

    if (!piece) {
      return res.status(404).json({ error: "Pièce non trouvée" });
    }

    res.json({
      ...serializePiece(piece),
      historiquePrix: piece.historiquePrix.map(serializeHistoriquePrix),
      fournisseurs: piece.fournisseurs.map((f) => ({
        ...f,
        prixAchat: Number(f.prixAchat),
      })),
    });
  } catch (error) {
    handleRouteError(res, error, "la récupération de la pièce");
  }
});

// Create piece
router.post("/", authenticate, isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
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
      data,
      include: pieceIncludes,
    });

    await logActivity(req.user!.userId, "CREATE", "PIECE", piece.id, `Création de la pièce "${piece.nom}" (${piece.reference})`);

    res.status(201).json(serializePiece(piece));
  } catch (error) {
    handleRouteError(res, error, "la création de la pièce");
  }
});

// Update piece
router.put("/:id", authenticate, isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = pieceSchema.partial().parse(req.body);

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
router.delete("/:id", authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const piece = await prisma.piece.findUnique({ where: { id } });
    await prisma.piece.delete({ where: { id } });
    await logActivity(req.user!.userId, "DELETE", "PIECE", id, `Suppression de la pièce "${piece?.nom}"`);
    res.json({ message: "Pièce supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression de la pièce");
  }
});

// Adjust stock
router.post("/:id/stock", authenticate, isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, quantite, motif, reference } = req.body;

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
router.post("/:id/modeles", authenticate, isVendeurOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { modeleId, notes } = req.body;

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

// Remove compatible model from piece
router.delete("/:id/modeles/:modeleId", authenticate, isVendeurOrAdmin, async (req, res) => {
  try {
    const { id, modeleId } = req.params;
    await prisma.pieceModeleVehicule.delete({
      where: { pieceId_modeleId: { pieceId: id, modeleId } },
    });
    res.json({ message: "Compatibilité supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression de la compatibilité");
  }
});

export default router;
