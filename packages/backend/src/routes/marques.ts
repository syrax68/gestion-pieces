import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin } from "../middleware/auth.js";
import { handleRouteError } from "../utils/handleError.js";

const router = Router();

const marqueSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
});

// Get all marques
router.get("/", authenticate, async (_req, res) => {
  try {
    const marques = await prisma.marque.findMany({
      include: { _count: { select: { pieces: true } } },
      orderBy: { nom: "asc" },
    });
    res.json(marques);
  } catch (error) {
    handleRouteError(res, error, "la récupération des marques");
  }
});

// Create marque
router.post("/", authenticate, isVendeurOrAdmin, async (req, res) => {
  try {
    const data = marqueSchema.parse(req.body);
    const marque = await prisma.marque.create({ data });
    res.status(201).json(marque);
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update marque
router.put("/:id", authenticate, isVendeurOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = marqueSchema.partial().parse(req.body);
    const marque = await prisma.marque.update({ where: { id }, data });
    res.json(marque);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete marque (admin only)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.marque.delete({ where: { id } });
    res.json({ message: "Marque supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
