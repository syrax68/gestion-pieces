import { Router, Response } from "express";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { logActivity } from "../lib/activityLog.js";
import { serializePiece, serializeHistoriquePrix } from "../utils/decimal.js";
import { handleRouteError } from "../utils/handleError.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";
import { adjustStock } from "../services/stockService.js";
import { exportToXlsx } from "../utils/xlsx.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const xlsxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const lower = file.originalname.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      cb(null, true);
    } else {
      cb(new Error("Format non supporté. Utilisez un fichier Excel (.xlsx ou .xls)."));
    }
  },
});

const router = Router();
router.use(authenticate, injectBoutique);

const pieceSchema = z.object({
  reference: z.string().min(1, "Référence requise"),
  codeBarres: z.string().optional().nullable(),
  nom: z.string().min(1, "Nom requis"),
  description: z.string().optional().nullable(),
  prixVente: z.number().positive("Le prix de vente doit être positif"),
  prixAchat: z.number().positive().optional().nullable(),

  stock: z.number().int().min(0).default(0),
  stockMin: z.number().int().min(0).default(0),
  stockMax: z.number().int().min(0).optional().nullable(),
  poids: z.number().positive().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  actif: z.boolean().default(true),
  enPromotion: z.boolean().default(false),
  prixPromo: z.number().positive().optional().nullable(),
  marqueId: z.string().optional().nullable(),
  categorieId: z.string().optional().nullable(),
  sousCategorieId: z.string().optional().nullable(),
  fournisseurId: z.string().optional().nullable(),
  emplacementId: z.string().optional().nullable(),
});

const pieceIncludes = {
  marque: true,
  categorie: true,
  sousCategorie: true,
  fournisseur: true,
  emplacement: true,
  images: { where: { principale: true }, take: 1, select: { url: true } },
} as const;

