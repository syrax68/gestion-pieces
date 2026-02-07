import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin } from "../middleware/auth.js";
import { handleRouteError } from "../utils/handleError.js";
import { serializeFacture } from "../utils/decimal.js";

const router = Router();

const clientSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().optional(),
  entreprise: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
});

// Get all clients
router.get("/", authenticate, async (req, res) => {
  try {
    const { search } = req.query;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { nom: { contains: search as string, mode: "insensitive" } },
        { prenom: { contains: search as string, mode: "insensitive" } },
        { entreprise: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: { _count: { select: { factures: true } } },
      orderBy: { nom: "asc" },
    });
    res.json(clients);
  } catch (error) {
    handleRouteError(res, error, "la récupération des clients");
  }
});

// Get client by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        factures: {
          orderBy: { dateFacture: "desc" },
          take: 10,
          include: { items: true },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: "Client non trouvé" });
    }

    // Transform Decimal values
    const result = {
      ...client,
      factures: client.factures.map(serializeFacture),
    };

    res.json(result);
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Create client
router.post("/", authenticate, isVendeurOrAdmin, async (req, res) => {
  try {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.create({ data });
    res.status(201).json(client);
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update client
router.put("/:id", authenticate, isVendeurOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = clientSchema.partial().parse(req.body);
    const client = await prisma.client.update({ where: { id }, data });
    res.json(client);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete client (admin only)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.client.delete({ where: { id } });
    res.json({ message: "Client supprimé" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
