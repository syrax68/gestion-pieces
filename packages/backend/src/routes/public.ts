import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { handleRouteError } from "../utils/handleError.js";
import { generateNumero } from "../utils/generateNumero.js";

const router = Router();

// Validation du boutiqueId et récupération de la boutique
async function getBoutiqueOr404(boutiqueId: string, res: Response) {
  const boutique = await prisma.boutique.findFirst({
    where: { id: boutiqueId, actif: true },
  });
  if (!boutique) {
    res.status(404).json({ error: "Boutique introuvable" });
    return null;
  }
  return boutique;
}

// Calcul des totaux (même logique que devis.ts)
function computeItemTotals<T extends { quantite: number; prixUnitaire: number; tva: number }>(items: T[]) {
  const itemsWithTotals = items.map((item) => ({
    ...item,
    total: item.quantite * item.prixUnitaire,
  }));
  const sousTotal = itemsWithTotals.reduce((sum, i) => sum + i.total, 0);
  const tvaTotal = itemsWithTotals.reduce((sum, i) => sum + i.total * (i.tva / 100), 0);
  const total = sousTotal + tvaTotal;
  return { itemsWithTotals, sousTotal, tvaTotal, total };
}

// ─── GET /:boutiqueId/boutique ─────────────────────────────────────────────
router.get("/:boutiqueId/boutique", async (req: Request, res: Response) => {
  try {
    const boutique = await getBoutiqueOr404(req.params.boutiqueId, res);
    if (!boutique) return;

    res.json({
      id: boutique.id,
      nom: boutique.nom,
      logo: boutique.logo,
      adresse: boutique.adresse,
      ville: boutique.ville,
      telephone: boutique.telephone,
      email: boutique.email,
    });
  } catch (error) {
    handleRouteError(res, error, "la récupération de la boutique");
  }
});

// ─── GET /:boutiqueId/categories ──────────────────────────────────────────
router.get("/:boutiqueId/categories", async (req: Request, res: Response) => {
  try {
    const boutique = await getBoutiqueOr404(req.params.boutiqueId, res);
    if (!boutique) return;

    const categories = await prisma.categorie.findMany({
      where: { boutiqueId: req.params.boutiqueId },
      select: {
        id: true,
        nom: true,
        _count: {
          select: {
            pieces: { where: { actif: true, stock: { gt: 0 } } },
          },
        },
      },
      orderBy: { nom: "asc" },
    });

    res.json(
      categories
        .filter((c) => c._count.pieces > 0)
        .map((c) => ({ id: c.id, nom: c.nom, nbPieces: c._count.pieces })),
    );
  } catch (error) {
    handleRouteError(res, error, "la récupération des catégories");
  }
});

// ─── GET /:boutiqueId/marques ─────────────────────────────────────────────
router.get("/:boutiqueId/marques", async (req: Request, res: Response) => {
  try {
    const boutique = await getBoutiqueOr404(req.params.boutiqueId, res);
    if (!boutique) return;

    const marques = await prisma.marque.findMany({
      where: { boutiqueId: req.params.boutiqueId },
      select: {
        id: true,
        nom: true,
        _count: {
          select: {
            pieces: { where: { actif: true, stock: { gt: 0 } } },
          },
        },
      },
      orderBy: { nom: "asc" },
    });

    res.json(
      marques
        .filter((m) => m._count.pieces > 0)
        .map((m) => ({ id: m.id, nom: m.nom, nbPieces: m._count.pieces })),
    );
  } catch (error) {
    handleRouteError(res, error, "la récupération des marques");
  }
});

