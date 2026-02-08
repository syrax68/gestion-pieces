import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { handleRouteError } from "../utils/handleError.js";
import { serializeFacture } from "../utils/decimal.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";

const router = Router();
router.use(authenticate, injectBoutique);

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
router.get("/", async (req, res) => {
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
    where.boutiqueId = (req as AuthRequest).boutiqueId;

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
router.get("/:id", async (req, res) => {
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

    if (!(await ensureBoutique(client, req as AuthRequest, res, "Client"))) return;

    // Transform Decimal values
    const result = {
      ...client!,
      factures: client!.factures.map(serializeFacture),
    };

    res.json(result);
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Create client
router.post("/", isVendeurOrAdmin, async (req, res) => {
  try {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.create({ data: { ...data, boutiqueId: (req as AuthRequest).boutiqueId! } });
    res.status(201).json(client);
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update client
router.put("/:id", isVendeurOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req as AuthRequest, res, "Client"))) return;
    const data = clientSchema.partial().parse(req.body);
    const client = await prisma.client.update({ where: { id }, data });
    res.json(client);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour");
  }
});

// Delete client (admin only)
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req as AuthRequest, res, "Client"))) return;
    await prisma.client.delete({ where: { id } });
    res.json({ message: "Client supprimé" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
