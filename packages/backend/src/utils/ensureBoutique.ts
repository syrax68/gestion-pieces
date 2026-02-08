import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";

/**
 * Vérifie qu'un enregistrement appartient à la boutique de l'utilisateur.
 * Retourne true si OK, false si non trouvé (envoie 404).
 */
export async function ensureBoutique(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: { boutiqueId?: string | null } | null,
  req: AuthRequest,
  res: Response,
  entityName = "Enregistrement",
): Promise<boolean> {
  if (!record) {
    res.status(404).json({ error: `${entityName} non trouvé(e)` });
    return false;
  }
  if (record.boutiqueId && record.boutiqueId !== req.boutiqueId) {
    res.status(404).json({ error: `${entityName} non trouvé(e)` });
    return false;
  }
  return true;
}
