import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { handleRouteError } from "../utils/handleError.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";
import { uploadToR2, deleteFromR2 } from "../lib/r2.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Format non supporté. Utilisez JPG, PNG ou WebP."));
    }
  },
});

const router = Router();
router.use(authenticate, injectBoutique);

// Upload image for a piece
router.post("/:pieceId", isVendeurOrAdmin, upload.single("image"), async (req: AuthRequest, res: Response) => {
  try {
    const { pieceId } = req.params;

    const piece = await prisma.piece.findUnique({ where: { id: pieceId } });
    if (!(await ensureBoutique(piece, req, res, "Pièce"))) return;

    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier fourni" });
    }

    const url = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, "pieces/");

    // Count existing images for order
    const count = await prisma.image.count({ where: { pieceId } });

    const image = await prisma.image.create({
      data: {
        url,
        alt: piece!.nom,
        ordre: count,
        principale: count === 0, // First image is principal
        pieceId,
      },
    });

    res.status(201).json(image);
  } catch (error) {
    handleRouteError(res, error, "l'upload de l'image");
  }
});

// Get images for a piece
router.get("/:pieceId", async (req, res) => {
  try {
    const { pieceId } = req.params;

    const piece = await prisma.piece.findUnique({ where: { id: pieceId } });
    if (!(await ensureBoutique(piece, req as AuthRequest, res, "Pièce"))) return;

    const images = await prisma.image.findMany({
      where: { pieceId },
      orderBy: [{ principale: "desc" }, { ordre: "asc" }],
    });

    res.json(images);
  } catch (error) {
    handleRouteError(res, error, "la récupération des images");
  }
});

// Set image as principale
router.patch("/:imageId/principale", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { imageId } = req.params;

    const image = await prisma.image.findUnique({ where: { id: imageId } });
    if (!image) return res.status(404).json({ error: "Image non trouvée" });

    const piece = await prisma.piece.findUnique({ where: { id: image.pieceId } });
    if (!(await ensureBoutique(piece, req, res, "Pièce"))) return;

    // Unset all principale for this piece, then set this one
    await prisma.$transaction([
      prisma.image.updateMany({
        where: { pieceId: image.pieceId },
        data: { principale: false },
      }),
      prisma.image.update({
        where: { id: imageId },
        data: { principale: true },
      }),
    ]);

    res.json({ message: "Image principale mise à jour" });
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete image
router.delete("/:imageId", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { imageId } = req.params;

    const image = await prisma.image.findUnique({ where: { id: imageId } });
    if (!image) return res.status(404).json({ error: "Image non trouvée" });

    const piece = await prisma.piece.findUnique({ where: { id: image.pieceId } });
    if (!(await ensureBoutique(piece, req, res, "Pièce"))) return;

    // Delete from R2 (or legacy local storage — deleteFromR2 ignores non-R2 URLs)
    await deleteFromR2(image.url);

    await prisma.image.delete({ where: { id: imageId } });

    // If deleted image was principale, set the first remaining one
    if (image.principale) {
      const first = await prisma.image.findFirst({
        where: { pieceId: image.pieceId },
        orderBy: { ordre: "asc" },
      });
      if (first) {
        await prisma.image.update({ where: { id: first.id }, data: { principale: true } });
      }
    }

    res.json({ message: "Image supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
