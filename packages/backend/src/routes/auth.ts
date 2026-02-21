import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { prisma } from "../index.js";
import { authenticate, isAdminOrSuperAdmin, AuthRequest } from "../middleware/auth.js";
import { uploadToR2, deleteFromR2 } from "../lib/r2.js";

const uploadAvatar = multer({
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

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "VENDEUR", "LECTEUR"]).optional(),
  boutiqueId: z.string().optional(),
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { boutique: { select: { id: true, nom: true } } },
    });

    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    if (!user.actif) {
      return res.status(403).json({ error: "Compte désactivé" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as jwt.Secret,
      { expiresIn } as jwt.SignOptions,
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        photo: user.photo,
        role: user.role,
        boutiqueId: user.boutiqueId,
        boutique: user.boutique,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Login error:", error);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
});

// Register (admin only)
router.post("/register", authenticate, isAdminOrSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Cet email est déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Assign new user to the same boutique as the admin creating them
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { boutiqueId: true },
    });

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nom: data.nom,
        prenom: data.prenom,
        role: data.role || "VENDEUR",
        boutiqueId: data.boutiqueId || adminUser?.boutiqueId || undefined,
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        boutiqueId: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Register error:", error);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});

// Get current user
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        photo: true,
        role: true,
        boutiqueId: true,
        boutique: { select: { id: true, nom: true } },
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du profil" });
  }
});

// Change password (authenticated user)
router.post("/change-password", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1, "Mot de passe actuel requis"),
      newPassword: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères"),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: "Mot de passe actuel incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: "Mot de passe modifié avec succès" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Change password error:", error);
    res.status(500).json({ error: "Erreur lors du changement de mot de passe" });
  }
});

// Reset password (admin only — resets another user's password)
router.post("/reset-password/:id", authenticate, isAdminOrSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      newPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    });
    const { newPassword } = schema.parse(req.body);

    const targetUser = await prisma.user.findUnique({ where: { id }, select: { id: true, boutiqueId: true } });
    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Verify same boutique (SUPER_ADMIN bypasses)
    const currentAdmin = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { boutiqueId: true, role: true },
    });
    if (currentAdmin?.role !== "SUPER_ADMIN" && targetUser.boutiqueId !== currentAdmin?.boutiqueId) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Erreur lors de la réinitialisation" });
  }
});

// Get all users (admin only)
router.get("/users", authenticate, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    // Get admin's boutiqueId to filter users
    const adminUser = await prisma.user.findUnique({
      where: { id: authReq.user!.userId },
      select: { boutiqueId: true, role: true },
    });

    // SUPER_ADMIN sees all users, ADMIN sees only their boutique
    const whereClause = adminUser?.role === "SUPER_ADMIN" ? {} : { boutiqueId: adminUser?.boutiqueId };

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        photo: true,
        role: true,
        actif: true,
        boutiqueId: true,
        boutique: { select: { id: true, nom: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
  }
});

// Update user (admin only)
router.put("/users/:id", authenticate, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const authReq = req as AuthRequest;

    // Verify user belongs to admin's boutique (SUPER_ADMIN bypasses)
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { boutiqueId: true } });
    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    const currentAdmin = await prisma.user.findUnique({ where: { id: authReq.user!.userId }, select: { boutiqueId: true, role: true } });
    if (currentAdmin?.role !== "SUPER_ADMIN" && targetUser.boutiqueId !== currentAdmin?.boutiqueId) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const { nom, prenom, role, password, boutiqueId: newBoutiqueId } = req.body;

    const updateData: Record<string, unknown> = {};
    if (nom) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (newBoutiqueId !== undefined && currentAdmin?.role === "SUPER_ADMIN") {
      updateData.boutiqueId = newBoutiqueId;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        photo: true,
        role: true,
        actif: true,
        boutiqueId: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

// Upload avatar (admin for any user, user for themselves)
router.post("/users/:id/photo", authenticate, uploadAvatar.single("photo"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Allow self-upload or admin
    const isSelf = req.user!.userId === id;
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.user!.role);
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: { photo: true } });
    if (!existing) return res.status(404).json({ error: "Utilisateur non trouvé" });

    if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni" });

    // Delete old avatar from R2
    if (existing.photo) await deleteFromR2(existing.photo);

    const photoUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, "avatars/");

    const user = await prisma.user.update({
      where: { id },
      data: { photo: photoUrl },
      select: { id: true, email: true, nom: true, prenom: true, photo: true, role: true, actif: true, boutiqueId: true, createdAt: true },
    });

    res.json(user);
  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({ error: "Erreur lors de l'upload" });
  }
});

// Delete user (admin only)
router.delete("/users/:id", authenticate, isAdminOrSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user!.userId) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
    }

    // Verify user belongs to admin's boutique (SUPER_ADMIN bypasses)
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { boutiqueId: true } });
    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    const currentAdmin = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { boutiqueId: true, role: true } });
    if (currentAdmin?.role !== "SUPER_ADMIN" && targetUser.boutiqueId !== currentAdmin?.boutiqueId) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: "Utilisateur supprimé" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

export default router;
