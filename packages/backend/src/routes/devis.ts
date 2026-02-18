import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { logActivity } from "../lib/activityLog.js";
import { serializeDevis } from "../utils/decimal.js";
import { generateNumero } from "../utils/generateNumero.js";
import { handleRouteError } from "../utils/handleError.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";

const router = Router();
router.use(authenticate, injectBoutique);

const devisItemSchema = z.object({
  pieceId: z.string().optional(),
  designation: z.string().min(1, "Désignation requise"),
  description: z.string().optional(),
  quantite: z.number().int().positive(),
  prixUnitaire: z.number().positive(),
  remise: z.number().min(0).max(100).default(0),
  tva: z.number().min(0).max(100).default(0),
});

const devisSchema = z.object({
  clientId: z.string().optional(),
  dateValidite: z.string().optional(),
  items: z.array(devisItemSchema).min(1, "Au moins un article requis"),
  remise: z.number().min(0).default(0),
  conditions: z.string().optional(),
  notes: z.string().optional(),
  notesInternes: z.string().optional(),
});

const devisIncludes = {
  client: true,
  items: { include: { piece: true } },
} as const;

// Helper: compute item totals (same logic as factures)
function computeDevisTotals(items: z.infer<typeof devisItemSchema>[], remise: number) {
  const itemsWithTotals = items.map((item) => {
    const itemTotal = item.quantite * item.prixUnitaire * (1 - item.remise / 100);
    return { ...item, total: itemTotal };
  });

  const sousTotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
  const sousTotalApresRemise = sousTotal - remise;
  const tvaTotal = itemsWithTotals.reduce((sum, item) => {
    const itemHT = item.total * (sousTotal > 0 ? sousTotalApresRemise / sousTotal : 1);
    return sum + itemHT * (item.tva / 100);
  }, 0);
  const total = sousTotalApresRemise + tvaTotal;

  return { itemsWithTotals, sousTotal, tvaTotal, total };
}

// Get all devis
router.get("/", async (req, res) => {
  try {
    const { statut, clientId } = req.query;
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;
    if (clientId) where.clientId = clientId;
    where.boutiqueId = (req as AuthRequest).boutiqueId;

    const devis = await prisma.devis.findMany({
      where,
      include: devisIncludes,
      orderBy: { dateDevis: "desc" },
    });

    res.json(devis.map(serializeDevis));
  } catch (error) {
    handleRouteError(res, error, "la récupération des devis");
  }
});

// Get devis by ID
router.get("/:id", async (req, res) => {
  try {
    const devis = await prisma.devis.findUnique({
      where: { id: req.params.id },
      include: {
        ...devisIncludes,
        createur: { select: { id: true, nom: true, prenom: true } },
        factures: { select: { id: true, numero: true, statut: true, total: true } },
      },
    });

    if (!(await ensureBoutique(devis, req as AuthRequest, res, "Devis"))) return;

    res.json(serializeDevis(devis!));
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Create devis
router.post("/", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = devisSchema.parse(req.body);
    const numero = await generateNumero("devis", "D");

    const { itemsWithTotals, sousTotal, tvaTotal, total } = computeDevisTotals(data.items, data.remise);

    // Default validity: 30 days from now
    const dateValidite = data.dateValidite ? new Date(data.dateValidite) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const devis = await prisma.devis.create({
      data: {
        numero,
        clientId: data.clientId,
        createurId: req.user!.userId,
        boutiqueId: req.boutiqueId!,
        dateValidite,
        sousTotal,
        remise: data.remise,
        remisePourcent: sousTotal > 0 ? (data.remise / sousTotal) * 100 : 0,
        tva: tvaTotal,
        total,
        statut: "BROUILLON",
        conditions: data.conditions,
        notes: data.notes,
        notesInternes: data.notesInternes,
        items: {
          create: itemsWithTotals.map((item) => ({
            pieceId: item.pieceId || null,
            designation: item.designation,
            description: item.description,
            quantite: item.quantite,
            prixUnitaire: item.prixUnitaire,
            remise: item.remise,
            tva: item.tva,
            total: item.total,
          })),
        },
      },
      include: devisIncludes,
    });

    await logActivity(
      req.user!.userId,
      "CREATE",
      "DEVIS",
      devis.id,
      `Création devis ${devis.numero} — ${Number(devis.total).toLocaleString("fr-FR")} Fmg`,
    );

    res.status(201).json(serializeDevis(devis));
  } catch (error) {
    handleRouteError(res, error, "la création");
  }
});

// Update devis (only BROUILLON can be edited)
router.put("/:id", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.devis.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req, res, "Devis"))) return;
    if (existing!.statut !== "BROUILLON") {
      return res.status(400).json({ error: "Seuls les devis en brouillon peuvent être modifiés" });
    }

    const data = devisSchema.parse(req.body);
    const { itemsWithTotals, sousTotal, tvaTotal, total } = computeDevisTotals(data.items, data.remise);

    const dateValidite = data.dateValidite ? new Date(data.dateValidite) : undefined;

    const devis = await prisma.$transaction(async (tx) => {
      await tx.devisItem.deleteMany({ where: { devisId: id } });

      const updated = await tx.devis.update({
        where: { id },
        data: {
          clientId: data.clientId || null,
          ...(dateValidite && { dateValidite }),
          sousTotal,
          remise: data.remise,
          remisePourcent: sousTotal > 0 ? (data.remise / sousTotal) * 100 : 0,
          tva: tvaTotal,
          total,
          conditions: data.conditions,
          notes: data.notes,
          notesInternes: data.notesInternes,
          items: {
            create: itemsWithTotals.map((item) => ({
              pieceId: item.pieceId || null,
              designation: item.designation,
              description: item.description,
              quantite: item.quantite,
              prixUnitaire: item.prixUnitaire,
              remise: item.remise,
              tva: item.tva,
              total: item.total,
            })),
          },
        },
        include: devisIncludes,
      });

      return updated;
    });

    await logActivity(req.user!.userId, "UPDATE", "DEVIS", devis.id, `Modification devis ${devis.numero}`);

    res.json(serializeDevis(devis));
  } catch (error) {
    handleRouteError(res, error, "la modification");
  }
});