// Get all pieces
router.get("/", async (req, res) => {
  try {
    const { search, categorie, marque, stockBas, actif } = req.query;
    const where: Record<string, unknown> = {};
    where.boutiqueId = (req as AuthRequest).boutiqueId;

    if (search) {
      where.OR = [
        { nom: { contains: search as string, mode: "insensitive" } },
        { reference: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { codeBarres: { contains: search as string, mode: "insensitive" } },
      ];
    }
    if (categorie) where.categorieId = categorie;
    if (marque) where.marqueId = marque;
    if (stockBas === "true") where.stock = { lte: prisma.piece.fields.stockMin };
    if (actif !== undefined) where.actif = actif === "true";

    const pieces = await prisma.piece.findMany({
      where,
      include: pieceIncludes,
      orderBy: { updatedAt: "desc" },
    });

    res.json(pieces.map(serializePiece));
  } catch (error) {
    handleRouteError(res, error, "la récupération des pièces");
  }
});

// Download import template
router.get("/import/template", isVendeurOrAdmin, async (_req, res: Response) => {
  try {
    const templateData = [
      {
        reference: "REF-001",
        nom: "Filtre à huile Honda CB125",
        prixVente: 15000,
        prixAchat: 9000,
        stock: 10,
        stockMin: 2,
        marque: "Honda",
        categorie: "Filtration",
        codeBarres: "1234567890123",
        description: "Filtre à huile compatible CB125F 2015-2023",
      },
      {
        reference: "REF-002",
        nom: "Plaquettes de frein avant universelles",
        prixVente: 25000,
        prixAchat: 15000,
        stock: 5,
        stockMin: 1,
        marque: "",
        categorie: "Freinage",
        codeBarres: "",
        description: "",
      },
    ];
    exportToXlsx(res, templateData, "Import Pièces", "template_import_pieces.xlsx");
  } catch (error) {
    handleRouteError(res, error, "la génération du template");
  }
});

// Import pieces from XLSX
router.post("/import", isVendeurOrAdmin, xlsxUpload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (rows.length === 0) return res.status(400).json({ error: "Le fichier est vide ou ne contient aucune ligne." });

    const boutiqueId = req.boutiqueId!;
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as { ligne: number; erreur: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const ligne = i + 2; // +2 : ligne 1 = en-têtes

      try {
        const reference = String(row["reference"] ?? "").trim();
        const nom = String(row["nom"] ?? "").trim();
        const prixVenteRaw = Number(row["prixVente"] ?? 0);

        if (!reference) { results.errors.push({ ligne, erreur: "Référence manquante" }); continue; }
        if (!nom) { results.errors.push({ ligne, erreur: "Nom manquant" }); continue; }
        if (!prixVenteRaw || prixVenteRaw <= 0) { results.errors.push({ ligne, erreur: "Prix de vente invalide ou manquant" }); continue; }

        // Skip duplicates
        const existing = await prisma.piece.findFirst({ where: { reference, boutiqueId } });
        if (existing) { results.skipped++; continue; }

        // Resolve marque
        let marqueId: string | null = null;
        const marqueName = String(row["marque"] ?? "").trim();
        if (marqueName) {
          const marque = await prisma.marque.findFirst({
            where: { nom: { equals: marqueName, mode: "insensitive" }, boutiqueId },
          });
          if (marque) marqueId = marque.id;
        }

        // Resolve categorie
        let categorieId: string | null = null;
        const categorieName = String(row["categorie"] ?? "").trim();
        if (categorieName) {
          const categorie = await prisma.categorie.findFirst({
            where: { nom: { equals: categorieName, mode: "insensitive" }, boutiqueId },
          });
          if (categorie) categorieId = categorie.id;
        }

        const prixAchat = Number(row["prixAchat"] ?? 0) || null;
        const stock = Math.max(0, parseInt(String(row["stock"] ?? 0)) || 0);
        const stockMin = Math.max(0, parseInt(String(row["stockMin"] ?? 0)) || 0);
        const codeBarres = String(row["codeBarres"] ?? "").trim() || null;
        const description = String(row["description"] ?? "").trim() || null;

        await prisma.piece.create({
          data: {
            reference,
            nom,
            prixVente: prixVenteRaw,
            prixAchat,
            stock,
            stockMin,
            tauxTVA: 0,
            codeBarres,
            description,
            marqueId,
            categorieId,
            boutiqueId,
          },
        });

        results.imported++;
      } catch (err) {
        results.errors.push({ ligne, erreur: err instanceof Error ? err.message : "Erreur inconnue" });
      }
    }

    await logActivity(
      req.user!.userId,
      "CREATE",
      "PIECE",
      boutiqueId,
      `Import Excel : ${results.imported} pièce(s) importée(s), ${results.skipped} ignorée(s)`,
    );

    res.json(results);
  } catch (error) {
    handleRouteError(res, error, "l'import des pièces");
  }
});

// Parse invoice image with Claude Vision → extract pieces list
const invoiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont acceptées (jpg, png, webp…)"));
    }
  },
});

