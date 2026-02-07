import { Router } from "express";
import { prisma } from "../index.js";
import { authenticate } from "../middleware/auth.js";
import { handleRouteError } from "../utils/handleError.js";

const router = Router();

// Get all mouvements
router.get("/", authenticate, async (req, res) => {
  try {
    const { pieceId, type, limit } = req.query;

    const where: Record<string, unknown> = {};
    if (pieceId) where.pieceId = pieceId;
    if (type) where.type = type;

    const mouvements = await prisma.mouvementStock.findMany({
      where,
      include: {
        piece: { select: { id: true, reference: true, nom: true } },
        user: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { date: "desc" },
      take: limit ? parseInt(limit as string) : 100,
    });

    res.json(mouvements);
  } catch (error) {
    handleRouteError(res, error, "la récupération des mouvements");
  }
});

// Get mouvements by piece
router.get("/piece/:pieceId", authenticate, async (req, res) => {
  try {
    const { pieceId } = req.params;

    const mouvements = await prisma.mouvementStock.findMany({
      where: { pieceId },
      include: {
        user: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { date: "desc" },
    });

    res.json(mouvements);
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Get mouvement by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const mouvement = await prisma.mouvementStock.findUnique({
      where: { id },
      include: {
        piece: true,
        user: { select: { id: true, nom: true, prenom: true } },
      },
    });

    if (!mouvement) {
      return res.status(404).json({ error: "Mouvement non trouvé" });
    }

    res.json(mouvement);
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

export default router;
