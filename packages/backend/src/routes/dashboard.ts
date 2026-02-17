import { Router } from "express";
import { prisma } from "../index.js";
import { authenticate, AuthRequest, requireNonSuperAdmin } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { serializePiece, serializeFacture } from "../utils/decimal.js";
import { handleRouteError } from "../utils/handleError.js";

const router = Router();

// Multi-boutique dashboard (super admin only - DOIT être défini AVANT operationalRouter)
router.get("/multi-boutique", authenticate, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    if (authReq.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Accès réservé au super administrateur" });
    }

    const boutiques = await prisma.boutique.findMany({
      where: { actif: true },
      select: { id: true, nom: true, ville: true },
    });

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const statutsValides = ["PAYEE", "EN_ATTENTE", "PARTIELLEMENT_PAYEE"] as const;

    const result = await Promise.all(
      boutiques.map(async (boutique) => {
        const bId = boutique.id;

        // Stats de base
        const [totalPieces, todayFactures, monthFactures, allPieces] = await Promise.all([
          prisma.piece.count({ where: { actif: true, boutiqueId: bId } }),
          prisma.facture.findMany({
            where: { dateFacture: { gte: today }, statut: { in: [...statutsValides] }, boutiqueId: bId },
          }),
          prisma.facture.findMany({
            where: { dateFacture: { gte: firstDayOfMonth }, statut: { in: [...statutsValides] }, boutiqueId: bId },
          }),
          prisma.piece.findMany({
            where: { actif: true, boutiqueId: bId },
            select: { stock: true, prixVente: true, prixAchat: true },
          }),
        ]);

        const todaySales = todayFactures.reduce((sum, f) => sum + Number(f.total), 0);
        const monthlySales = monthFactures.reduce((sum, f) => sum + Number(f.total), 0);
        const stockValue = allPieces.reduce((sum, p) => sum + p.stock * Number(p.prixAchat || p.prixVente), 0);
        const facturesCount = monthFactures.length;

        // Ventes 12 derniers mois
        const salesChart = [];
        for (let i = 11; i >= 0; i--) {
          const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

          const factures = await prisma.facture.findMany({
            where: { dateFacture: { gte: start, lte: end }, statut: { in: [...statutsValides] }, boutiqueId: bId },
          });

          salesChart.push({
            mois: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
            ventes: Math.round(factures.reduce((sum, f) => sum + Number(f.total), 0)),
            count: factures.length,
          });
        }

        return {
          id: boutique.id,
          nom: boutique.nom,
          ville: boutique.ville,
          todaySales: Math.round(todaySales * 100) / 100,
          monthlySales: Math.round(monthlySales * 100) / 100,
          stockValue: Math.round(stockValue * 100) / 100,
          totalPieces,
          facturesCount,
          salesChart,
        };
      }),
    );

    // Totaux globaux
    const totals = {
      todaySales: Math.round(result.reduce((sum, b) => sum + b.todaySales, 0) * 100) / 100,
      monthlySales: Math.round(result.reduce((sum, b) => sum + b.monthlySales, 0) * 100) / 100,
      stockValue: Math.round(result.reduce((sum, b) => sum + b.stockValue, 0) * 100) / 100,
      totalPieces: result.reduce((sum, b) => sum + b.totalPieces, 0),
      facturesCount: result.reduce((sum, b) => sum + b.facturesCount, 0),
    };

    res.json({ boutiques: result, totals });
  } catch (error) {
    handleRouteError(res, error, "la récupération des statistiques multi-boutique");
  }
});

// Routes opérationnelles (bloquées pour super admin)
const operationalRouter = Router();
operationalRouter.use(authenticate, injectBoutique, requireNonSuperAdmin);