// ─── GET /:boutiqueId/pieces ──────────────────────────────────────────────
router.get("/:boutiqueId/pieces", async (req: Request, res: Response) => {
  try {
    const boutique = await getBoutiqueOr404(req.params.boutiqueId, res);
    if (!boutique) return;

    const { search, categorieId, marqueId } = req.query as Record<string, string>;
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      boutiqueId: req.params.boutiqueId,
      actif: true,
    };
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
      ];
    }
    if (categorieId) where.categorieId = categorieId;
    if (marqueId) where.marqueId = marqueId;

    const [pieces, total] = await Promise.all([
      prisma.piece.findMany({
        where,
        select: {
          id: true,
          reference: true,
          nom: true,
          description: true,
          prixVente: true,
          tauxTVA: true,
          prixPromo: true,
          enPromotion: true,
          stock: true,
          stockMin: true,
          marque: { select: { id: true, nom: true } },
          categorie: { select: { id: true, nom: true } },
          images: {
            where: { principale: true },
            select: { url: true, alt: true },
            take: 1,
          },
        },
        orderBy: { nom: "asc" },
        skip,
        take: limit,
      }),
      prisma.piece.count({ where }),
    ]);

    res.json({
      data: pieces.map((p) => ({
        ...p,
        prixVente: Number(p.prixVente),
        tauxTVA: Number(p.tauxTVA),
        prixPromo: p.prixPromo ? Number(p.prixPromo) : null,
        image: p.images[0] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    handleRouteError(res, error, "la récupération des pièces");
  }
});

// ─── GET /:boutiqueId/pieces/:id ──────────────────────────────────────────
router.get("/:boutiqueId/pieces/:id", async (req: Request, res: Response) => {
  try {
    const boutique = await getBoutiqueOr404(req.params.boutiqueId, res);
    if (!boutique) return;

    const piece = await prisma.piece.findFirst({
      where: { id: req.params.id, boutiqueId: req.params.boutiqueId, actif: true },
      select: {
        id: true,
        reference: true,
        nom: true,
        description: true,
        prixVente: true,
        tauxTVA: true,
        prixPromo: true,
        enPromotion: true,
        stock: true,
        stockMin: true,
        poids: true,
        dimensions: true,
        marque: { select: { id: true, nom: true } },
        categorie: { select: { id: true, nom: true } },
        sousCategorie: { select: { id: true, nom: true } },
        images: {
          select: { id: true, url: true, alt: true, ordre: true, principale: true },
          orderBy: [{ principale: "desc" }, { ordre: "asc" }],
        },
        modelesCompatibles: {
          select: {
            notes: true,
            modele: {
              select: {
                id: true,
                nom: true,
                type: true,
                anneeDebut: true,
                anneeFin: true,
                marque: { select: { nom: true } },
              },
            },
          },
        },
      },
    });

    if (!piece) {
      return res.status(404).json({ error: "Pièce introuvable" });
    }

    res.json({
      ...piece,
      prixVente: Number(piece.prixVente),
      tauxTVA: Number(piece.tauxTVA),
      prixPromo: piece.prixPromo ? Number(piece.prixPromo) : null,
      poids: piece.poids ? Number(piece.poids) : null,
    });
  } catch (error) {
    handleRouteError(res, error, "la récupération de la pièce");
  }
});

// ─── POST /:boutiqueId/commandes ──────────────────────────────────────────
const commandeSchema = z.object({
  clientNom: z.string().min(2, "Le nom doit comporter au moins 2 caractères"),
  clientTelephone: z.string().min(8, "Numéro de téléphone invalide"),
  items: z
    .array(
      z.object({
        pieceId: z.string(),
        quantite: z.number().int().positive("La quantité doit être positive"),
      }),
    )
    .min(1, "Le panier est vide"),
});

router.post("/:boutiqueId/commandes", async (req: Request, res: Response) => {
  try {
    const boutique = await getBoutiqueOr404(req.params.boutiqueId, res);
    if (!boutique) return;

    const data = commandeSchema.parse(req.body);
    const boutiqueId = req.params.boutiqueId;

    // Récupérer les pièces commandées
    const pieces = await prisma.piece.findMany({
      where: {
        id: { in: data.items.map((i) => i.pieceId) },
        boutiqueId,
        actif: true,
      },
      select: { id: true, nom: true, reference: true, prixVente: true, tauxTVA: true, stock: true },
    });

    if (pieces.length !== data.items.length) {
      return res.status(400).json({ error: "Une ou plusieurs pièces sont introuvables ou indisponibles" });
    }

    // Vérifier les stocks
    for (const item of data.items) {
      const piece = pieces.find((p) => p.id === item.pieceId)!;
      if (piece.stock < item.quantite) {
        return res.status(400).json({
          error: `Stock insuffisant pour "${piece.nom}" (disponible : ${piece.stock})`,
        });
      }
    }

    // Trouver ou créer le client par téléphone
    let client = await prisma.client.findFirst({
      where: { telephone: data.clientTelephone, boutiqueId },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          nom: data.clientNom,
          telephone: data.clientTelephone,
          boutiqueId,
          type: "particulier",
        },
      });
    }

    // Trouver le premier utilisateur admin/vendeur actif de la boutique
    const createur = await prisma.user.findFirst({
      where: {
        boutiqueId,
        actif: true,
        role: { in: ["ADMIN", "VENDEUR"] },
      },
      orderBy: { createdAt: "asc" },
    });
    if (!createur) {
      return res.status(500).json({ error: "Configuration boutique incorrecte" });
    }

    // Préparer les items avec prix actuels
    const itemsForCalc = data.items.map((item) => {
      const piece = pieces.find((p) => p.id === item.pieceId)!;
      return {
        pieceId: item.pieceId,
        designation: piece.nom,
        quantite: item.quantite,
        prixUnitaire: Number(piece.prixVente),
        tva: Number(piece.tauxTVA),
        remise: 0,
      };
    });

    const { itemsWithTotals, sousTotal, tvaTotal, total } = computeItemTotals(itemsForCalc);

    // Créer le devis
    const numero = await generateNumero("devis", "D");
    const dateValidite = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const devis = await prisma.devis.create({
      data: {
        numero,
        clientId: client.id,
        createurId: createur.id,
        boutiqueId,
        dateValidite,
        sousTotal,
        remise: 0,
        remisePourcent: 0,
        tva: tvaTotal,
        total,
        statut: "BROUILLON",
        notes: `Commande en ligne — ${data.clientNom} | Tél : ${data.clientTelephone}`,
        items: {
          create: itemsWithTotals.map((item) => ({
            pieceId: item.pieceId,
            designation: item.designation,
            quantite: item.quantite,
            prixUnitaire: item.prixUnitaire,
            remise: 0,
            tva: item.tva,
            total: item.total,
          })),
        },
      },
      select: { id: true, numero: true },
    });

    res.status(201).json({
      success: true,
      numero: devis.numero,
      message: "Votre commande a bien été enregistrée. Nous vous contacterons très prochainement.",
    });
  } catch (error) {
    handleRouteError(res, error, "la création de la commande");
  }
});

