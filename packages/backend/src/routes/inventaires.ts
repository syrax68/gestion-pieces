import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { logActivity } from "../lib/activityLog.js";
import { generateNumero } from "../utils/generateNumero.js";
import { handleRouteError } from "../utils/handleError.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";
import { adjustStock } from "../services/stockService.js";

const router = Router();
router.use(authenticate, injectBoutique);

const inventaireIncludes = {
  user: { select: { id: true, nom: true, prenom: true } },
  items: {
    include: {
      piece: { select: { id: true, reference: true, nom: true, stock: true } },
    },
    orderBy: { piece: { nom: "asc" as const } },
  },
} as const;

// Get all inventaires
router.get("/", async (req, res) => {
  try {
    const { statut } = req.query;
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;
    where.boutiqueId = (req as AuthRequest).boutiqueId;

    const inventaires = await prisma.inventaire.findMany({
      where,
      include: {
        user: { select: { id: true, nom: true, prenom: true } },
        _count: { select: { items: true } },
      },
      orderBy: { dateDebut: "desc" },
    });

    res.json(inventaires);
  } catch (error) {
    handleRouteError(res, error, "la récupération des inventaires");
  }
});

// Get inventaire by ID with items
router.get("/:id", async (req, res) => {
  try {
    const inventaire = await prisma.inventaire.findUnique({
      where: { id: req.params.id },
      include: inventaireIncludes,
    });

    if (!(await ensureBoutique(inventaire, req as AuthRequest, res, "Inventaire"))) return;

    res.json(inventaire);
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

const createSchema = z.object({
  notes: z.string().optional(),
  pieceIds: z.array(z.string()).optional(),
});

// Create inventaire
router.post("/", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const numero = await generateNumero("inventaire", "INV");

    // If pieceIds provided, use them; otherwise take ALL active pieces from boutique
    let pieces: { id: string; stock: number }[];
    if (data.pieceIds && data.pieceIds.length > 0) {
      pieces = await prisma.piece.findMany({
        where: { id: { in: data.pieceIds }, boutiqueId: req.boutiqueId!, actif: true },
        select: { id: true, stock: true },
      });
    } else {
      pieces = await prisma.piece.findMany({
        where: { boutiqueId: req.boutiqueId!, actif: true },
        select: { id: true, stock: true },
      });
    }

    if (pieces.length === 0) {
      return res.status(400).json({ error: "Aucune pièce à inventorier" });
    }

    const inventaire = await prisma.inventaire.create({
      data: {
        numero,
        boutiqueId: req.boutiqueId!,
        userId: req.user!.userId,
        notes: data.notes,
        items: {
          create: pieces.map((p) => ({
            pieceId: p.id,
            stockTheorique: p.stock,
          })),
        },
      },
      include: inventaireIncludes,
    });

    await logActivity(
      req.user!.userId,
      "CREATE",
      "INVENTAIRE",
      inventaire.id,
      `Création inventaire ${inventaire.numero} — ${pieces.length} pièces`,
    );

    res.status(201).json(inventaire);
  } catch (error) {
    handleRouteError(res, error, "la création de l'inventaire");
  }
});

const updateItemSchema = z.object({
  stockPhysique: z.number().int().min(0),
  notes: z.string().optional(),
});

// Update an inventaire item (set physical count)
router.put("/:id/items/:itemId", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id, itemId } = req.params;

    // Verify inventaire belongs to boutique and is EN_COURS
    const inventaire = await prisma.inventaire.findUnique({ where: { id } });
    if (!(await ensureBoutique(inventaire, req, res, "Inventaire"))) return;

    if (inventaire!.statut !== "EN_COURS") {
      return res.status(400).json({ error: "L'inventaire n'est plus en cours" });
    }

    const data = updateItemSchema.parse(req.body);

    const item = await prisma.inventaireItem.findUnique({ where: { id: itemId } });
    if (!item || item.inventaireId !== id) {
      return res.status(404).json({ error: "Article d'inventaire non trouvé" });
    }

    const ecart = data.stockPhysique - item.stockTheorique;

    const updated = await prisma.inventaireItem.update({
      where: { id: itemId },
      data: {
        stockPhysique: data.stockPhysique,
        ecart,
        notes: data.notes,
        valide: true,
      },
      include: {
        piece: { select: { id: true, reference: true, nom: true, stock: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour de l'article");
  }
});

// Update inventaire status (EN_COURS → VALIDE or EN_COURS → ANNULE)
router.patch("/:id/statut", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!["VALIDE", "ANNULE"].includes(statut)) {
      return res.status(400).json({ error: "Statut invalide. Valeurs acceptées: VALIDE, ANNULE" });
    }

    const existing = await prisma.inventaire.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!(await ensureBoutique(existing, req, res, "Inventaire"))) return;

    if (existing!.statut !== "EN_COURS") {
      return res.status(400).json({ error: "Seuls les inventaires en cours peuvent être modifiés" });
    }

    const isValidation = statut === "VALIDE";

    const inventaire = await prisma.$transaction(async (tx) => {
      if (isValidation) {
        // Only adjust stock for items that have been counted (valide === true)
        const validatedItems = existing!.items.filter((item) => item.valide && item.stockPhysique !== null);

        if (validatedItems.length === 0) {
          throw new Error("Aucun article n'a été compté. Comptez au moins un article avant de valider.");
        }

        let ecartTotal = 0;
        for (const item of validatedItems) {
          ecartTotal += item.ecart || 0;

          // adjustStock with INVENTAIRE type sets stock to the absolute value
          await adjustStock({
            tx,
            pieceId: item.pieceId,
            type: "INVENTAIRE",
            quantite: item.stockPhysique!,
            motif: `Inventaire ${existing!.numero}`,
            reference: existing!.numero,
            userId: req.user!.userId,
          });
        }

        return await tx.inventaire.update({
          where: { id },
          data: {
            statut: "VALIDE",
            dateFin: new Date(),
            ecartTotal,
          },
          include: inventaireIncludes,
        });
      } else {
        // ANNULE
        return await tx.inventaire.update({
          where: { id },
          data: {
            statut: "ANNULE",
            dateFin: new Date(),
          },
          include: inventaireIncludes,
        });
      }
    });

    const action = isValidation ? "validé" : "annulé";
    await logActivity(
      req.user!.userId,
      "STATUS_CHANGE",
      "INVENTAIRE",
      inventaire.id,
      `Inventaire ${inventaire.numero} ${action}`,
    );

    res.json(inventaire);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour du statut");
  }
});

// Delete inventaire (admin only, EN_COURS only)
router.delete("/:id", isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const inventaire = await prisma.inventaire.findUnique({ where: { id } });
    if (!(await ensureBoutique(inventaire, req, res, "Inventaire"))) return;

    if (inventaire!.statut !== "EN_COURS") {
      return res.status(400).json({ error: "Seuls les inventaires en cours peuvent être supprimés" });
    }

    await prisma.inventaire.delete({ where: { id } });

    await logActivity(
      req.user!.userId,
      "DELETE",
      "INVENTAIRE",
      id,
      `Suppression de l'inventaire ${inventaire!.numero}`,
    );
    res.json({ message: "Inventaire supprimé" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
