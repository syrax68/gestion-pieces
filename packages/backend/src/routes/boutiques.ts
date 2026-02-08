import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isAdmin, AuthRequest } from "../middleware/auth.js";
import { handleRouteError } from "../utils/handleError.js";

const router = Router();

const boutiqueSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  logo: z.string().optional(),
  siret: z.string().optional(),
});

// Get all boutiques (admin only)
router.get("/", authenticate, isAdmin, async (_req, res) => {
  try {
    const boutiques = await prisma.boutique.findMany({
      include: {
        _count: {
          select: { users: true, pieces: true, factures: true },
        },
      },
      orderBy: { nom: "asc" },
    });
    res.json(boutiques);
  } catch (error) {
    handleRouteError(res, error, "la récupération des boutiques");
  }
});

// Get boutique by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const boutique = await prisma.boutique.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { users: true, pieces: true, factures: true, clients: true },
        },
      },
    });
    if (!boutique) {
      return res.status(404).json({ error: "Boutique non trouvée" });
    }
    res.json(boutique);
  } catch (error) {
    handleRouteError(res, error, "la récupération de la boutique");
  }
});

// Create boutique (admin only)
router.post("/", authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = boutiqueSchema.parse(req.body);
    const boutique = await prisma.boutique.create({ data });
    res.status(201).json(boutique);
  } catch (error) {
    handleRouteError(res, error, "la création de la boutique");
  }
});

// Update boutique (admin only)
router.put("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = boutiqueSchema.partial().parse(req.body);
    const boutique = await prisma.boutique.update({ where: { id }, data });
    res.json(boutique);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour de la boutique");
  }
});

// Delete boutique (admin only)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Check if boutique has users
    const count = await prisma.user.count({ where: { boutiqueId: id } });
    if (count > 0) {
      return res.status(400).json({ error: "Impossible de supprimer une boutique avec des utilisateurs rattachés" });
    }
    await prisma.boutique.delete({ where: { id } });
    res.json({ message: "Boutique supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression de la boutique");
  }
});

export default router;
