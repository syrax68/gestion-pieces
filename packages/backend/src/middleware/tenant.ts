import { Response, NextFunction } from "express";
import { prisma } from "../index.js";
import { AuthRequest } from "./auth.js";

/**
 * Middleware tenant : injecte le boutiqueId de l'utilisateur connecté dans req.
 * Doit être utilisé APRÈS authenticate.
 * Les SUPER_ADMIN n'ont pas de boutique assignée (gèrent toutes les boutiques).
 */
export const injectBoutique = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    // SUPER_ADMIN n'a pas de boutique spécifique
    if (req.user.role === "SUPER_ADMIN") {
      req.boutiqueId = undefined;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { boutiqueId: true },
    });

    if (!user?.boutiqueId) {
      // Auto-assign the first active boutique to users who don't have one yet
      const defaultBoutique = await prisma.boutique.findFirst({
        where: { actif: true },
        select: { id: true },
      });

      if (!defaultBoutique) {
        return res.status(403).json({ error: "Aucune boutique disponible. Contactez un administrateur." });
      }

      await prisma.user.update({
        where: { id: req.user.userId },
        data: { boutiqueId: defaultBoutique.id },
      });

      req.boutiqueId = defaultBoutique.id;
    } else {
      req.boutiqueId = user.boutiqueId;
    }

    next();
  } catch (error) {
    console.error("Erreur middleware boutique:", error);
    return res.status(500).json({ error: "Erreur lors de la vérification de la boutique" });
  }
};
