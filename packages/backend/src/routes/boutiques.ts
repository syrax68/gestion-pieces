import { Router, Response } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { prisma } from "../index.js";
import { authenticate, isSuperAdmin, AuthRequest } from "../middleware/auth.js";
import { handleRouteError } from "../utils/handleError.js";
import { uploadToR2, deleteFromR2 } from "../lib/r2.js";

const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Format non supporté. Utilisez JPG, PNG ou WebP."));
  },
});

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
router.get("/", authenticate, isSuperAdmin, async (_req, res) => {
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
router.post("/", authenticate, isSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = boutiqueSchema.parse(req.body);
    const boutique = await prisma.boutique.create({ data });
    res.status(201).json(boutique);
  } catch (error) {
    handleRouteError(res, error, "la création de la boutique");
  }
});

// Update boutique (admin only)
router.put("/:id", authenticate, isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = boutiqueSchema.partial().parse(req.body);
    const boutique = await prisma.boutique.update({ where: { id }, data });
    res.json(boutique);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour de la boutique");
  }
});

// Upload logo (super_admin only)
router.post("/:id/logo", authenticate, isSuperAdmin, uploadLogo.single("logo"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.boutique.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Boutique non trouvée" });

    if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni" });

    // Delete old logo from R2 if it's an R2 URL
    if (existing.logo) {
      await deleteFromR2(existing.logo);
    }

    const logoUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, "logos/");
    const boutique = await prisma.boutique.update({
      where: { id },
      data: { logo: logoUrl },
    });

    res.json(boutique);
  } catch (error) {
    handleRouteError(res, error, "l'upload du logo");
  }
});

// Delete boutique (admin only)
router.delete("/:id", authenticate, isSuperAdmin, async (req, res) => {
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
