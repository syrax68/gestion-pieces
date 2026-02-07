import { Router } from "express";
import { prisma } from "../index.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { logActivity } from "../lib/activityLog.js";
import { exportToXlsx } from "../utils/xlsx.js";
import { buildDateFilter } from "../utils/filters.js";
import { handleRouteError } from "../utils/handleError.js";

const router = Router();

// Export pièces
router.get("/pieces", authenticate, async (req: AuthRequest, res) => {
  try {
    const pieces = await prisma.piece.findMany({
      where: { actif: true },
      include: { marque: true, categorie: true },
      orderBy: { nom: "asc" },
    });

    const data = pieces.map((p) => ({
      Référence: p.reference,
      Nom: p.nom,
      Marque: p.marque?.nom || "-",
      Catégorie: p.categorie?.nom || "-",
      "Prix Achat": p.prixAchat ? Number(p.prixAchat) : "-",
      "Prix Vente": Number(p.prixVente),
      Stock: p.stock,
      "Stock Min": p.stockMin,
      Statut: p.stock === 0 ? "Rupture" : p.stock <= p.stockMin ? "Faible" : "OK",
    }));

    await logActivity(req.user!.userId, "EXPORT", "PIECE", undefined, `Export de ${pieces.length} pièces`);

    exportToXlsx(res, data, "Pièces", `pieces_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    handleRouteError(res, error, "l'export des pièces");
  }
});

// Export factures
router.get("/factures", authenticate, async (req: AuthRequest, res) => {
  try {
    const { from, to } = req.query;
    const where: Record<string, unknown> = {};
    const dateFilter = buildDateFilter(from as string, to as string);
    if (dateFilter) where.dateFacture = dateFilter;

    const factures = await prisma.facture.findMany({
      where,
      include: { client: true, items: true },
      orderBy: { dateFacture: "desc" },
    });

    const data = factures.map((f) => ({
      Numéro: f.numero,
      Date: new Date(f.dateFacture).toLocaleDateString("fr-FR"),
      Client: f.client?.nom || f.client?.entreprise || "-",
      "Sous-total": Number(f.sousTotal),
      TVA: Number(f.tva),
      Total: Number(f.total),
      "Montant Payé": Number(f.montantPaye),
      Statut: f.statut,
      "Méthode Paiement": f.methodePaiement || "-",
      "Nb Articles": f.items.length,
    }));

    await logActivity(req.user!.userId, "EXPORT", "FACTURE", undefined, `Export de ${factures.length} factures`);

    exportToXlsx(res, data, "Factures", `factures_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    handleRouteError(res, error, "l'export des factures");
  }
});

// Export mouvements de stock
router.get("/mouvements", authenticate, async (req: AuthRequest, res) => {
  try {
    const { from, to } = req.query;
    const where: Record<string, unknown> = {};
    const dateFilter = buildDateFilter(from as string, to as string);
    if (dateFilter) where.date = dateFilter;

    const mouvements = await prisma.mouvementStock.findMany({
      where,
      include: {
        piece: { select: { nom: true, reference: true } },
        user: { select: { nom: true, prenom: true } },
      },
      orderBy: { date: "desc" },
    });

    const data = mouvements.map((m) => ({
      Date: new Date(m.date).toLocaleString("fr-FR"),
      Pièce: m.piece.nom,
      Référence: m.piece.reference,
      Type: m.type,
      Quantité: m.quantite,
      "Stock Avant": m.quantiteAvant ?? "-",
      "Stock Après": m.quantiteApres ?? "-",
      Motif: m.motif,
      Utilisateur: m.user ? `${m.user.prenom || ""} ${m.user.nom}`.trim() : "-",
    }));

    await logActivity(req.user!.userId, "EXPORT", "MOUVEMENT", undefined, `Export de ${mouvements.length} mouvements`);

    exportToXlsx(res, data, "Mouvements", `mouvements_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    handleRouteError(res, error, "l'export des mouvements");
  }
});

export default router;
