/**
 * Rate limiter en mémoire par IP.
 * Pas de dépendance externe — fonctionne avec Node.js natif.
 *
 * Utilisation :
 *   router.use(createRateLimiter({ windowMs: 60_000, max: 30 }))
 *   router.post("/commandes", createRateLimiter({ windowMs: 15 * 60_000, max: 5 }), handler)
 */

import { Request, Response, NextFunction } from "express";

interface RateLimiterOptions {
  /** Fenêtre de temps en ms (défaut : 60 000 = 1 min) */
  windowMs?: number;
  /** Nombre max de requêtes par IP dans la fenêtre (défaut : 60) */
  max?: number;
  /** Message d'erreur renvoyé (défaut : générique) */
  message?: string;
}

interface HitRecord {
  count: number;
  resetAt: number;
}

// Registre global partagé entre toutes les instances (Map<ip:route, HitRecord>)
const store = new Map<string, HitRecord>();

// Nettoyage périodique pour éviter les fuites mémoire (toutes les 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetAt) store.delete(key);
  }
}, 5 * 60_000);

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 60;
  const message = options.message ?? "Trop de requêtes, veuillez réessayer dans quelques instants.";

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "unknown";

    // Clé unique : IP + chemin de la route pour isoler les limites par endpoint
    const key = `${ip}::${req.path}`;
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    record.count += 1;

    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.status(429).json({ error: message, retryAfter });
      return;
    }

    next();
  };
}
