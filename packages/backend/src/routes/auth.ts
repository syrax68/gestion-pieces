import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isAdminOrSuperAdmin, AuthRequest } from "../middleware/auth.js";

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
