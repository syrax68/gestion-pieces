import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { dashboardApi, MultiBoutiqueData, BoutiqueStats } from "@/lib/api";
import { Loader2, Store, TrendingUp, DollarSign, Package, FileText, Eye, EyeOff } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export default function DashboardMultiBoutique() {
  const [data, setData] = useState<MultiBoutiqueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showValues, setShowValues] = useState(false);

  useEffect(() => {
    dashboardApi
      .getMultiBoutique()
      .then(setData)
      .catch((err) => setError(err.message || "Erreur de chargement"))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data || data.boutiques.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Aucune boutique active</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat("fr-FR").format(value) + " Fmg";

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

  const maskedValue = (value: number) => (showValues ? formatCurrency(value) : "••••••••");

  // Préparer données comparatives (12 mois) pour toutes les boutiques
  const comparisonChartData =
    data.boutiques[0]?.salesChart.map((_, idx) => {
      const entry: Record<string, string | number> = {
        mois: formatMonth(data.boutiques[0].salesChart[idx].mois),
      };
      let total = 0;
      for (const boutique of data.boutiques) {
        const ventes = boutique.salesChart[idx]?.ventes || 0;
        entry[boutique.nom] = ventes;
        total += ventes;
      }
      entry["Total"] = total;
      return entry;
    }) || [];

  // Classement par CA mensuel
  const ranked = [...data.boutiques].sort((a, b) => b.monthlySales - a.monthlySales);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Store className="h-8 w-8" />
            Dashboard Multi-Boutiques
          </h1>
          <p className="text-muted-foreground">
            Comparaison du chiffre d'affaires de {data.boutiques.length} boutique{data.boutiques.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowValues(!showValues)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border rounded-md px-3 py-2"
        >
          {showValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showValues ? "Masquer" : "Afficher"}
        </button>
      </div>

      {/* Totaux globaux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">CA du mois (global)</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{maskedValue(data.totals.monthlySales)}</div>
            <p className="text-xs text-green-600 mt-1">Performance globale</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes du jour</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maskedValue(data.totals.todaySales)}</div>
            <p className="text-xs text-muted-foreground mt-1">Toutes boutiques</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur stock totale</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maskedValue(data.totals.stockValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Inventaire global</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total pièces</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals.totalPieces}</div>
            <p className="text-xs text-muted-foreground mt-1">Tous catalogues</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures du mois</CardTitle>
            <FileText className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals.facturesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Toutes boutiques</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique comparatif 12 mois */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Comparaison CA - 12 derniers mois
          </CardTitle>
          <CardDescription>Chiffre d'affaires par boutique</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={comparisonChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
              <Legend />
              {data.boutiques.map((boutique, idx) => (
                <Bar key={boutique.id} dataKey={boutique.nom} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} stackId="stack" />
              ))}
              {data.boutiques.length > 1 && (
                <Line type="monotone" dataKey="Total" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 3 }} name="Total" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Classement boutiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Classement par CA du mois
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ranked.map((boutique, idx) => (
              <BoutiqueRow
                key={boutique.id}
                boutique={boutique}
                rank={idx + 1}
                maxSales={ranked[0]?.monthlySales || 1}
                color={COLORS[data.boutiques.findIndex((b) => b.id === boutique.id) % COLORS.length]}
                showValues={showValues}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cartes individuelles par boutique */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Store className="h-6 w-6" />
          Détails par boutique
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.boutiques.map((boutique, idx) => (
            <Card key={boutique.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    {boutique.nom}
                  </CardTitle>
                  {boutique.ville && <Badge variant="secondary">{boutique.ville}</Badge>}
                </div>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Package className="h-4 w-4" />
                  {boutique.totalPieces} pièces en catalogue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 font-medium mb-1">CA du mois</p>
                    <p className="text-lg font-bold text-green-600">{showValues ? formatCurrency(boutique.monthlySales) : "••••••••"}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium mb-1">Aujourd'hui</p>
                    <p className="text-lg font-bold text-blue-600">{showValues ? formatCurrency(boutique.todaySales) : "••••••••"}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700 font-medium mb-1">Valeur stock</p>
                    <p className="text-lg font-bold text-purple-600">{showValues ? formatCurrency(boutique.stockValue) : "••••••••"}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <p className="text-xs text-orange-700 font-medium mb-1">Factures</p>
                    <p className="text-lg font-bold text-orange-600">{boutique.facturesCount}</p>
                  </div>
                </div>

                {/* Mini graphique 12 mois */}
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Évolution 12 mois</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={boutique.salesChart.map((d) => ({ ...d, moisLabel: formatMonth(d.mois) }))}>
                      <XAxis dataKey="moisLabel" tick={{ fontSize: 10 }} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value ?? 0)), "Ventes"]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: 12 }}
                      />
                      <Bar dataKey="ventes" fill={COLORS[idx % COLORS.length]} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function BoutiqueRow({
  boutique,
  rank,
  maxSales,
  color,
  showValues,
  formatCurrency,
}: {
  boutique: BoutiqueStats;
  rank: number;
  maxSales: number;
  color: string;
  showValues: boolean;
  formatCurrency: (v: number) => string;
}) {
  const percentage = maxSales > 0 ? (boutique.monthlySales / maxSales) * 100 : 0;

  return (
    <div className="flex items-center gap-4">
      <div className="w-8 text-center">
        <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
      </div>
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium truncate">
            {boutique.nom}
            {boutique.ville && <span className="text-muted-foreground text-sm ml-2">({boutique.ville})</span>}
          </span>
          <span className="font-bold ml-4 flex-shrink-0">{showValues ? formatCurrency(boutique.monthlySales) : "••••••••"}</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: color }} />
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{boutique.facturesCount} factures</span>
          <span>{boutique.totalPieces} pièces</span>
        </div>
      </div>
    </div>
  );
}
