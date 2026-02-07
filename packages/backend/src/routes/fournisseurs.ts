import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin } from "../middleware/auth.js";
import { handleRouteError } from "../utils/handleError.js";

const router = Router();

const fournisseurSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telephone: z.string().optional(),
});

// Get all fournisseurs
router.get("/", authenticate, async (_req, res) => {
  try {
    const fournisseurs = await prisma.fournisseur.findMany({
      include: { _count: { select: { pieces: true, commandes: true } } },
      orderBy: { nom: "asc" },
    });
    res.json(fournisseurs);
  } catch (error) {
    handleRouteError(res, error, "la récupération des fournisseurs");
  }
});

// Get fournisseur by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id },
      include: {
        pieces: true,
        commandes: { orderBy: { dateCommande: "desc" }, take: 10 },
      },
    });

    if (!fournisseur) {
      return res.status(404).json({ error: "Fournisseur non trouvé" });
    }

    res.json(fournisseur);
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Create fournisseur
router.post("/", authenticate, isVendeurOrAdmin, async (req, res) => {
  try {
    const data = fournisseurSchema.parse(req.body);
    const fournisseur = await prisma.fournisseur.create({ data });
    res.status(201).json(fournisseur);
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update fournisseur
router.put("/:id", authenticate, isVendeurOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = fournisseurSchema.partial().parse(req.body);
    const fournisseur = await prisma.fournisseur.update({ where: { id }, data });
    res.json(fournisseur);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete fournisseur (admin only)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.fournisseur.delete({ where: { id } });
    res.json({ message: "Fournisseur supprimé" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
