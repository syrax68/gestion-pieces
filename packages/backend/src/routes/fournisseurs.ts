import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { handleRouteError } from "../utils/handleError.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";

const router = Router();
router.use(authenticate, injectBoutique);

const fournisseurSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telephone: z.string().optional(),
});

// Get all fournisseurs
router.get("/", async (req, res) => {
  try {
    const fournisseurs = await prisma.fournisseur.findMany({
      where: { boutiqueId: (req as AuthRequest).boutiqueId },
      include: { _count: { select: { pieces: true } } },
      orderBy: { nom: "asc" },
    });
    res.json(fournisseurs);
  } catch (error) {
    handleRouteError(res, error, "la récupération des fournisseurs");
  }
});

// Get fournisseur by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id },
      include: {
        pieces: true,
      },
    });

    if (!(await ensureBoutique(fournisseur, req as AuthRequest, res, "Fournisseur"))) return;

    res.json(fournisseur);
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Create fournisseur
router.post("/", isVendeurOrAdmin, async (req, res) => {
  try {
    const data = fournisseurSchema.parse(req.body);
    const fournisseur = await prisma.fournisseur.create({ data: { ...data, boutiqueId: (req as AuthRequest).boutiqueId! } });
    res.status(201).json(fournisseur);
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update fournisseur
router.put("/:id", isVendeurOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.fournisseur.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req as AuthRequest, res, "Fournisseur"))) return;
    const data = fournisseurSchema.partial().parse(req.body);
    const fournisseur = await prisma.fournisseur.update({ where: { id }, data });
    res.json(fournisseur);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete fournisseur (admin only)
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.fournisseur.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req as AuthRequest, res, "Fournisseur"))) return;
    await prisma.fournisseur.delete({ where: { id } });
    res.json({ message: "Fournisseur supprimé" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
