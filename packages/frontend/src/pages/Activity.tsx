import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Clock,
  Package,
  FileText,
  ShoppingCart,
  Users,
  BarChart3,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Download,
  RefreshCw
} from "lucide-react";
import { activityApi, ActivityLog } from "@/lib/api";

const ENTITY_OPTIONS = [
  { value: "", label: "Toutes les entités" },
  { value: "PIECE", label: "Pièces" },
  { value: "FACTURE", label: "Factures" },
  { value: "ACHAT", label: "Achats" },
  { value: "MOUVEMENT", label: "Mouvements" },
  { value: "USER", label: "Utilisateurs" }
];

const PAGE_SIZE = 25;

export default function Activity() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [entityFilter, setEntityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadLogs = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      const newOffset = reset ? 0 : offset;
      const data = await activityApi.getAll({
        entity: entityFilter || undefined,
        limit: PAGE_SIZE,
        offset: newOffset
      });
      if (reset) {
        setLogs(data.logs);
      } else {
        setLogs(prev => [...prev, ...data.logs]);
      }
      setTotal(data.total);
      if (!reset) setOffset(newOffset + PAGE_SIZE);
    } catch (error) {
      console.error("Erreur chargement activité:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadLogs(true);
  }, [entityFilter]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge variant="success" className="gap-1"><Plus className="h-3 w-3" />Création</Badge>;
      case "UPDATE":
        return <Badge variant="default" className="gap-1"><Pencil className="h-3 w-3" />Modification</Badge>;
      case "DELETE":
        return <Badge variant="destructive" className="gap-1"><Trash2 className="h-3 w-3" />Suppression</Badge>;
      case "STATUS_CHANGE":
        return <Badge variant="warning" className="gap-1"><ArrowRightLeft className="h-3 w-3" />Statut</Badge>;
      case "STOCK_ADJUST":
        return <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3" />Stock</Badge>;
      case "EXPORT":
        return <Badge variant="secondary" className="gap-1"><Download className="h-3 w-3" />Export</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case "PIECE":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "FACTURE":
        return <FileText className="h-4 w-4 text-green-500" />;
      case "ACHAT":
        return <ShoppingCart className="h-4 w-4 text-orange-500" />;
      case "MOUVEMENT":
        return <BarChart3 className="h-4 w-4 text-cyan-500" />;
      case "USER":
        return <Users className="h-4 w-4 text-rose-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  const getEntityLabel = (entity: string) => {
    switch (entity) {
      case "PIECE": return "Pièce";
      case "FACTURE": return "Facture";
      case "ACHAT": return "Achat";
      case "MOUVEMENT": return "Mouvement";
      case "USER": return "Utilisateur";
      default: return entity;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historique d'activité</h1>
        <p className="text-muted-foreground">Suivi de toutes les actions effectuées sur la plateforme</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        {ENTITY_OPTIONS.map(option => (
          <Button
            key={option.value}
            variant={entityFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setEntityFilter(option.value)}
          >
            {option.value && getEntityIcon(option.value)}
            <span className={option.value ? "ml-1" : ""}>{option.label}</span>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activité récente
          </CardTitle>
          <CardDescription>{total} action{total > 1 ? "s" : ""} enregistrée{total > 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune activité enregistrée</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="mt-0.5">
                    {getEntityIcon(log.entity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getActionBadge(log.action)}
                      <Badge variant="outline">{getEntityLabel(log.entity)}</Badge>
                    </div>
                    {log.details && (
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{log.details}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="font-medium">
                        {log.user?.prenom ? `${log.user.prenom} ${log.user.nom}` : log.user?.nom || "Système"}
                      </span>
                      <span title={formatFullDate(log.createdAt)}>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {logs.length < total && (
            <div className="text-center mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setOffset(prev => prev || PAGE_SIZE);
                  loadLogs(false);
                }}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Charger plus
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
