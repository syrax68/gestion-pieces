import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  dashboardApi,
  DashboardStats,
  Piece,
  Facture,
  MouvementStock,
  SalesChartData,
  TopPieceData,
  StockOverviewData,
  ActivityLog,
} from "@/lib/api";
import {
  Package,
  AlertCircle,
  DollarSign,
  FileText,
  Loader2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  TrendingUp,
  Clock,
  Pencil,
  Plus,
  Trash2,
  ArrowRightLeft,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from "recharts";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentData, setRecentData] = useState<{
    pieces: Piece[];
    factures: Facture[];
    mouvements: MouvementStock[];
  } | null>(null);
  const [lowStock, setLowStock] = useState<Piece[]>([]);
  const [salesChart, setSalesChart] = useState<SalesChartData[]>([]);
  const [topPieces, setTopPieces] = useState<TopPieceData[]>([]);
  const [stockOverview, setStockOverview] = useState<StockOverviewData[]>([]);
  const [activitySummary, setActivitySummary] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showStockValue, setShowStockValue] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, recent, lowStockData, sales, top, overview, activity] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getRecent(),
          dashboardApi.getLowStock(),
          dashboardApi.getSalesChart().catch(() => []),
          dashboardApi.getTopPieces().catch(() => []),
          dashboardApi.getStockOverview().catch(() => []),
          dashboardApi.getActivitySummary().catch(() => []),
        ]);
        setStats(statsData);
        setRecentData(recent);
        setLowStock(lowStockData);
        setSalesChart(sales);
        setTopPieces(top);
        setStockOverview(overview);
        setActivitySummary(activity);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR").format(value) + " Fmg";
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
    if (value >= 1_000) return (value / 1_000).toFixed(0) + "k";
    return value.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "À l'instant";
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString("fr-FR");
  };

  const formatMonth = (mois: string) => {
    const [, month] = mois.split("-");
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    return months[parseInt(month) - 1];
  };

  const getMouvementIcon = (type: string) => {
    switch (type) {
      case "ENTREE":
        return <ArrowDown className="h-4 w-4 text-green-500" />;
      case "SORTIE":
        return <ArrowUp className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getMouvementBadge = (type: string) => {
    switch (type) {
      case "ENTREE":
        return <Badge variant="success">Entrée</Badge>;
      case "SORTIE":
        return <Badge variant="danger">Sortie</Badge>;
      default:
        return <Badge variant="default">Ajustement</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Plus className="h-3.5 w-3.5 text-green-500" />;
      case "UPDATE":
        return <Pencil className="h-3.5 w-3.5 text-blue-500" />;
      case "DELETE":
        return <Trash2 className="h-3.5 w-3.5 text-red-500" />;
      case "STATUS_CHANGE":
        return <ArrowRightLeft className="h-3.5 w-3.5 text-yellow-500" />;
      case "STOCK_ADJUST":
        return <RefreshCw className="h-3.5 w-3.5 text-purple-500" />;
      case "EXPORT":
        return <Download className="h-3.5 w-3.5 text-cyan-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  const salesChartFormatted = salesChart.map((d) => ({
    ...d,
    moisLabel: formatMonth(d.mois),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre stock de pièces moto</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pièces</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPieces || 0}</div>
            <p className="text-xs text-muted-foreground">Références en catalogue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{showStockValue ? formatCurrency(stats?.stockValue || 0) : "••••••••"}</div>
              <button
                onClick={() => setShowStockValue(!showStockValue)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {showStockValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Valeur totale au prix d'achat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Faible</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats?.lowStockCount || 0}</div>
            <p className="text-xs text-muted-foreground">dont {stats?.outOfStockCount || 0} en rupture</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes du mois</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.monthlySales || 0)}</div>
            <p className="text-xs text-muted-foreground">Aujourd'hui: {formatCurrency(stats?.todaySales || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Ventes mensuelles */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ventes mensuelles
            </CardTitle>
            <CardDescription>Chiffre d'affaires des 12 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            {salesChartFormatted.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={salesChartFormatted}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="moisLabel" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value)), name === "ventes" ? "Ventes" : "Tendance"]}
                    labelFormatter={(label) => `Mois: ${label}`}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="ventes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="ventes"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: "#f59e0b", r: 4 }}
                    activeDot={{ r: 6 }}
                    name="tendance"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Aucune donnée de ventes</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Top pièces + Activité récente */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 pièces vendues</CardTitle>
            <CardDescription>Pièces les plus vendues (30 derniers jours)</CardDescription>
          </CardHeader>
          <CardContent>
            {topPieces.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topPieces} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="nom" type="category" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "quantite" ? `${value} unités` : formatCurrency(Number(value)),
                      name === "quantite" ? "Quantité" : "Total",
                    ]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="quantite" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Aucune vente récente</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activité récente
            </CardTitle>
            <CardDescription>Dernières actions sur la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            {activitySummary.length > 0 ? (
              <div className="space-y-3">
                {activitySummary.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                    <div className="mt-0.5">{getActionIcon(log.action)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{log.details || `${log.action} ${log.entity}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.user?.prenom ? `${log.user.prenom} ${log.user.nom}` : log.user?.nom || "Système"}
                        {" — "}
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <Link to="/activite" className="block text-center text-sm text-blue-600 hover:text-blue-800 mt-2">
                  Voir tout l'historique
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Aucune activité</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Mouvements + Factures + Stock faible */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Derniers mouvements</CardTitle>
            <CardDescription>Activité récente du stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentData?.mouvements && recentData.mouvements.length > 0 ? (
                recentData.mouvements.slice(0, 5).map((mvt) => (
                  <div key={mvt.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getMouvementIcon(mvt.type)}
                      <div>
                        <p className="text-sm font-medium">{mvt.piece?.nom || "Pièce"}</p>
                        <p className="text-xs text-muted-foreground">{mvt.motif}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getMouvementBadge(mvt.type)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {mvt.quantite} unité{mvt.quantite > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Aucun mouvement récent</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernières factures</CardTitle>
            <CardDescription>Ventes récentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentData?.factures && recentData.factures.length > 0 ? (
                recentData.factures.map((facture) => (
                  <div key={facture.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{facture.numero}</p>
                      <p className="text-xs text-muted-foreground">
                        {facture.client?.nom || "Client"} - {formatDate(facture.dateFacture)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(facture.total)}</p>
                      <Badge variant={facture.statut === "PAYEE" ? "success" : facture.statut === "ANNULEE" ? "destructive" : "warning"}>
                        {facture.statut === "PAYEE" ? "Payée" : facture.statut === "ANNULEE" ? "Annulée" : "En attente"}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Aucune facture</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock faible</CardTitle>
            <CardDescription>Pièces nécessitant un réapprovisionnement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStock.length > 0 ? (
                lowStock.slice(0, 5).map((piece) => (
                  <Link
                    key={piece.id}
                    to={`/pieces/${piece.id}`}
                    className="flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded -mx-2"
                  >
                    <p className="text-sm">{piece.nom}</p>
                    <Badge variant={piece.stock === 0 ? "destructive" : "warning"}>
                      {piece.stock} / {piece.stockMin}
                    </Badge>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Tous les stocks sont suffisants</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Pièces récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Pièces récemment ajoutées</CardTitle>
          <CardDescription>Les dernières pièces ajoutées au catalogue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentData?.pieces && recentData.pieces.length > 0 ? (
              recentData.pieces.map((piece) => (
                <Link
                  key={piece.id}
                  to={`/pieces/${piece.id}`}
                  className="flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded -mx-2"
                >
                  <div>
                    <p className="text-sm font-medium">{piece.nom}</p>
                    <p className="text-xs text-muted-foreground">{piece.reference}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(piece.createdAt)}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Aucune pièce</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
