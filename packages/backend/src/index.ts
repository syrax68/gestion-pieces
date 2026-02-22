import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth.js";
import piecesRoutes from "./routes/pieces.js";
import categoriesRoutes from "./routes/categories.js";
import marquesRoutes from "./routes/marques.js";
import fournisseursRoutes from "./routes/fournisseurs.js";
import clientsRoutes from "./routes/clients.js";
import achatsRoutes from "./routes/achats.js";
import facturesRoutes from "./routes/factures.js";
import mouvementsRoutes from "./routes/mouvements.js";
import dashboardRoutes from "./routes/dashboard.js";
import exportRoutes from "./routes/export.js";
import activityRoutes from "./routes/activity.js";
import boutiquesRoutes from "./routes/boutiques.js";
import devisRoutes from "./routes/devis.js";
import avoirsRoutes from "./routes/avoirs.js";
import inventairesRoutes from "./routes/inventaires.js";
import imagesRoutes from "./routes/images.js";
import publicRoutes from "./routes/public.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
export const prisma = new PrismaClient();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origin (Postman, curl, mobile apps)
      if (!origin) return callback(null, true);

      // Autoriser localhost en développement
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return callback(null, true);
      }

      // Autoriser tous les sous-domaines kojakojamoto.com
      if (origin.endsWith(".kojakojamoto.com") || origin === "https://kojakojamoto.com") {
        return callback(null, true);
      }

      // Whitelist supplémentaire via FRONTEND_URL
      const allowedOrigins = process.env.FRONTEND_URL?.split(",").map(o => o.trim()) || [];
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());

// Routes publiques (sans authentification)
app.use("/api/public", publicRoutes);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/pieces", piecesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/marques", marquesRoutes);
app.use("/api/fournisseurs", fournisseursRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/achats", achatsRoutes);
app.use("/api/factures", facturesRoutes);
app.use("/api/mouvements", mouvementsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/boutiques", boutiquesRoutes);
app.use("/api/devis", devisRoutes);
app.use("/api/avoirs", avoirsRoutes);
app.use("/api/inventaires", inventairesRoutes);
app.use("/api/images", imagesRoutes);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origine non autorisée" });
  }
  console.error(err.stack);
  res.status(500).json({ error: "Une erreur interne est survenue" });
});

// Warm up Neon connection (cold start : la DB se suspend après 5min d'inactivité)
async function warmupDatabase(attempts = 6, delay = 5000): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ Database connection ready");
      return;
    } catch {
      if (i < attempts - 1) {
        console.log(`⏳ Database not ready, retry in ${delay / 1000}s... (${i + 1}/${attempts})`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  console.warn("⚠️  Database warm-up timed out — will retry on first request");
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Lance le warm-up en arrière-plan (sans bloquer le démarrage du serveur)
  warmupDatabase().catch((e) => console.error("Warm-up error:", e));
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
