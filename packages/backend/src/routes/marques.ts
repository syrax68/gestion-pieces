import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { handleRouteError } from "../utils/handleError.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";

const router = Router();
router.use(authenticate, injectBoutique);

const marqueSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
});

// Get all marques
router.get("/", async (req, res) => {
  try {
    const marques = await prisma.marque.findMany({
      where: { boutiqueId: (req as AuthRequest).boutiqueId },
      include: { _count: { select: { pieces: true } } },
      orderBy: { nom: "asc" },
    });
    res.json(marques);
  } catch (error) {
    handleRouteError(res, error, "la récupération des marques");
  }
});

// Create marque
router.post("/", isVendeurOrAdmin, async (req, res) => {
  try {
    const data = marqueSchema.parse(req.body);
    const marque = await prisma.marque.create({ data: { ...data, boutiqueId: (req as AuthRequest).boutiqueId! } });
    res.status(201).json(marque);
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update marque
router.put("/:id", isVendeurOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.marque.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req as AuthRequest, res, "Marque"))) return;
    const data = marqueSchema.partial().parse(req.body);
    const marque = await prisma.marque.update({ where: { id }, data });
    res.json(marque);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete marque (admin only)
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.marque.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req as AuthRequest, res, "Marque"))) return;
    await prisma.marque.delete({ where: { id } });
    res.json({ message: "Marque supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
