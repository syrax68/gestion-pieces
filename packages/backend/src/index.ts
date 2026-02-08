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

dotenv.config();

const app = express();
export const prisma = new PrismaClient();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", process.env.FRONTEND_URL].filter(
        Boolean,
      );

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins in development
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

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

// Health check
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Une erreur interne est survenue" });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
