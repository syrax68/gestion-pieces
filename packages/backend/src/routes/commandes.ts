import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { logActivity } from "../lib/activityLog.js";
import { serializeCommande } from "../utils/decimal.js";
import { generateNumero } from "../utils/generateNumero.js";
import { handleRouteError } from "../utils/handleError.js";

const router = Router();

const commandeItemSchema = z.object({
  pieceId: z.string(),
  quantite: z.number().int().positive(),
  prixUnitaire: z.number().positive(),
  remise: z.number().min(0).max(100).default(0),
});

const commandeSchema = z.object({
  fournisseurId: z.string(),
  dateLivraison: z.string().datetime().optional(),
  fraisPort: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(commandeItemSchema).min(1, "Au moins un article requis"),
});

const commandeIncludes = {
  fournisseur: true,
  items: { include: { piece: true } },
} as const;

// Get all commandes
router.get("/", authenticate, async (req, res) => {
  try {
    const { statut, fournisseurId } = req.query;
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;
    if (fournisseurId) where.fournisseurId = fournisseurId;

    const commandes = await prisma.commande.findMany({
      where,
      include: commandeIncludes,
      orderBy: { dateCommande: "desc" },
    });

    res.json(commandes.map(serializeCommande));
  } catch (error) {
    handleRouteError(res, error, "la récupération des commandes");
  }
});

// Get commande by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const commande = await prisma.commande.findUnique({
      where: { id: req.params.id },
      include: commandeIncludes,
    });

    if (!commande) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    res.json(serializeCommande(commande));
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Create commande
router.post("/", authenticate, isVendeurOrAdmin, async (req: AuthRequest, res) => {
  try {
    const data = commandeSchema.parse(req.body);
    const numero = await generateNumero("commande", "CMD");

    const itemsWithTotals = data.items.map((item) => {
      const total = item.quantite * item.prixUnitaire * (1 - item.remise / 100);
      return { ...item, total };
    });

    const sousTotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
    const total = sousTotal + data.fraisPort;

    const commande = await prisma.commande.create({
      data: {
        numero,
        fournisseurId: data.fournisseurId,
        dateLivraison: data.dateLivraison ? new Date(data.dateLivraison) : undefined,
        sousTotal,
        remise: 0,
        fraisPort: data.fraisPort,
        total,
        notes: data.notes,
        items: {
          create: itemsWithTotals.map((item) => ({
            pieceId: item.pieceId,
            quantite: item.quantite,
            prixUnitaire: item.prixUnitaire,
            remise: item.remise,
            total: item.total,
          })),
        },
      },
      include: commandeIncludes,
    });

    await logActivity(
      req.user!.userId,
      "CREATE",
      "COMMANDE",
      commande.id,
      `Création de la commande ${commande.numero} — ${Number(commande.total).toLocaleString("fr-FR")} Fmg`,
    );

    res.status(201).json(serializeCommande(commande));
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update commande status
router.patch("/:id/statut", authenticate, isVendeurOrAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!["BROUILLON", "EN_ATTENTE", "CONFIRMEE", "EXPEDIEE", "LIVREE", "ANNULEE"].includes(statut)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const updateData: Record<string, unknown> = { statut };
    if (statut === "LIVREE") {
      updateData.dateReception = new Date();
    }

    const commande = await prisma.commande.update({
      where: { id },
      data: updateData,
      include: commandeIncludes,
    });

    await logActivity(req.user!.userId, "STATUS_CHANGE", "COMMANDE", commande.id, `Commande ${commande.numero} → ${statut}`);

    res.json(serializeCommande(commande));
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete commande (admin only)
router.delete("/:id", authenticate, isAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const commande = await prisma.commande.findUnique({ where: { id } });
    await prisma.commande.delete({ where: { id } });
    await logActivity(req.user!.userId, "DELETE", "COMMANDE", id, `Suppression de la commande ${commande?.numero}`);
    res.json({ message: "Commande supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