router.post("/parse-invoice", isVendeurOrAdmin, invoiceUpload.single("invoice"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucune image fournie" });

    const base64 = req.file.buffer.toString("base64");
    const mediaType = req.file.mimetype as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Analyse cette facture fournisseur de pièces moto.
Extrais UNIQUEMENT les lignes de produits avec :
- nom : désignation de la pièce (string)
- quantite : quantité (number, entier)
- prix : prix unitaire (number, sans espaces ni séparateurs de milliers)

Ignore le total, les références, codes-barres, en-têtes, pied de page.
Si une ligne a une quantité illisible ou nulle, mets quantite: 1.
Retourne UNIQUEMENT un JSON valide, rien d'autre :
{"items":[{"nom":"...","quantite":0,"prix":0}]}`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: "Aucune pièce détectée, vérifiez la photo" });

    const parsed = JSON.parse(jsonMatch[0]) as { items: { nom: string; quantite: number; prix: number }[] };
    const items = (parsed.items ?? []).filter((it) => it.nom && it.nom.trim().length > 0);

    res.json({ items });
  } catch (error) {
    handleRouteError(res, error, "l'analyse de la facture");
  }
});

// Bulk upsert pieces from parsed invoice
const bulkUpdateSchema = z.object({
  devise: z.enum(["ariary", "fmg"]).default("ariary"),
  items: z.array(z.object({
    nom: z.string().min(1),
    quantite: z.number().int().min(0),
    prix: z.number().min(0),
  })).min(1),
});

router.post("/bulk-update", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { devise, items } = bulkUpdateSchema.parse(req.body);
    const boutiqueId = req.boutiqueId!;
    const results = { created: 0, updated: 0, errors: [] as string[] };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const prixFinal = devise === "fmg" ? item.prix / 5 : item.prix;

        const existing = await prisma.piece.findFirst({
          where: { nom: { equals: item.nom.trim(), mode: "insensitive" }, boutiqueId },
        });

        if (existing) {
          await prisma.piece.update({
            where: { id: existing.id },
            data: { stock: item.quantite, prixAchat: prixFinal },
          });
          results.updated++;
        } else {
          const reference = `IMPORT-${Date.now()}-${i}`;
          await prisma.piece.create({
            data: {
              reference,
              nom: item.nom.trim(),
              stock: item.quantite,
              prixAchat: prixFinal,
              prixVente: prixFinal,
              tauxTVA: 0,
              boutiqueId,
            },
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push(`${item.nom}: ${err instanceof Error ? err.message : "Erreur"}`);
      }
    }

    await logActivity(
      req.user!.userId,
      "CREATE",
      "PIECE",
      boutiqueId,
      `Import facture : ${results.created} créée(s), ${results.updated} mise(s) à jour`,
    );

    res.json(results);
  } catch (error) {
    handleRouteError(res, error, "la mise à jour des pièces");
  }
});

// Get piece by ID
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const piece = await prisma.piece.findUnique({
      where: { id: req.params.id },
      include: {
        ...pieceIncludes,
        images: { orderBy: { ordre: "asc" } },
        fournisseurs: { include: { fournisseur: true } },
        mouvements: {
          orderBy: { date: "desc" },
          take: 10,
          include: { user: { select: { nom: true, prenom: true } } },
        },
        historiquePrix: {
          orderBy: { dateChangement: "desc" },
          take: 50,
        },
      },
    });

    if (!(await ensureBoutique(piece, req, res, "Pièce"))) return;

    res.json({
      ...serializePiece(piece!),
      historiquePrix: piece!.historiquePrix.map(serializeHistoriquePrix),
      fournisseurs: piece!.fournisseurs.map((f) => ({
        ...f,
        prixAchat: Number(f.prixAchat),
      })),
    });
  } catch (error) {
    handleRouteError(res, error, "la récupération de la pièce");
  }
});

// Create piece
router.post("/", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = pieceSchema.parse(req.body);

    const existing = await prisma.piece.findUnique({ where: { reference: data.reference } });
    if (existing) {
      return res.status(400).json({ error: "Cette référence existe déjà" });
    }

    if (data.codeBarres) {
      const existingBarcode = await prisma.piece.findUnique({ where: { codeBarres: data.codeBarres } });
      if (existingBarcode) {
        return res.status(400).json({ error: "Ce code-barres existe déjà" });
      }
    }

    const piece = await prisma.piece.create({
      data: { ...data, boutiqueId: req.boutiqueId! },
      include: pieceIncludes,
    });

    // Enregistrer le prix initial dans l'historique
    await prisma.historiquePrix.create({
      data: {
        pieceId: piece.id,
        prixVente: data.prixVente,
        prixAchat: data.prixAchat ?? null,
        motif: "Prix initial",
      },
    });

    await logActivity(req.user!.userId, "CREATE", "PIECE", piece.id, `Création de la pièce "${piece.nom}" (${piece.reference})`);

    res.status(201).json(serializePiece(piece));
  } catch (error) {
    handleRouteError(res, error, "la création de la pièce");
  }
});

// Update piece
router.put("/:id", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = pieceSchema.partial().parse(req.body);

    // Verify ownership
    const existing = await prisma.piece.findUnique({ where: { id } });
    if (!(await ensureBoutique(existing, req, res, "Pièce"))) return;

    if (data.reference) {
      const existing = await prisma.piece.findFirst({ where: { reference: data.reference, NOT: { id } } });
      if (existing) return res.status(400).json({ error: "Cette référence existe déjà" });
    }

    if (data.codeBarres) {
      const existingBarcode = await prisma.piece.findFirst({ where: { codeBarres: data.codeBarres, NOT: { id } } });
      if (existingBarcode) return res.status(400).json({ error: "Ce code-barres existe déjà" });
    }

    const oldPiece = await prisma.piece.findUnique({ where: { id } });

    const piece = await prisma.piece.update({
      where: { id },
      data,
      include: pieceIncludes,
    });

    // Record price change if price changed
    if (oldPiece && data.prixVente && Number(oldPiece.prixVente) !== data.prixVente) {
      await prisma.historiquePrix.create({
        data: {
          pieceId: id,
          prixVente: data.prixVente,
          prixAchat: data.prixAchat || (oldPiece.prixAchat ? Number(oldPiece.prixAchat) : null),
          motif: "Mise à jour manuelle",
        },
      });
    }

    await logActivity(req.user!.userId, "UPDATE", "PIECE", piece.id, `Modification de la pièce "${piece.nom}"`);

    res.json(serializePiece(piece));
  } catch (error) {
    handleRouteError(res, error, "la mise à jour de la pièce");
  }
});

// Delete piece (admin only)
router.delete("/:id", isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const piece = await prisma.piece.findUnique({ where: { id } });
    if (!(await ensureBoutique(piece, req, res, "Pièce"))) return;
    await prisma.piece.delete({ where: { id } });
    await logActivity(req.user!.userId, "DELETE", "PIECE", id, `Suppression de la pièce "${piece?.nom}"`);
    res.json({ message: "Pièce supprimée" });
  } catch (error) {
    handleRouteError(res, error, "la suppression de la pièce");
  }
});

// Adjust stock
router.post("/:id/stock", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, quantite, motif, reference } = req.body;

    // Verify ownership
    const piece = await prisma.piece.findUnique({ where: { id } });
    if (!(await ensureBoutique(piece, req, res, "Pièce"))) return;

    if (!["ENTREE", "SORTIE", "AJUSTEMENT", "INVENTAIRE", "RETOUR", "TRANSFERT"].includes(type)) {
      return res.status(400).json({ error: "Type de mouvement invalide" });
    }

    const { oldStock, newStock } = await (async () => {
      // For AJUSTEMENT/INVENTAIRE, use prisma.$transaction with adjustStock
      return prisma.$transaction(async (tx) => {
        return adjustStock({
          tx,
          pieceId: id,
          type,
          quantite,
          motif: motif || `${type} manuel`,
          reference: reference || null,
          userId: req.user!.userId,
        });
      });
    })();

    const updatedPiece = await prisma.piece.findUnique({
      where: { id },
      include: pieceIncludes,
    });

    await logActivity(
      req.user!.userId,
      "STOCK_ADJUST",
      "PIECE",
      id,
      `${type} de ${quantite} unités sur "${updatedPiece!.nom}" (${oldStock} → ${newStock})`,
    );

    res.json(serializePiece(updatedPiece!));
  } catch (error) {
    handleRouteError(res, error, "l'ajustement du stock");
  }
});

// Replace piece (transfer all references from old piece to new piece)
router.post("/:id/remplacer", isVendeurOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id: oldPieceId } = req.params;
    const { newPieceId } = req.body;

    if (!newPieceId) {
      return res.status(400).json({ error: "newPieceId requis" });
    }
    if (oldPieceId === newPieceId) {
      return res.status(400).json({ error: "La pièce de remplacement doit être différente" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldPiece = await tx.piece.findUnique({ where: { id: oldPieceId }, include: { fournisseur: true } });
      if (!oldPiece || oldPiece.boutiqueId !== req.boutiqueId) throw new Error("Ancienne pièce non trouvée");

      const newPiece = await tx.piece.findUnique({ where: { id: newPieceId }, include: { fournisseur: true } });
      if (!newPiece || newPiece.boutiqueId !== req.boutiqueId) throw new Error("Nouvelle pièce non trouvée");

      // 1. Get facture items that will be transferred (to update prices and recalculate)
      const factureItems = await tx.factureItem.findMany({ where: { pieceId: oldPieceId } });

      // 2. Transfer all references from old to new
      const [fiCount, aiCount, diCount, aviCount, mvtCount, invCount] = await Promise.all([
        tx.factureItem.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
        tx.achatItem.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
        tx.devisItem.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
        tx.avoirItem.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
        tx.mouvementStock.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
        tx.inventaireItem.updateMany({ where: { pieceId: oldPieceId }, data: { pieceId: newPieceId } }),
      ]);

      // 3. Update prices in transferred facture items and collect affected factures
      const affectedFactureIds = new Set<string>();
      let totalQteVendue = 0;

      for (const item of factureItems) {
        const newTotal = Number(newPiece.prixVente) * item.quantite;
        await tx.factureItem.update({
          where: { id: item.id },
          data: {
            prixUnitaire: Number(newPiece.prixVente),
            total: newTotal,
            designation: newPiece.nom,
          },
        });
        affectedFactureIds.add(item.factureId);
        totalQteVendue += item.quantite;
      }

      // 4. Recalculate totals for each affected facture
      for (const factureId of affectedFactureIds) {
        const items = await tx.factureItem.findMany({ where: { factureId } });
        const sousTotal = items.reduce((sum, item) => sum + Number(item.total), 0);
        const total = sousTotal;
        await tx.facture.update({
          where: { id: factureId },
          data: { sousTotal, tva: 0, total },
        });
      }

      // 5. Decrement new piece stock for sold quantities
      if (totalQteVendue > 0) {
        await tx.piece.update({
          where: { id: newPieceId },
          data: { stock: { decrement: totalQteVendue } },
        });
      }

      // 6. Delete old piece (cascade will handle images, historiquePrix, pieceFournisseur, pieceModeleVehicule)
      await tx.piece.delete({ where: { id: oldPieceId } });

      return {
        oldPiece: { reference: oldPiece.reference, nom: oldPiece.nom, fournisseur: oldPiece.fournisseur?.nom },
        newPiece: { reference: newPiece.reference, nom: newPiece.nom, fournisseur: newPiece.fournisseur?.nom },
        stats: {
          factureItems: fiCount.count,
          achatItems: aiCount.count,
          devisItems: diCount.count,
          avoirItems: aviCount.count,
          mouvements: mvtCount.count,
          inventaireItems: invCount.count,
          facturesRecalculees: affectedFactureIds.size,
          stockDecremente: totalQteVendue,
        },
      };
    });

    await logActivity(
      req.user!.userId,
      "UPDATE",
      "PIECE",
      newPieceId,
      `Remplacement de "${result.oldPiece.nom}" (${result.oldPiece.reference}) par "${result.newPiece.nom}" (${result.newPiece.reference})`,
    );

    res.json({
      message: `Pièce "${result.oldPiece.nom}" remplacée par "${result.newPiece.nom}"`,
      ...result,
    });
  } catch (error) {
    handleRouteError(res, error, "le remplacement de la pièce");
  }
});

export default router;
