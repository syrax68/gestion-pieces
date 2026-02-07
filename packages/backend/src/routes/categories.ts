import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin } from "../middleware/auth.js";
import { handleRouteError } from "../utils/handleError.js";

const router = Router();

const categorieSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  description: z.string().optional(),
});

// Get all categories
router.get("/", authenticate, async (_req, res) => {
  try {
    const categories = await prisma.categorie.findMany({
      include: { _count: { select: { pieces: true } } },
      orderBy: { nom: "asc" },
    });
    res.json(categories);
  } catch (error) {
    handleRouteError(res, error, "la récupération des catégories");
  }
});

// Create category
router.post("/", authenticate, isVendeurOrAdmin, async (req, res) => {
  try {
    const data = categorieSchema.parse(req.body);
    const categorie = await prisma.categorie.create({ data });
    res.status(201).json(categorie);
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update category
router.put("/:id", authenticate, isVendeurOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = categorieSchema.partial().parse(req.body);
    const categorie = await prisma.categorie.update({ where: { id }, data });
    res.json(categorie);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete category (admin only)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.categorie.delete({ where: { id } });
    res.json({ message: "Catégorie supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
