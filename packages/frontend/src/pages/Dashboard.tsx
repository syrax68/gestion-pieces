import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  dashboardApi,
  DashboardStats,
  SalesChartData,
} from "@/lib/api";
import {
  Package,
  AlertCircle,
  DollarSign,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  ShoppingCart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesChart, setSalesChart] = useState<SalesChartData[]>([]);
  const [kpi, setKpi] = useState<{
    ventes: { jour: number; semaine: number; mois: number; annee: number };
    achats: { jour: number; semaine: number; mois: number; annee: number };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showStockValue, setShowStockValue] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, sales, kpiData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getSalesChart().catch(() => []),
          dashboardApi.getKpi().catch(() => null),
        ]);
        setStats(statsData);
        setSalesChart(sales);
        setKpi(kpiData);
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
    return new Intl.NumberFormat("fr-FR").format(value) + " Ar";
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
    if (value >= 1_000) return (value / 1_000).toFixed(0) + "k";
    return value.toString();
  };

  const formatMonth = (mois: string) => {
    const [, month] = mois.split("-");
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    return months[parseInt(month) - 1];
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

      {/* KPI Ventes + Achats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              KPI Ventes
            </CardTitle>
            <CardDescription>Chiffre d'affaires par période (factures)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
                <p className="text-xs text-muted-foreground mb-1">Aujourd'hui</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(kpi?.ventes.jour || 0)}</p>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
                <p className="text-xs text-muted-foreground mb-1">Cette semaine</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(kpi?.ventes.semaine || 0)}</p>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
                <p className="text-xs text-muted-foreground mb-1">Ce mois</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(kpi?.ventes.mois || 0)}</p>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
                <p className="text-xs text-muted-foreground mb-1">Cette année</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(kpi?.ventes.annee || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
              KPI Achats fournisseurs
            </CardTitle>
            <CardDescription>Dépenses par période (achats fournisseurs)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-4">
                <p className="text-xs text-muted-foreground mb-1">Aujourd'hui</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{formatCurrency(kpi?.achats.jour || 0)}</p>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-4">
                <p className="text-xs text-muted-foreground mb-1">Cette semaine</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{formatCurrency(kpi?.achats.semaine || 0)}</p>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-4">
                <p className="text-xs text-muted-foreground mb-1">Ce mois</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{formatCurrency(kpi?.achats.mois || 0)}</p>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-4">
                <p className="text-xs text-muted-foreground mb-1">Cette année</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{formatCurrency(kpi?.achats.annee || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Marge brute */}
      {kpi && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-blue-600" />
              Marge brute
            </CardTitle>
            <CardDescription>Ventes − Achats fournisseurs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["jour", "semaine", "mois", "annee"] as const).map((periode) => {
                const marge = (kpi.ventes[periode] || 0) - (kpi.achats[periode] || 0);
                const isPositive = marge >= 0;
                return (
                  <div key={periode} className={`rounded-lg p-4 ${isPositive ? "bg-blue-50 dark:bg-blue-950" : "bg-red-50 dark:bg-red-950"}`}>
                    <p className="text-xs text-muted-foreground mb-1 capitalize">
                      {periode === "jour" ? "Aujourd'hui" : periode === "semaine" ? "Cette semaine" : periode === "mois" ? "Ce mois" : "Cette année"}
                    </p>
                    <p className={`text-xl font-bold ${isPositive ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"}`}>
                      {isPositive ? "+" : ""}{formatCurrency(marge)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ventes mensuelles */}
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
  );
}
