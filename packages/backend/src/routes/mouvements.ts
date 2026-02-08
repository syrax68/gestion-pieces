import { Router } from "express";
import { prisma } from "../index.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { handleRouteError } from "../utils/handleError.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";

const router = Router();
router.use(authenticate, injectBoutique);

// Get all mouvements
router.get("/", async (req, res) => {
  try {
    const { pieceId, type, limit } = req.query;

    const where: Record<string, unknown> = {};
    if (pieceId) where.pieceId = pieceId;
    if (type) where.type = type;
    where.boutiqueId = (req as AuthRequest).boutiqueId;

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
router.get("/piece/:pieceId", async (req, res) => {
  try {
    const { pieceId } = req.params;

    const mouvements = await prisma.mouvementStock.findMany({
      where: { pieceId, boutiqueId: (req as AuthRequest).boutiqueId },
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
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const mouvement = await prisma.mouvementStock.findUnique({
      where: { id },
      include: {
        piece: true,
        user: { select: { id: true, nom: true, prenom: true } },
      },
    });

    if (!(await ensureBoutique(mouvement, req as AuthRequest, res, "Mouvement"))) return;

    res.json(mouvement);
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

export default router;