// Get dashboard statistics
operationalRouter.get("/stats", async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;
    const totalPieces = await prisma.piece.count({ where: { actif: true, boutiqueId } });

    const allPieces = await prisma.piece.findMany({
      where: { actif: true, boutiqueId },
      select: { stock: true, stockMin: true, prixVente: true, prixAchat: true },
    });

    const lowStockCount = allPieces.filter((p) => p.stock <= p.stockMin && p.stock > 0).length;
    const outOfStockCount = allPieces.filter((p) => p.stock === 0).length;
    const stockValue = allPieces.reduce((sum, p) => sum + p.stock * Number(p.prixAchat || p.prixVente), 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentMouvements = await prisma.mouvementStock.count({ where: { date: { gte: thirtyDaysAgo }, boutiqueId } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayFactures = await prisma.facture.findMany({
      where: { dateFacture: { gte: today }, statut: { in: ["PAYEE", "EN_ATTENTE", "PARTIELLEMENT_PAYEE"] }, boutiqueId },
    });
    const todaySales = todayFactures.reduce((sum, f) => sum + Number(f.total), 0);

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const monthFactures = await prisma.facture.findMany({
      where: { dateFacture: { gte: firstDayOfMonth }, statut: { in: ["PAYEE", "EN_ATTENTE", "PARTIELLEMENT_PAYEE"] }, boutiqueId },
    });
    const monthlySales = monthFactures.reduce((sum, f) => sum + Number(f.total), 0);

    res.json({
      totalPieces,
      lowStockCount,
      outOfStockCount,
      stockValue: Math.round(stockValue * 100) / 100,
      recentMouvements,
      todaySales: Math.round(todaySales * 100) / 100,
      monthlySales: Math.round(monthlySales * 100) / 100,
    });
  } catch (error) {
    handleRouteError(res, error, "la récupération des statistiques");
  }
});

// Get recent items
operationalRouter.get("/recent", async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;
    const [pieces, factures, mouvements] = await Promise.all([
      prisma.piece.findMany({
        take: 5,
        where: { boutiqueId },
        orderBy: { createdAt: "desc" },
        include: { marque: true, categorie: true, emplacement: true },
      }),
      prisma.facture.findMany({
        take: 5,
        where: { boutiqueId },
        orderBy: { dateFacture: "desc" },
        include: { client: true },
      }),
      prisma.mouvementStock.findMany({
        take: 10,
        where: { boutiqueId },
        orderBy: { date: "desc" },
        include: {
          piece: { select: { nom: true, reference: true } },
          user: { select: { nom: true, prenom: true } },
        },
      }),
    ]);

    res.json({
      pieces: pieces.map(serializePiece),
      factures: factures.map(serializeFacture),
      mouvements,
    });
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Get low stock items
operationalRouter.get("/low-stock", async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;
    const pieces = await prisma.piece.findMany({
      where: { actif: true, boutiqueId },
      include: { marque: true, categorie: true, fournisseur: true, emplacement: true },
    });

    const lowStock = pieces
      .filter((p) => p.stock <= p.stockMin)
      .map(serializePiece)
      .sort((a, b) => a.stock - b.stock);

    res.json(lowStock);
  } catch (error) {
    handleRouteError(res, error, "la récupération");
  }
});

// Sales chart - monthly sales for the last 12 months
operationalRouter.get("/sales-chart", async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const factures = await prisma.facture.findMany({
        where: { dateFacture: { gte: start, lte: end }, statut: { in: ["PAYEE", "EN_ATTENTE", "PARTIELLEMENT_PAYEE"] }, boutiqueId },
      });

      const ventes = factures.reduce((sum, f) => sum + Number(f.total), 0);

      months.push({
        mois: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
        ventes: Math.round(ventes),
        count: factures.length,
      });
    }

    res.json(months);
  } catch (error) {
    handleRouteError(res, error, "la récupération des ventes");
  }
});

// Top 10 best selling pieces (last 30 days)
operationalRouter.get("/top-pieces", async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const factureItems = await prisma.factureItem.findMany({
      where: {
        facture: { dateFacture: { gte: thirtyDaysAgo }, statut: { in: ["PAYEE", "EN_ATTENTE", "PARTIELLEMENT_PAYEE"] }, boutiqueId },
        pieceId: { not: null },
      },
      include: { piece: { select: { nom: true, reference: true } } },
    });

    const pieceMap = new Map<string, { nom: string; reference: string; quantite: number; total: number }>();
    for (const item of factureItems) {
      if (!item.pieceId || !item.piece) continue;
      const existing = pieceMap.get(item.pieceId);
      if (existing) {
        existing.quantite += item.quantite;
        existing.total += Number(item.total);
      } else {
        pieceMap.set(item.pieceId, {
          nom: item.piece.nom,
          reference: item.piece.reference,
          quantite: item.quantite,
          total: Number(item.total),
        });
      }
    }

    const topPieces = Array.from(pieceMap.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 10)
      .map((p) => ({ ...p, total: Math.round(p.total) }));

    res.json(topPieces);
  } catch (error) {
    handleRouteError(res, error, "la récupération des top pièces");
  }
});

// Stock overview by category
operationalRouter.get("/stock-overview", async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;
    const pieces = await prisma.piece.findMany({
      where: { actif: true, boutiqueId },
      include: { categorie: true },
    });

    const categoryMap = new Map<string, { categorie: string; valeur: number; count: number }>();
    for (const piece of pieces) {
      const catName = piece.categorie?.nom || "Sans catégorie";
      const catId = piece.categorieId || "none";
      const valeur = piece.stock * Number(piece.prixAchat || piece.prixVente);

      const existing = categoryMap.get(catId);
      if (existing) {
        existing.valeur += valeur;
        existing.count += 1;
      } else {
        categoryMap.set(catId, { categorie: catName, valeur, count: 1 });
      }
    }

    const overview = Array.from(categoryMap.values())
      .map((c) => ({ ...c, valeur: Math.round(c.valeur) }))
      .sort((a, b) => b.valeur - a.valeur);

    res.json(overview);
  } catch (error) {
    handleRouteError(res, error, "la récupération de la répartition stock");
  }
});

// Activity summary (last 5 logs)
operationalRouter.get("/activity-summary", async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;
    const logs = await prisma.activityLog.findMany({
      take: 5,
      where: { boutiqueId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { nom: true, prenom: true } } },
    });
    res.json(logs);
  } catch (error) {
    handleRouteError(res, error, "la récupération de l'activité");
  }
});

// Monter les routes opérationnelles
router.use(operationalRouter);

export default router;
