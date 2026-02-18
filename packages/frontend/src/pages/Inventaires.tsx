import { useState, useEffect, useCallback } from "react";
import { inventairesApi, Inventaire, InventaireItem } from "../lib/api";
import { useToast } from "../components/ui/Toaster";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import {
  ClipboardCheck,
  Plus,
  Eye,
  ArrowLeft,
  Check,
  X,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle,
  MinusCircle,
  Loader2,
} from "lucide-react";

type View = "list" | "detail";

const statutColors: Record<string, "default" | "secondary" | "destructive"> = {
  EN_COURS: "default",
  VALIDE: "secondary",
  ANNULE: "destructive",
};

const statutLabels: Record<string, string> = {
  EN_COURS: "En cours",
  VALIDE: "Validé",
  ANNULE: "Annulé",
};

export default function InventairesPage() {
  const { isAdmin } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [view, setView] = useState<View>("list");
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [currentInventaire, setCurrentInventaire] = useState<Inventaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [searchItem, setSearchItem] = useState("");

  const loadInventaires = useCallback(async () => {
    try {
      setLoading(true);
      const data = await inventairesApi.getAll(filterStatut || undefined);
      setInventaires(data);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [filterStatut, toastError]);

  useEffect(() => {
    loadInventaires();
  }, [loadInventaires]);

  const handleCreate = async () => {
    try {
      setCreating(true);
      const inventaire = await inventairesApi.create({});
      toastSuccess(`Inventaire ${inventaire.numero} créé avec ${inventaire.items.length} pièces`);
      setCurrentInventaire(inventaire);
      setView("detail");
      loadInventaires();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDetail = async (id: string) => {
    try {
      setLoading(true);
      const inventaire = await inventairesApi.getById(id);
      setCurrentInventaire(inventaire);
      setView("detail");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (item: InventaireItem, stockPhysique: number) => {
    if (!currentInventaire) return;
    try {
      const updated = await inventairesApi.updateItem(currentInventaire.id, item.id, {
        stockPhysique,
      });
      setCurrentInventaire((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)),
        };
      });
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur de mise à jour");
    }
  };

  const handleValidate = async () => {
    if (!currentInventaire) return;
    try {
      const updated = await inventairesApi.updateStatus(currentInventaire.id, "VALIDE");
      setCurrentInventaire(updated);
      toastSuccess(`Inventaire ${updated.numero} validé. Stocks mis à jour.`);
      loadInventaires();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur de validation");
    }
  };

  const handleCancel = async () => {
    if (!currentInventaire) return;
    try {
      const updated = await inventairesApi.updateStatus(currentInventaire.id, "ANNULE");
      setCurrentInventaire(updated);
      toastSuccess(`Inventaire ${updated.numero} annulé`);
      loadInventaires();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur d'annulation");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet inventaire ?")) return;
    try {
      await inventairesApi.delete(id);
      toastSuccess("Inventaire supprimé");
      if (view === "detail") {
        setView("list");
        setCurrentInventaire(null);
      }
      loadInventaires();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur de suppression");
    }
  };

  if (view === "detail" && currentInventaire) {
    return (
      <InventaireDetail
        inventaire={currentInventaire}
        searchItem={searchItem}
        setSearchItem={setSearchItem}
        onBack={() => {
          setView("list");
          setCurrentInventaire(null);
          setSearchItem("");
        }}
        onUpdateItem={handleUpdateItem}
        onValidate={handleValidate}
        onCancel={handleCancel}
        onDelete={() => handleDelete(currentInventaire.id)}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventaires</h1>
          <p className="text-muted-foreground">Gestion des inventaires physiques</p>
        </div>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Nouvel inventaire
        </Button>
      </div>

      <div className="flex gap-2">
        {["", "EN_COURS", "VALIDE", "ANNULE"].map((s) => (
          <Button
            key={s}
            variant={filterStatut === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatut(s)}
          >
            {s === "" ? "Tous" : statutLabels[s]}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : inventaires.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Aucun inventaire trouvé</p>
            <p className="text-sm mt-1">Créez un nouvel inventaire pour commencer le comptage</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {inventaires.map((inv) => (
            <Card key={inv.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{inv.numero}</span>
                        <Badge variant={statutColors[inv.statut]}>{statutLabels[inv.statut]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(inv.dateDebut).toLocaleDateString("fr-FR")}
                        {inv.dateFin && ` — ${new Date(inv.dateFin).toLocaleDateString("fr-FR")}`}
                        {" · "}
                        {inv._count?.items || 0} pièces
                        {inv.user && ` · ${inv.user.nom}`}
                      </p>
                      {inv.statut === "VALIDE" && inv.ecartTotal !== 0 && (
                        <p className="text-sm mt-1">
                          Ecart total : <span className={inv.ecartTotal > 0 ? "text-green-600" : "text-red-600"}>{inv.ecartTotal > 0 ? "+" : ""}{inv.ecartTotal}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenDetail(inv.id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      {inv.statut === "EN_COURS" ? "Compter" : "Voir"}
                    </Button>
                    {isAdmin && inv.statut === "EN_COURS" && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(inv.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InventaireDetail({
  inventaire,
  searchItem,
  setSearchItem,
  onBack,
  onUpdateItem,
  onValidate,
  onCancel,
  onDelete,
  isAdmin,
}: {
  inventaire: Inventaire;
  searchItem: string;
  setSearchItem: (v: string) => void;
  onBack: () => void;
  onUpdateItem: (item: InventaireItem, stockPhysique: number) => void;
  onValidate: () => void;
  onCancel: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  const isEnCours = inventaire.statut === "EN_COURS";
  const items = inventaire.items || [];
  const countedItems = items.filter((i) => i.valide);
  const uncountedItems = items.filter((i) => !i.valide);
  const progress = items.length > 0 ? Math.round((countedItems.length / items.length) * 100) : 0;

  const filteredItems = items.filter((item) => {
    if (!searchItem) return true;
    const search = searchItem.toLowerCase();
    return (
      item.piece?.nom?.toLowerCase().includes(search) ||
      item.piece?.reference?.toLowerCase().includes(search)
    );
  });

  const ecartItems = countedItems.filter((i) => i.ecart !== 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{inventaire.numero}</h1>
              <Badge variant={statutColors[inventaire.statut]}>{statutLabels[inventaire.statut]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Débuté le {new Date(inventaire.dateDebut).toLocaleDateString("fr-FR")}
              {inventaire.user && ` par ${inventaire.user.nom}`}
            </p>
          </div>
        </div>

        {isEnCours && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            {isAdmin && (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={onValidate} disabled={countedItems.length === 0}>
              <Check className="mr-2 h-4 w-4" />
              Valider l'inventaire
            </Button>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">Progression</p>
            <p className="text-2xl font-bold">{progress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">Comptés</p>
            <p className="text-2xl font-bold text-green-600">{countedItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">Restants</p>
            <p className="text-2xl font-bold text-orange-600">{uncountedItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">Ecarts</p>
            <p className="text-2xl font-bold text-red-600">{ecartItems.length}</p>
          </CardContent>
        </Card>
      </div>

      {inventaire.notes && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="text-sm">{inventaire.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une pièce..."
          value={searchItem}
          onChange={(e) => setSearchItem(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Articles ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Référence</th>
                  <th className="text-left py-2 px-2">Pièce</th>
                  <th className="text-center py-2 px-2">Stock théorique</th>
                  <th className="text-center py-2 px-2">Stock physique</th>
                  <th className="text-center py-2 px-2">Ecart</th>
                  <th className="text-center py-2 px-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <InventaireItemRow
                    key={item.id}
                    item={item}
                    isEnCours={isEnCours}
                    onUpdate={(stockPhysique) => onUpdateItem(item, stockPhysique)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InventaireItemRow({
  item,
  isEnCours,
  onUpdate,
}: {
  item: InventaireItem;
  isEnCours: boolean;
  onUpdate: (stockPhysique: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.stockPhysique?.toString() ?? "");

  const handleSubmit = () => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    onUpdate(num);
    setEditing(false);
  };

  const ecart = item.ecart;
  const ecartColor = ecart === null ? "" : ecart === 0 ? "text-green-600" : ecart > 0 ? "text-blue-600" : "text-red-600";

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-2 px-2 font-mono text-xs">{item.piece?.reference}</td>
      <td className="py-2 px-2">{item.piece?.nom}</td>
      <td className="py-2 px-2 text-center">{item.stockTheorique}</td>
      <td className="py-2 px-2 text-center">
        {isEnCours ? (
          editing ? (
            <div className="flex items-center gap-1 justify-center">
              <Input
                type="number"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="w-20 h-8 text-center"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleSubmit} className="h-8 w-8 p-0">
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setValue(item.stockPhysique?.toString() ?? item.stockTheorique.toString());
                setEditing(true);
              }}
              className="px-2 py-1 rounded hover:bg-muted min-w-[3rem] inline-block"
            >
              {item.stockPhysique !== null ? item.stockPhysique : "—"}
            </button>
          )
        ) : (
          <span>{item.stockPhysique !== null ? item.stockPhysique : "—"}</span>
        )}
      </td>
      <td className={`py-2 px-2 text-center font-semibold ${ecartColor}`}>
        {ecart !== null ? (ecart > 0 ? `+${ecart}` : ecart) : "—"}
      </td>
      <td className="py-2 px-2 text-center">
        {item.valide ? (
          ecart === 0 ? (
            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
          ) : ecart !== null && ecart !== 0 ? (
            <AlertTriangle className="h-4 w-4 text-orange-500 mx-auto" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
          )
        ) : (
          <MinusCircle className="h-4 w-4 text-gray-400 mx-auto" />
        )}
      </td>
    </tr>
  );
}
