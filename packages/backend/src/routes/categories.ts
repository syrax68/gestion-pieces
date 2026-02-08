import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { handleRouteError } from "../utils/handleError.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";

const router = Router();
router.use(authenticate, injectBoutique);

const categorieSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  description: z.string().optional(),
});

// Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await prisma.categorie.findMany({
      where: { boutiqueId: (req as AuthRequest).boutiqueId },
      include: { _count: { select: { pieces: true } } },
      orderBy: { nom: "asc" },
    });
    res.json(categories);
  } catch (error) {
    handleRouteError(res, error, "la récupération des catégories");
  }
});

// Create category
router.post("/", isVendeurOrAdmin, async (req, res) => {
  try {
    const data = categorieSchema.parse(req.body);
    const categorie = await prisma.categorie.create({ data: { ...data, boutiqueId: (req as AuthRequest).boutiqueId! } });
    res.status(201).json(categorie);
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update category
router.put("/:id", isVendeurOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.categorie.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req as AuthRequest, res, "Catégorie"))) return;
    const data = categorieSchema.partial().parse(req.body);
    const categorie = await prisma.categorie.update({ where: { id }, data });
    res.json(categorie);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete category (admin only)
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.categorie.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req as AuthRequest, res, "Catégorie"))) return;
    await prisma.categorie.delete({ where: { id } });
    res.json({ message: "Catégorie supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