// ─── GET /:boutiqueId/mes-commandes?telephone=xxx ─────────────────────────
router.get("/:boutiqueId/mes-commandes", async (req: Request, res: Response) => {
  try {
    const boutique = await getBoutiqueOr404(req.params.boutiqueId, res);
    if (!boutique) return;

    const telephone = (req.query.telephone as string)?.trim();
    if (!telephone || telephone.length < 8) {
      return res.status(400).json({ error: "Numéro de téléphone invalide" });
    }

    const client = await prisma.client.findFirst({
      where: { telephone, boutiqueId: req.params.boutiqueId },
    });

    if (!client) {
      return res.json({ commandes: [], clientNom: null });
    }

    const devis = await prisma.devis.findMany({
      where: { clientId: client.id, boutiqueId: req.params.boutiqueId },
      select: {
        id: true,
        numero: true,
        dateDevis: true,
        statut: true,
        total: true,
        notes: true,
        items: {
          select: {
            designation: true,
            quantite: true,
            prixUnitaire: true,
            total: true,
          },
        },
      },
      orderBy: { dateDevis: "desc" },
    });

    res.json({
      clientNom: client.nom,
      commandes: devis.map((d) => ({
        ...d,
        total: Number(d.total),
        items: d.items.map((i) => ({
          ...i,
          prixUnitaire: Number(i.prixUnitaire),
          total: Number(i.total),
        })),
      })),
    });
  } catch (error) {
    handleRouteError(res, error, "la récupération des commandes");
  }
});

export default router;
