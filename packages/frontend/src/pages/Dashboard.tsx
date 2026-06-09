import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import {
  dashboardApi,
  ventesJournalieresApi,
  DashboardStats,
  SalesChartData,
  VenteJournaliere,
} from "@/lib/api";
import {
  Package,
  AlertCircle,
  DollarSign,
  Loader2,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  ShoppingCart,
  Plus,
  Pencil,
  Trash2,
  Archive,
  Percent,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";

const today        = dayjs().format("YYYY-MM-DD");
const firstOfMonth = dayjs().startOf("month").format("YYYY-MM-DD");

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " Ar";

const formatCurrencyShort = (value: number) => {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "k";
  return value.toString();
};

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const formatMonth = (mois: string) => MOIS_FR[dayjs(mois).month()];
const formatDate  = (d: string) => dayjs(d).format("DD MMM YYYY");

const VENTES_PAGE_SIZE = 8;

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

export default function Dashboard() {
  const { canEdit } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesChart, setSalesChart] = useState<SalesChartData[]>([]);
  const [kpi, setKpi] = useState<{
    ventes: number; achats: number; stockRecu: number; stockParDate: Record<string, number>;
  } | null>(null);
  const [ventesRecentes, setVentesRecentes] = useState<VenteJournaliere[]>([]);
  const [ventePage, setVentePage] = useState(1);
  const [venteSort, setVenteSort] = useState<{ key: "date" | "montant"; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const [ventesTotal, setVentesTotal] = useState(0);
  const [ventesTotalPages, setVentesTotalPages] = useState(1);
  const [ventesLoading, setVentesLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showStockValue, setShowStockValue] = useState(false);
  const [dateDebut, setDateDebut] = useState(firstOfMonth);
  const [dateFin, setDateFin] = useState(today);

  // Dialog saisie vente
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editingVente, setEditingVente] = useState<VenteJournaliere | null>(null);
  const [form, setForm]   = useState({ montant: "", date: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const loadKpi = async (debut: string, fin: string) => {
    const data = await dashboardApi.getKpi({ dateDebut: debut, dateFin: fin }).catch(() => null);
    setKpi(data);
  };

  // Ventes saisies : tri + pagination côté serveur
  const loadVentes = async (page: number, sort: { key: "date" | "montant"; dir: "asc" | "desc" }) => {
    setVentesLoading(true);
    try {
      const res = await ventesJournalieresApi.getPaged({
        page,
        limit: VENTES_PAGE_SIZE,
        sortBy: sort.key,
        sortDir: sort.dir,
      });
      // Si la page est devenue vide après suppression, on recule d'une page.
      if (res.data.length === 0 && page > 1) {
        setVentePage(page - 1);
        return;
      }
      setVentesRecentes(res.data);
      setVentesTotal(res.pagination.total);
      setVentesTotalPages(res.pagination.totalPages);
    } catch {
      setVentesRecentes([]);
    } finally {
      setVentesLoading(false);
    }
  };

  const toggleVenteSort = (key: "date" | "montant") => {
    setVentePage(1);
    setVenteSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  };

  const loadData = async () => {
    try {
      const [statsData, sales] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getSalesChart().catch(() => []),
      ]);
      setStats(statsData);
      setSalesChart(sales);
      await loadKpi(dateDebut, dateFin);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (!isLoading) loadKpi(dateDebut, dateFin); }, [dateDebut, dateFin]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadVentes(ventePage, venteSort); }, [ventePage, venteSort]);

  const openCreate = () => {
    setEditingVente(null);
    setForm({ montant: "", date: dayjs().format("YYYY-MM-DD"), notes: "" });
    setDialogOpen(true);
  };
  const openEdit = (v: VenteJournaliere) => {
    setEditingVente(v);
    setForm({ montant: String(v.montant), date: v.date.slice(0, 10), notes: v.notes || "" });
    setDialogOpen(true);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette vente ?")) return;
    await ventesJournalieresApi.delete(id);
    loadData();
    loadVentes(ventePage, venteSort);
  };
  const handleSave = async () => {
    const montant = parseFloat(form.montant);
    if (!montant || montant <= 0) return;
    setSaving(true);
    try {
      if (editingVente) {
        await ventesJournalieresApi.update(editingVente.id, { montant, date: form.date, notes: form.notes });
      } else {
        await ventesJournalieresApi.create({ montant, date: form.date, notes: form.notes });
      }
      setDialogOpen(false);
      loadData();
      if (editingVente) {
        loadVentes(ventePage, venteSort);
      } else {
        // Nouvelle vente : on revient en page 1 pour la voir.
        setVentePage(1);
        loadVentes(1, venteSort);
      }
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const ventesMontant   = kpi?.ventes   ?? 0;
  const achatsMontant   = kpi?.achats   ?? 0;
  const stockRecuMontant = kpi?.stockRecu ?? 0;
  const marge           = ventesMontant - achatsMontant;
  const periodeLabel    = dateDebut === dateFin ? dateDebut : `${dateDebut} → ${dateFin}`;

  const stockParDateEntries = Object.entries(kpi?.stockParDate ?? {})
    .map(([date, valeur]) => ({ date, valeur: Math.round(valeur) }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const salesChartFormatted = salesChart.map((d) => ({ ...d, moisLabel: formatMonth(d.mois) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de votre activité</p>
      </div>

      {/* ── Ligne 1 : stats stock (toujours visibles) ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">Références</span>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{stats?.totalPieces ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">pièces actives</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">Valeur stock</span>
            <button onClick={() => setShowStockValue(!showStockValue)} className="text-muted-foreground hover:text-foreground">
              {showStockValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-2xl font-bold">
            {showStockValue ? formatCurrency(stats?.stockValue ?? 0) : "••••••"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">au prix d'achat</p>
        </Card>

        <Card className="p-4 ring-1 ring-primary/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">Marge moyenne</span>
            <Percent className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">
            {stats?.margePct != null ? `${stats.margePct.toFixed(1).replace(".", ",")} %` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stats?.margePct != null
              ? `catalogue · ${stats.margePiecesCount} pièce${(stats.margePiecesCount ?? 0) > 1 ? "s" : ""} avec coût`
              : "renseignez le prix d'achat"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">Stock faible</span>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-500">{stats?.lowStockCount ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{stats?.outOfStockCount ?? 0} en rupture</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">Ventes du mois</span>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.monthlySales ?? 0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Aujourd'hui : {formatCurrency(stats?.todaySales ?? 0)}</p>
        </Card>
      </div>

      {/* ── Analyse financière (filtre + KPIs + saisies) ── */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Analyse financière</CardTitle>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Du</Label>
                <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="h-8 w-36 text-sm" />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Au</Label>
                <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="h-8 w-36 text-sm" />
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setDateDebut(today); setDateFin(today); }}>Aujourd'hui</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setDateDebut(firstOfMonth); setDateFin(today); }}>Ce mois</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setDateDebut(dayjs().startOf("year").format("YYYY-MM-DD")); setDateFin(today); }}>Cette année</Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* KPI grid 2×2 */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {/* Ventes */}
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Ventes</span>
                </div>
                {canEdit && (
                  <button onClick={openCreate} className="text-green-600 hover:text-green-800 transition-colors" title="Ajouter une vente">
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(ventesMontant)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{periodeLabel}</p>
            </div>

            {/* Achats */}
            <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/20 p-4">
              <div className="flex items-center gap-1.5 text-orange-700 dark:text-orange-400 mb-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs font-medium">Achats fournisseurs</span>
              </div>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{formatCurrency(achatsMontant)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{periodeLabel}</p>
            </div>

            {/* Stock reçu */}
            <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/20 p-4">
              <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 mb-2">
                <Archive className="h-4 w-4" />
                <span className="text-xs font-medium">Stock reçu</span>
              </div>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{formatCurrency(stockRecuMontant)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">valeur articles reçus</p>
            </div>

            {/* Marge */}
            <div className={`rounded-lg border p-4 ${marge >= 0 ? "bg-orange-50 dark:bg-orange-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
              <div className={`flex items-center gap-1.5 mb-2 ${marge >= 0 ? "text-orange-700 dark:text-orange-400" : "text-red-700 dark:text-red-400"}`}>
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs font-medium">Marge brute</span>
              </div>
              <p className={`text-xl font-bold ${marge >= 0 ? "text-orange-700 dark:text-orange-400" : "text-red-700 dark:text-red-400"}`}>
                {marge >= 0 ? "+" : ""}{formatCurrency(marge)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{periodeLabel}</p>
            </div>
          </div>

          {/* Stock reçu — détail par date (si données) */}
          {stockParDateEntries.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Détail stock reçu par jour</p>
              <div className="divide-y rounded-md border overflow-hidden">
                {stockParDateEntries.slice(0, 6).map(({ date, valeur }) => (
                  <div key={date} className="flex items-center justify-between px-3 py-2 bg-background hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span className="text-sm text-muted-foreground">{formatDate(date)}</span>
                    <span className="text-sm font-medium text-purple-700">{formatCurrency(valeur)}</span>
                  </div>
                ))}
                {stockParDateEntries.length > 6 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground text-center bg-slate-50 dark:bg-slate-800/30">
                    + {stockParDateEntries.length - 6} autre(s) jour(s)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ventes journalières récentes — tableau triable + pagination serveur */}
          {(ventesTotal > 0 || ventesRecentes.length > 0) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Dernières ventes saisies</p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-muted-foreground">
                      <th className="text-left font-medium px-3 py-2">
                        <button onClick={() => toggleVenteSort("montant")} className="inline-flex items-center gap-1 hover:text-foreground">
                          Montant <SortIcon active={venteSort.key === "montant"} dir={venteSort.dir} />
                        </button>
                      </th>
                      <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">Notes</th>
                      <th className="text-right font-medium px-3 py-2">
                        <button onClick={() => toggleVenteSort("date")} className="inline-flex items-center gap-1 hover:text-foreground">
                          Date <SortIcon active={venteSort.key === "date"} dir={venteSort.dir} />
                        </button>
                      </th>
                      {canEdit && <th className="w-16 px-3 py-2" aria-label="actions" />}
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-opacity ${ventesLoading ? "opacity-50" : ""}`}>
                    {ventesRecentes.map((v) => (
                      <tr key={v.id} className="bg-background hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                        <td className="px-3 py-2 font-medium text-green-700 whitespace-nowrap">{formatCurrency(v.montant)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{v.notes || "—"}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">{formatDate(v.date)}</td>
                        {canEdit && (
                          <td className="px-3 py-2">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(v)} className="text-muted-foreground hover:text-orange-600">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDelete(v.id)} className="text-muted-foreground hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {ventesRecentes.length === 0 && (
                      <tr>
                        <td colSpan={canEdit ? 4 : 3} className="px-3 py-6 text-center text-muted-foreground">
                          Aucune vente
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{ventesTotal} vente{ventesTotal > 1 ? "s" : ""} au total</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={ventePage <= 1 || ventesLoading}
                    onClick={() => setVentePage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center px-2 py-1 rounded border disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span>Page {ventePage} / {ventesTotalPages}</span>
                  <button
                    disabled={ventePage >= ventesTotalPages || ventesLoading}
                    onClick={() => setVentePage((p) => Math.min(ventesTotalPages, p + 1))}
                    className="inline-flex items-center px-2 py-1 rounded border disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    aria-label="Page suivante"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Graphique 12 mois ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ventes & Achats — 12 derniers mois</CardTitle>
        </CardHeader>
        <CardContent>
          {salesChartFormatted.some((d) => d.ventes > 0 || d.achats > 0) ? (
            <>
              <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-500" />Ventes</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-400" />Achats</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={salesChartFormatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="moisLabel" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} width={48} />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value)), name === "ventes" ? "Ventes" : "Achats"]}
                    labelFormatter={(label) => `Mois : ${label}`}
                    contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                  />
                  <Bar dataKey="ventes" fill="#3b82f6" radius={[3, 3, 0, 0]} name="ventes" maxBarSize={32} />
                  <Bar dataKey="achats" fill="#fb923c" radius={[3, 3, 0, 0]} name="achats" maxBarSize={32} />
                </ComposedChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
              Aucune donnée sur les 12 derniers mois
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog saisie vente journalière */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVente ? "Modifier la vente" : "Saisir une vente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Montant (Ar) *</Label>
              <Input
                type="number"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                placeholder="Ex: 150000"
                autoFocus
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Notes (optionnel)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex: vente du marché, client particulier..."
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving || !form.montant}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingVente ? "Modifier" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