// Update devis status
router.patch("/:id/statut", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!["BROUILLON", "ENVOYE", "ACCEPTE", "REFUSE", "EXPIRE"].includes(statut)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const existing = await prisma.devis.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req, res, "Devis"))) return;

    const devis = await prisma.devis.update({
      where: { id },
      data: { statut },
      include: devisIncludes,
    });

    await logActivity(req.user!.userId, "STATUS_CHANGE", "DEVIS", devis.id, `Devis ${devis.numero} → ${statut}`);

    res.json(serializeDevis(devis));
  } catch (error) {
    handleRouteError(res, error, "la mise à jour du statut");
  }
});

// Convert devis to facture
router.post("/:id/convertir", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.devis.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!(await ensureBoutique(existing, req, res, "Devis"))) return;

    if (existing!.statut !== "ACCEPTE") {
      return res.status(400).json({ error: "Seuls les devis acceptés peuvent être convertis en facture" });
    }

    const { serializeFacture } = await import("../utils/decimal.js");
    const numeroFacture = await generateNumero("facture", "F");

    const facture = await prisma.$transaction(async (tx) => {
      // Create facture from devis data
      const newFacture = await tx.facture.create({
        data: {
          numero: numeroFacture,
          clientId: existing!.clientId,
          createurId: req.user!.userId,
          boutiqueId: req.boutiqueId!,
          devisId: id,
          sousTotal: existing!.sousTotal,
          remise: existing!.remise,
          remisePourcent: existing!.remisePourcent,
          tva: existing!.tva,
          total: existing!.total,
          statut: "BROUILLON",
          notes: existing!.notes,
          items: {
            create: existing!.items.map((item) => ({
              pieceId: item.pieceId,
              designation: item.designation,
              description: item.description,
              quantite: item.quantite,
              prixUnitaire: item.prixUnitaire,
              remise: item.remise,
              tva: item.tva,
              total: item.total,
            })),
          },
        },
        include: {
          client: true,
          items: { include: { piece: true } },
        },
      });

      return newFacture;
    });

    await logActivity(
      req.user!.userId,
      "CREATE",
      "FACTURE",
      facture.id,
      `Facture ${facture.numero} créée depuis devis ${existing!.numero}`,
    );

    res.status(201).json(serializeFacture(facture));
  } catch (error) {
    handleRouteError(res, error, "la conversion en facture");
  }
});

// Delete devis (admin only)
router.delete("/:id", isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const devis = await prisma.devis.findUnique({ where: { id } });
    if (!(await ensureBoutique(devis, req, res, "Devis"))) return;

    await prisma.devis.delete({ where: { id } });

    await logActivity(req.user!.userId, "DELETE", "DEVIS", id, `Suppression du devis ${devis!.numero}`);
    res.json({ message: "Devis supprimé" });
  } catch (error) {
    handleRouteError(res, error, "la suppression");
  }
});

export default router;
