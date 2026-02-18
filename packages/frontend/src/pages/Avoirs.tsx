import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import {
  RotateCcw,
  Plus,
  Trash2,
  Search,
  X,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { Avoir, Piece, Client, Facture, avoirsApi, piecesApi, clientsApi, facturesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toaster";

interface CartItem {
  id: string;
  pieceId: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
  total: number;
  retourStock: boolean;
}

export default function AvoirsPage() {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const isVendeurOrAdmin = user?.role === "ADMIN" || user?.role === "VENDEUR";

  const [avoirs, setAvoirs] = useState<Avoir[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statutFilter, setStatutFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAvoir, setExpandedAvoir] = useState<string | null>(null);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedFactureId, setSelectedFactureId] = useState("");
  const [motif, setMotif] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [tauxTVA, setTauxTVA] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [avoirsData, piecesData, clientsData, facturesData] = await Promise.all([
        avoirsApi.getAll(),
        piecesApi.getAll(),
        clientsApi.getAll(),
        facturesApi.getAll(),
      ]);
      setAvoirs(avoirsData);
      setPieces(piecesData);
      setClients(clientsData);
      setFactures(facturesData.filter((f) => f.statut !== "BROUILLON" && f.statut !== "ANNULEE"));
    } catch (err) {
      setError("Erreur lors du chargement des données");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFacture = (factureId: string) => {
    setSelectedFactureId(factureId);
    const facture = factures.find((f) => f.id === factureId);
    if (facture) {
      if (facture.clientId) setSelectedClientId(facture.clientId);
      setMotif(`Retour sur facture ${facture.numero}`);
      // Pre-fill cart with facture items
      setCart(
        facture.items.map((item) => ({
          id: `item-${Date.now()}-${Math.random()}`,
          pieceId: item.pieceId || "",
          designation: item.designation,
          quantite: item.quantite,
          prixUnitaire: item.prixUnitaire,
          tva: item.tva,
          total: item.total,
          retourStock: true,
        })),
      );
    }
  };

  const handleAddToCart = () => {
    const newItem: CartItem = {
      id: `item-${Date.now()}`,
      pieceId: "",
      designation: "",
      quantite: 1,
      prixUnitaire: 0,
      tva: tauxTVA,
      total: 0,
      retourStock: true,
    };
    setCart([...cart, newItem]);
  };

  const handleUpdateCartItem = (index: number, field: string, value: string | number | boolean) => {
    const updatedCart = [...cart];

    if (field === "pieceId") {
      const piece = pieces.find((p) => p.id === value);
      if (piece) {
        updatedCart[index] = {
          ...updatedCart[index],
          pieceId: piece.id,
          designation: piece.nom,
          prixUnitaire: piece.prixVente,
          total: updatedCart[index].quantite * piece.prixVente,
        };
      }
    } else if (field === "quantite") {
      const quantite = Math.max(1, Number(value));
      updatedCart[index].quantite = quantite;
      updatedCart[index].total = quantite * updatedCart[index].prixUnitaire;
    } else if (field === "prixUnitaire") {
      updatedCart[index].prixUnitaire = Number(value);
      updatedCart[index].total = updatedCart[index].quantite * Number(value);
    } else if (field === "retourStock") {
      updatedCart[index].retourStock = value as boolean;
    }

    setCart(updatedCart);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateSousTotal = () => cart.reduce((acc, item) => acc + item.total, 0);
  const calculateTVA = () => (calculateSousTotal() * tauxTVA) / 100;
  const calculateTotal = () => calculateSousTotal() + calculateTVA();

  const handleSaveAvoir = async () => {
    if (!motif.trim()) {
      toastError("Veuillez saisir un motif pour l'avoir");
      return;
    }
    if (cart.length === 0) {
      toastError("Veuillez ajouter au moins un article");
      return;
    }

    try {
      setSaving(true);
      await avoirsApi.create({
        clientId: selectedClientId || undefined,
        factureId: selectedFactureId || undefined,
        motif,
        items: cart.map((item) => ({
          pieceId: item.pieceId || undefined,
          designation: item.designation,
          quantite: item.quantite,
          prixUnitaire: item.prixUnitaire,
          tva: tauxTVA,
          retourStock: item.retourStock,
        })),
        notes: notes || undefined,
      });
      await loadData();
      resetForm();
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
      toastError("Erreur lors de la création de l'avoir");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedClientId("");
    setSelectedFactureId("");
    setMotif("");
    setCart([]);
    setNotes("");
  };

  const handleValiderAvoir = async (avoir: Avoir) => {
    const itemsRetour = avoir.items.filter((i) => i.retourStock && i.pieceId);
    const msg = itemsRetour.length > 0
      ? `Valider l'avoir ${avoir.numero} ? ${itemsRetour.length} article(s) seront remis en stock.`
      : `Valider l'avoir ${avoir.numero} ?`;
    if (!confirm(msg)) return;
    try {
      await avoirsApi.updateStatus(avoir.id, "VALIDE");
      await loadData();
    } catch (err) {
      console.error(err);
      toastError("Erreur lors de la validation");
    }
  };

  const handleRembourserAvoir = async (avoir: Avoir) => {
    if (!confirm(`Marquer l'avoir ${avoir.numero} comme remboursé ?`)) return;
    try {
      await avoirsApi.updateStatus(avoir.id, "REMBOURSE");
      await loadData();
    } catch (err) {
      console.error(err);
      toastError("Erreur lors du remboursement");
    }
  };

  const handleDeleteAvoir = async (avoir: Avoir) => {
    if (!confirm(`Supprimer l'avoir ${avoir.numero} ?`)) return;
    try {
      await avoirsApi.delete(avoir.id);
      await loadData();
    } catch (err) {
      console.error(err);
      toastError("Erreur lors de la suppression");
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "EN_ATTENTE":
        return <Badge variant="warning">En attente</Badge>;
      case "VALIDE":
        return <Badge variant="success">Validé</Badge>;
      case "REMBOURSE":
        return <Badge variant="secondary">Remboursé</Badge>;
      default:
        return <Badge>{statut}</Badge>;
    }
  };

  const filteredAvoirs = avoirs.filter((a) => {
    const matchesSearch =
      a.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.client?.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.motif.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatut = statutFilter === "all" || a.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
        <Button onClick={loadData} className="mt-4">Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Avoirs / Retours</h1>
          <p className="text-muted-foreground">Gérez les retours produits et avoirs clients</p>
        </div>
        {isVendeurOrAdmin && (
          <Button onClick={() => setIsFormOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nouvel Avoir
          </Button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par numéro, client ou motif..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} className="w-48">
          <option value="all">Tous les statuts</option>
          <option value="EN_ATTENTE">En attente</option>
          <option value="VALIDE">Validés</option>
          <option value="REMBOURSE">Remboursés</option>
        </Select>
      </div>

      {/* List */}
      {filteredAvoirs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RotateCcw className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun avoir</h3>
            <p className="text-muted-foreground mt-2">Créez votre premier avoir / retour</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-left text-sm font-medium text-muted-foreground">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">N° Avoir</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Motif</th>
                <th className="px-4 py-3">Facture liée</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAvoirs.map((avoir) => (
                <>
                  <tr
                    key={avoir.id}
                    className="hover:bg-muted/30 cursor-pointer text-sm"
                    onClick={() => setExpandedAvoir(expandedAvoir === avoir.id ? null : avoir.id)}
                  >
                    <td className="px-4 py-3">
                      {expandedAvoir === avoir.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </td>
                    <td className="px-4 py-3 font-medium">{avoir.numero}</td>
                    <td className="px-4 py-3">{avoir.client?.nom || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{avoir.motif}</td>
                    <td className="px-4 py-3 text-muted-foreground">{avoir.facture?.numero || "—"}</td>
                    <td className="px-4 py-3">{getStatutBadge(avoir.statut)}</td>
                    <td className="px-4 py-3 text-right font-bold">{avoir.total.toLocaleString()} Fmg</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {avoir.statut === "EN_ATTENTE" && isVendeurOrAdmin && (
                          <Button size="icon" variant="ghost" title="Valider (remet en stock)" onClick={(e) => { e.stopPropagation(); handleValiderAvoir(avoir); }}>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {avoir.statut === "VALIDE" && isVendeurOrAdmin && (
                          <Button size="icon" variant="ghost" title="Marquer comme remboursé" onClick={(e) => { e.stopPropagation(); handleRembourserAvoir(avoir); }}>
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {avoir.statut === "EN_ATTENTE" && user?.role === "ADMIN" && (
                          <Button size="icon" variant="ghost" title="Supprimer" onClick={(e) => { e.stopPropagation(); handleDeleteAvoir(avoir); }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedAvoir === avoir.id && (
                    <tr key={`${avoir.id}-details`}>
                      <td colSpan={8} className="bg-muted/20 px-8 py-3">
                        <div className="space-y-1">
                          {avoir.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-sm py-1">
                              <span>
                                {item.designation}
                                {item.retourStock && <Badge variant="secondary" className="ml-2 text-xs">Retour stock</Badge>}
                              </span>
                              <span className="text-muted-foreground">
                                {item.quantite} × {item.prixUnitaire.toLocaleString()} Fmg ={" "}
                                <span className="font-medium text-foreground">{item.total.toLocaleString()} Fmg</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog Nouvel Avoir */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Nouvel Avoir / Retour</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Facture source */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Facture liée (optionnel)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Sélectionner une facture pour pré-remplir</Label>
                  <Select value={selectedFactureId} onChange={(e) => handleSelectFacture(e.target.value)}>
                    <option value="">Aucune facture liée</option>
                    {factures.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.numero} — {f.client?.nom || "Anonyme"} — {f.total.toLocaleString()} Fmg
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Client</Label>
                  <Select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
                    <option value="">Aucun client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.nom} {client.prenom || ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Motif *</Label>
                  <Input placeholder="Ex: Pièce défectueuse, erreur de commande..." value={motif} onChange={(e) => setMotif(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Articles */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Articles à retourner</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleAddToCart}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg border-dashed">
                    <p className="text-muted-foreground">Aucun article. Sélectionnez une facture ou ajoutez manuellement.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                        <div className="col-span-4">
                          <Label>Pièce</Label>
                          <Autocomplete
                            value={item.pieceId}
                            onChange={(value) => handleUpdateCartItem(index, "pieceId", value)}
                            options={pieces.map((piece) => ({
                              value: piece.id,
                              label: piece.nom,
                              subtitle: piece.reference,
                            }))}
                            placeholder="Rechercher une pièce..."
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Quantité</Label>
                          <Input type="number" min="1" value={item.quantite} onChange={(e) => handleUpdateCartItem(index, "quantite", e.target.value)} />
                        </div>
                        <div className="col-span-2">
                          <Label>Prix Unit.</Label>
                          <Input type="number" step="0.01" value={item.prixUnitaire} onChange={(e) => handleUpdateCartItem(index, "prixUnitaire", e.target.value)} />
                        </div>
                        <div className="col-span-2">
                          <Label>Retour stock</Label>
                          <Select value={item.retourStock ? "oui" : "non"} onChange={(e) => handleUpdateCartItem(index, "retourStock", e.target.value === "oui")}>
                            <option value="oui">Oui</option>
                            <option value="non">Non</option>
                          </Select>
                        </div>
                        <div className="col-span-1 text-right text-sm font-medium pt-6">
                          {item.total.toLocaleString()}
                        </div>
                        <div className="col-span-1">
                          <Button size="icon" variant="ghost" onClick={() => handleRemoveFromCart(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totaux */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Taux TVA (%)</Label>
                    <Input type="number" value={tauxTVA} onChange={(e) => setTauxTVA(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Notes (optionnel)</Label>
                    <Textarea placeholder="Notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-lg">
                    <span>Sous-total HT:</span>
                    <span className="font-semibold">{calculateSousTotal().toLocaleString()} Fmg</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>TVA ({tauxTVA}%):</span>
                    <span className="font-semibold">{calculateTVA().toLocaleString()} Fmg</span>
                  </div>
                  <div className="flex justify-between text-2xl font-bold pt-2 border-t">
                    <span>Total avoir:</span>
                    <span className="text-primary">{calculateTotal().toLocaleString()} Fmg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            <Button onClick={handleSaveAvoir} disabled={cart.length === 0 || !motif.trim() || saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Créer l'avoir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
