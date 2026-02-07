import { Router } from "express";
import { prisma } from "../index.js";
import { authenticate } from "../middleware/auth.js";
import { handleRouteError } from "../utils/handleError.js";

const router = Router();

// Get activity logs (paginated)
router.get("/", authenticate, async (req, res) => {
  try {
    const { entity, limit = "50", offset = "0" } = req.query;

    const where: Record<string, unknown> = {};
    if (entity && entity !== "ALL") {
      where.entity = entity;
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, nom: true, prenom: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({ logs, total });
  } catch (error) {
    handleRouteError(res, error, "la récupération des logs");
  }
});

export default router;
