import { Response } from "express";
import { z } from "zod";

/**
 * Gestion centralisée des erreurs dans les handlers de route.
 * Gère les erreurs Zod (400) et les erreurs serveur (500).
 */
export function handleRouteError(res: Response, error: unknown, context: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors[0].message });
  }
  console.error(`${context}:`, error);
  return res.status(500).json({ error: `Erreur lors de ${context}` });
}
