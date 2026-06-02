import { Router } from "express";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { prisma } from "../index.js";
import { authenticate, AuthRequest, requireNonSuperAdmin } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { serializePiece, serializeFacture } from "../utils/decimal.js";
import { handleRouteError } from "../utils/handleError.js";

dayjs.extend(utc);

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

    const todayStart      = dayjs.utc().startOf("day").toDate();
    const firstDayOfMonth = dayjs.utc().startOf("month").toDate();
    const now             = dayjs.utc();

    const statutsValides = ["PAYEE", "EN_ATTENTE", "PARTIELLEMENT_PAYEE"] as const;

    const result = await Promise.all(
      boutiques.map(async (boutique) => {
        const bId = boutique.id;

        // Stats de base
        const [totalPieces, todayFactures, monthFactures, allPieces] = await Promise.all([
          prisma.piece.count({ where: { actif: true, boutiqueId: bId } }),
          prisma.facture.findMany({
            where: { dateFacture: { gte: todayStart }, statut: { in: [...statutsValides] }, boutiqueId: bId },
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

        // Ventes 12 derniers mois (multi-boutique, source = factures)
        const salesChart = [];
        for (let i = 11; i >= 0; i--) {
          const start   = now.subtract(i, "month").startOf("month").toDate();
          const end     = now.subtract(i, "month").endOf("month").toDate();
          const monthKey = now.subtract(i, "month").format("YYYY-MM");

          const factures = await prisma.facture.findMany({
            where: { dateFacture: { gte: start, lte: end }, statut: { in: [...statutsValides] }, boutiqueId: bId },
          });

          salesChart.push({
            mois: monthKey,
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

    const thirtyDaysAgo = dayjs.utc().subtract(30, "day").toDate();
    const recentMouvements = await prisma.mouvementStock.count({ where: { date: { gte: thirtyDaysAgo }, boutiqueId } });

    const todayStart = dayjs.utc().startOf("day").toDate();
    const firstDayOfMonth = dayjs.utc().startOf("month").toDate();

    const [todayVentes, monthVentes] = await Promise.all([
      prisma.venteJournaliere.findMany({
        where: { boutiqueId, date: { gte: todayStart } },
        select: { montant: true },
      }),
      prisma.venteJournaliere.findMany({
        where: { boutiqueId, date: { gte: firstDayOfMonth } },
        select: { montant: true },
      }),
    ]);

    const todaySales = todayVentes.reduce((sum, v) => sum + Number(v.montant), 0);
    const monthlySales = monthVentes.reduce((sum, v) => sum + Number(v.montant), 0);

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
    const now = dayjs.utc();

    // Borne globale : 1er jour du mois il y a 11 mois → fin du mois courant
    const globalStart = now.subtract(11, "month").startOf("month").toDate();
    const globalEnd   = now.endOf("month").toDate();

    // 2 requêtes globales au lieu de 24 (une par mois)
    const [allVentes, allAchats] = await Promise.all([
      prisma.venteJournaliere.findMany({
        where: { boutiqueId, date: { gte: globalStart, lte: globalEnd } },
        select: { date: true, montant: true },
      }),
      prisma.achat.findMany({
        where: { boutiqueId, dateAchat: { gte: globalStart, lte: globalEnd } },
        select: { dateAchat: true, total: true },
      }),
    ]);

    // Regrouper par mois côté Node.js
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const monthKey = now.subtract(i, "month").format("YYYY-MM");

      const ventes = allVentes
        .filter((v) => dayjs.utc(v.date).format("YYYY-MM") === monthKey)
        .reduce((sum, v) => sum + Number(v.montant), 0);

      const achats = allAchats
        .filter((a) => dayjs.utc(a.dateAchat).format("YYYY-MM") === monthKey)
        .reduce((sum, a) => sum + Number(a.total), 0);

      months.push({
        mois: monthKey,
        ventes: Math.round(ventes),
        achats: Math.round(achats),
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

// KPI ventes + achats sur un range de dates
operationalRouter.get("/kpi", async (req, res) => {
  try {
    const boutiqueId = (req as AuthRequest).boutiqueId;
    const now = new Date();

    const dateDebut = req.query.dateDebut
      ? dayjs.utc(req.query.dateDebut as string).startOf("day").toDate()
      : dayjs.utc().startOf("month").toDate();

    const dateFin = req.query.dateFin
      ? dayjs.utc(req.query.dateFin as string).endOf("day").toDate()
      : dayjs.utc().endOf("month").toDate();

    const [ventesJournalieres, achatsData, achatItems] = await Promise.all([
      prisma.venteJournaliere.findMany({
        where: { boutiqueId, date: { gte: dateDebut, lte: dateFin } },
        select: { montant: true },
      }),
      prisma.achat.findMany({
        where: { boutiqueId, dateAchat: { gte: dateDebut, lte: dateFin } },
        select: { total: true },
      }),
      // AchatItems = stock réellement reçu avec pièces détaillées (achats directs + imports)
      // Exclut les achats annulés et les achats "total seulement" (sans items)
      prisma.achatItem.findMany({
        where: {
          achat: {
            boutiqueId,
            dateAchat: { gte: dateDebut, lte: dateFin },
            statut: { not: "ANNULEE" },
          },
        },
        select: { total: true, quantite: true, prixUnitaire: true, achat: { select: { dateAchat: true } } },
      }),
    ]);

    const totalVentes = Math.round(ventesJournalieres.reduce((s, v) => s + Number(v.montant), 0));
    const totalAchats = Math.round(achatsData.reduce((s, a) => s + Number(a.total), 0));

    // Stock reçu = somme des AchatItems (prix réels payés)
    const totalStockRecu = Math.round(achatItems.reduce((s, i) => s + Number(i.total), 0));

    // Détail par date
    const stockParDate: Record<string, number> = {};
    for (const item of achatItems) {
      const jour = dayjs.utc(item.achat.dateAchat).format("YYYY-MM-DD");
      stockParDate[jour] = (stockParDate[jour] ?? 0) + Number(item.total);
    }

    res.json({ ventes: totalVentes, achats: totalAchats, stockRecu: Math.round(totalStockRecu), stockParDate });
  } catch (error) {
    handleRouteError(res, error, "la récupération des KPI");
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
