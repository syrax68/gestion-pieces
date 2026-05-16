/**
 * Middleware de protection contre les bots.
 *
 * Bloque :
 *  - Les User-Agents vides ou manquants
 *  - Les User-Agents correspondant à des scrapers / bots connus
 *
 * S'applique uniquement aux routes publiques (/api/public/*).
 */

import { Request, Response, NextFunction } from "express";

// Liste de patterns UA de bots/scrapers connus (insensible à la casse)
const BOT_UA_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /java\//i,
  /go-http-client/i,
  /axios\//i,
  /node-fetch/i,
  /got\//i,
  /undici/i,
  /libwww/i,
  /httpclient/i,
  /okhttp/i,
  /apache-httpclient/i,
  /mechanize/i,
  /scrapy/i,
  /semrush/i,
  /ahrefs/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /gptbot/i,
  /ccbot/i,
  /claudebot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slurp/i,
  /baiduspider/i,
  /yandexbot/i,
];

export function botProtection(req: Request, res: Response, next: NextFunction): void {
  const ua = req.headers["user-agent"];

  // Bloquer les requêtes sans User-Agent
  if (!ua || ua.trim() === "") {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  // Bloquer les User-Agents de bots connus
  if (BOT_UA_PATTERNS.some((pattern) => pattern.test(ua))) {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  next();
}
