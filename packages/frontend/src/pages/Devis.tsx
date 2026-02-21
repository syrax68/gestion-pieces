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
  FileText,
  Plus,
  Trash2,
  Printer,
  Search,
  X,
  Check,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Send,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
} from "lucide-react";
import { Devis, Piece, Client, devisApi, piecesApi, clientsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toaster";
import html2pdf from "html2pdf.js";

const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001";
const mediaUrl = (url: string) => (url.startsWith("http") ? url : `${API_BASE}${url}`);

interface CartItem {
  id: string;
  pieceId: string;
  designation: string;
  description?: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
  total: number;
}

export default function DevisPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const isVendeurOrAdmin = user?.role === "ADMIN" || user?.role === "VENDEUR";

  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [selectedDevis, setSelectedDevis] = useState<Devis | null>(null);
  const [editingDevis, setEditingDevis] = useState<Devis | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statutFilter, setStatutFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDevis, setExpandedDevis] = useState<string | null>(null);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [clientTelephone, setClientTelephone] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [conditions, setConditions] = useState("");
  const [dateValidite, setDateValidite] = useState("");
  const [tauxTVA, setTauxTVA] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [devisData, piecesData, clientsData] = await Promise.all([devisApi.getAll(), piecesApi.getAll(), clientsApi.getAll()]);
      setDevisList(devisData);
      setPieces(piecesData);
      setClients(clientsData);
    } catch (err) {
      setError("Erreur lors du chargement des données");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setClientNom(`${client.nom} ${client.prenom || ""}`.trim());
      setClientTelephone(client.telephone || "");
    } else {
      setClientNom("");
      setClientTelephone("");
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
    };
    setCart([...cart, newItem]);
  };

  const handleUpdateCartItem = (index: number, field: string, value: string | number) => {
    const updatedCart = [...cart];

    if (field === "pieceId") {
      const piece = pieces.find((p) => p.id === value);
      if (piece) {
        updatedCart[index] = {
          ...updatedCart[index],
          pieceId: piece.id,
          designation: piece.nom,
          description: piece.reference,
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
    }

    setCart(updatedCart);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateSousTotal = () => cart.reduce((acc, item) => acc + item.total, 0);
  const calculateTVA = () => (calculateSousTotal() * tauxTVA) / 100;
  const calculateTotal = () => calculateSousTotal() + calculateTVA();

  const handleSaveDevis = async () => {
    if (cart.length === 0 || cart.some((item) => !item.pieceId && !item.designation)) {
      toastError("Veuillez ajouter au moins un article valide");
      return;
    }

    try {
      setSaving(true);
      const devisData = {
        clientId: selectedClientId || undefined,
        dateValidite: dateValidite || undefined,
        items: cart.map((item) => ({
          pieceId: item.pieceId || undefined,
          designation: item.designation,
          description: item.description,
          quantite: item.quantite,
          prixUnitaire: item.prixUnitaire,
          tva: tauxTVA,
        })),
        conditions: conditions || undefined,
        notes: notes || undefined,
      };

      let resultDevis: Devis;
      if (editingDevis) {
        resultDevis = await devisApi.update(editingDevis.id, devisData);
      } else {
        resultDevis = await devisApi.create(devisData);
      }
      await loadData();
      resetForm();
      setIsFormOpen(false);

      setSelectedDevis(resultDevis);
      setIsPrintOpen(true);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du devis:", err);
      toastError(editingDevis ? "Erreur lors de la modification du devis" : "Erreur lors de la création du devis");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setClientNom("");
    setClientTelephone("");
    setSelectedClientId("");
    setCart([]);
    setNotes("");
    setConditions("");
    setDateValidite("");
    setEditingDevis(null);
  };

  const handleEditDevis = (devis: Devis) => {
    setEditingDevis(devis);
    setSelectedClientId(devis.clientId || "");
    setClientNom(devis.client?.nom || "");
    setClientTelephone(devis.client?.telephone || "");
    setNotes(devis.notes || "");
    setConditions(devis.conditions || "");
    setDateValidite(devis.dateValidite ? devis.dateValidite.slice(0, 10) : "");
    setCart(
      devis.items.map((item) => ({
        id: item.id,
        pieceId: item.pieceId || "",
        designation: item.designation,
        description: item.description || undefined,
        quantite: item.quantite,
        prixUnitaire: item.prixUnitaire,
        tva: item.tva,
        total: item.total,
      })),
    );
    if (devis.items.length > 0) {
      setTauxTVA(devis.items[0].tva);
    }
    setIsFormOpen(true);
  };

  const handleEnvoyerDevis = async (devis: Devis) => {
    if (!confirm(`Marquer le devis ${devis.numero} comme envoyé au client ?`)) return;
    try {
      await devisApi.updateStatus(devis.id, "ENVOYE");
      await loadData();
    } catch (err) {
      console.error(err);
      toastError("Erreur lors de l'envoi du devis");
    }
  };

  const handleAccepterDevis = async (devis: Devis) => {
    if (!confirm(`Marquer le devis ${devis.numero} comme accepté par le client ?`)) return;
    try {
      await devisApi.updateStatus(devis.id, "ACCEPTE");
      await loadData();
    } catch (err) {
      console.error(err);
      toastError("Erreur lors de l'acceptation du devis");
    }
  };

  const handleRefuserDevis = async (devis: Devis) => {
    if (!confirm(`Marquer le devis ${devis.numero} comme refusé ?`)) return;
    try {
      await devisApi.updateStatus(devis.id, "REFUSE");
      await loadData();
    } catch (err) {
      console.error(err);
      toastError("Erreur lors du refus du devis");
    }
  };

  const handleConvertirEnFacture = async (devis: Devis) => {
    if (!confirm(`Convertir le devis ${devis.numero} en facture ? Une nouvelle facture (brouillon) sera créée avec les mêmes articles.`)) return;
    try {
      await devisApi.convertToFacture(devis.id);
      await loadData();
      toastSuccess(`Facture créée avec succès depuis le devis ${devis.numero}. Rendez-vous dans Factures pour la valider.`);
    } catch (err) {
      console.error(err);
      toastError("Erreur lors de la conversion en facture");
    }
  };

  const handleDeleteDevis = async (devis: Devis) => {
    if (!confirm(`Supprimer définitivement le devis ${devis.numero} ?`)) return;
    try {
      await devisApi.delete(devis.id);
      await loadData();
    } catch (err) {
      console.error(err);
      toastError("Erreur lors de la suppression");
    }
  };

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    const element = document.getElementById("devis-print");
    if (!element || !selectedDevis) return;

    const options = {
      margin: [5, 5, 5, 5] as [number, number, number, number],
      filename: `Devis-${selectedDevis.numero}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4" as const, orientation: "portrait" as const },
    };

    html2pdf().set(options).from(element).save();
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "BROUILLON":
        return <Badge variant="secondary">Brouillon</Badge>;
      case "ENVOYE":
        return <Badge variant="warning">Envoyé</Badge>;
      case "ACCEPTE":
        return <Badge variant="success">Accepté</Badge>;
      case "REFUSE":
        return <Badge variant="destructive">Refusé</Badge>;
      case "EXPIRE":
        return <Badge variant="destructive">Expiré</Badge>;
      default:
        return <Badge>{statut}</Badge>;
    }
  };

  const filteredDevis = devisList.filter((d) => {
    const matchesSearch =
      d.numero.toLowerCase().includes(searchTerm.toLowerCase()) || (d.client?.nom || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatut = statutFilter === "all" || d.statut === statutFilter;
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
        <Button onClick={loadData} className="mt-4">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devis</h1>
          <p className="text-muted-foreground">Créez et gérez vos devis clients</p>
        </div>
        {isVendeurOrAdmin && (
          <Button onClick={() => setIsFormOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nouveau Devis
          </Button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par numéro ou client..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} className="w-48">
          <option value="all">Tous les statuts</option>
          <option value="BROUILLON">Brouillons</option>
          <option value="ENVOYE">Envoyés</option>
          <option value="ACCEPTE">Acceptés</option>
          <option value="REFUSE">Refusés</option>
          <option value="EXPIRE">Expirés</option>
        </Select>
      </div>

      {/* Devis list */}
      {filteredDevis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun devis</h3>
            <p className="text-muted-foreground mt-2">Créez votre premier devis</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-left text-sm font-medium text-muted-foreground">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">N° Devis</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Validité</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 w-36"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDevis.map((devis) => (
                <>
                  <tr
                    key={devis.id}
                    className="hover:bg-muted/30 cursor-pointer text-sm"
                    onClick={() => setExpandedDevis(expandedDevis === devis.id ? null : devis.id)}
                  >
                    <td className="px-4 py-3">
                      {expandedDevis === devis.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{devis.numero}</td>
                    <td className="px-4 py-3">{devis.client?.nom || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(devis.dateDevis).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(devis.dateValidite).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">{getStatutBadge(devis.statut)}</td>
                    <td className="px-4 py-3 text-right font-bold">{devis.total.toLocaleString()} Fmg</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {devis.statut === "BROUILLON" && isVendeurOrAdmin && (
                          <>
                            <Button size="icon" variant="ghost" title="Modifier" onClick={(e) => { e.stopPropagation(); handleEditDevis(devis); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Envoyer au client" onClick={(e) => { e.stopPropagation(); handleEnvoyerDevis(devis); }}>
                              <Send className="h-4 w-4 text-blue-600" />
                            </Button>
                          </>
                        )}
                        {devis.statut === "ENVOYE" && isVendeurOrAdmin && (
                          <>
                            <Button size="icon" variant="ghost" title="Accepté" onClick={(e) => { e.stopPropagation(); handleAccepterDevis(devis); }}>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Refusé" onClick={(e) => { e.stopPropagation(); handleRefuserDevis(devis); }}>
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {devis.statut === "ACCEPTE" && isVendeurOrAdmin && (
                          <Button size="icon" variant="ghost" title="Convertir en facture" onClick={(e) => { e.stopPropagation(); handleConvertirEnFacture(devis); }}>
                            <ArrowRightLeft className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Imprimer / PDF"
                          onClick={(e) => { e.stopPropagation(); setSelectedDevis(devis); setIsPrintOpen(true); }}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {user?.role === "ADMIN" && (
                          <Button size="icon" variant="ghost" title="Supprimer" onClick={(e) => { e.stopPropagation(); handleDeleteDevis(devis); }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedDevis === devis.id && (
                    <tr key={`${devis.id}-details`}>
                      <td colSpan={8} className="bg-muted/20 px-8 py-3">
                        <div className="space-y-1">
                          {devis.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-sm py-1">
                              <span>{item.designation}</span>
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

      {/* Dialog Nouveau Devis */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{editingDevis ? `Modifier ${editingDevis.numero}` : "Nouveau Devis"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Client */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Client existant (optionnel)</Label>
                  <Select value={selectedClientId} onChange={(e) => handleSelectClient(e.target.value)}>
                    <option value="">Nouveau client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.nom} {client.prenom}
                        {client.entreprise && ` (${client.entreprise})`}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom du client</Label>
                    <Input placeholder="Nom complet ou entreprise" value={clientNom} onChange={(e) => setClientNom(e.target.value)} />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input placeholder="Numéro de téléphone" value={clientTelephone} onChange={(e) => setClientTelephone(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Articles */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Articles</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleAddToCart}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg border-dashed">
                    <p className="text-muted-foreground">Aucun article ajouté</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                        <div className="col-span-5">
                          <Label>Pièce</Label>
                          <Autocomplete
                            value={item.pieceId}
                            onChange={(value) => handleUpdateCartItem(index, "pieceId", value)}
                            options={pieces.map((piece) => ({
                              value: piece.id,
                              label: piece.nom,
                              subtitle: `${piece.reference} - Stock: ${piece.stock}`,
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
                          <Label>Total HT</Label>
                          <Input value={item.total.toFixed(2)} readOnly />
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

            {/* Options & Totaux */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date de validité</Label>
                    <Input type="date" value={dateValidite} onChange={(e) => setDateValidite(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Par défaut : 30 jours</p>
                  </div>
                  <div>
                    <Label>Taux TVA (%)</Label>
                    <Input type="number" value={tauxTVA} onChange={(e) => setTauxTVA(Number(e.target.value))} />
                  </div>
                </div>

                <div>
                  <Label>Conditions (optionnel)</Label>
                  <Textarea placeholder="Conditions de paiement, délais..." value={conditions} onChange={(e) => setConditions(e.target.value)} rows={2} />
                </div>

                <div>
                  <Label>Notes (optionnel)</Label>
                  <Textarea placeholder="Notes ou remarques..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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
                    <span>Total TTC:</span>
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
            <Button onClick={handleSaveDevis} disabled={cart.length === 0 || saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingDevis ? "Modification..." : "Création..."}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {editingDevis ? "Enregistrer les modifications" : "Créer le devis"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Impression / PDF */}
      <Dialog open={isPrintOpen} onOpenChange={setIsPrintOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:shadow-none print:max-h-none print:overflow-visible">
          {selectedDevis && <DevisPrintTemplate devis={selectedDevis} />}

          <DialogFooter className="print:hidden mt-4">
            <Button variant="outline" onClick={() => setIsPrintOpen(false)}>
              Fermer
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden; }
          #devis-print, #devis-print * { visibility: visible; }
          #devis-print { position: absolute; left: 0; top: 0; width: 100%; font-family: Arial, sans-serif; }
          .print-table { border-collapse: collapse; width: 100%; }
          .print-table th, .print-table td { border: 1px solid #ddd; padding: 6px 8px; }
          .print-table thead { background-color: #f5f5f5; }
        }
      `}</style>
    </div>
  );
}

function DevisPrintTemplate({ devis }: { devis: Devis }) {
  const boutique = devis.boutique;
  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");

  return (
    <div id="devis-print" style={{ fontFamily: "Arial, sans-serif", color: "#111", fontSize: 13 }}>
      {/* ─── HEADER : Logo + Boutique info | Devis title ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, borderBottom: "2px solid #111", marginBottom: 20 }}>
        {/* Left: Logo + boutique info */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {boutique?.logo ? (
            <img
              src={mediaUrl(boutique.logo)}
              alt={boutique.nom}
              style={{ height: 60, maxWidth: 120, objectFit: "contain" }}
            />
          ) : null}
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{boutique?.nom || "—"}</p>
            {boutique?.adresse && <p style={{ fontSize: 11, color: "#555", marginBottom: 1 }}>{boutique.adresse}</p>}
            {boutique?.ville && <p style={{ fontSize: 11, color: "#555", marginBottom: 1 }}>{boutique.ville}</p>}
            {boutique?.telephone && <p style={{ fontSize: 11, color: "#555", marginBottom: 1 }}>Tél : {boutique.telephone}</p>}
            {boutique?.email && <p style={{ fontSize: 11, color: "#555", marginBottom: 1 }}>{boutique.email}</p>}
            {boutique?.siret && <p style={{ fontSize: 10, color: "#888" }}>SIRET : {boutique.siret}</p>}
          </div>
        </div>

        {/* Right: Devis title */}
        <div style={{ textAlign: "right" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, marginBottom: 4, color: "#1a1a1a" }}>DEVIS</h1>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>N° {devis.numero}</p>
          <p style={{ fontSize: 11, color: "#555" }}>Date : {fmtDate(devis.dateDevis)}</p>
          <p style={{ fontSize: 11, color: "#555" }}>Validité : {fmtDate(devis.dateValidite)}</p>
        </div>
      </div>

      {/* ─── CLIENT ─── */}
      <div style={{ marginBottom: 20, padding: "10px 14px", backgroundColor: "#f8f8f8", borderLeft: "3px solid #111", borderRadius: 2 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#666", marginBottom: 6 }}>Facturé à</p>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{devis.client?.nom || "Client non précisé"}</p>
        {devis.client?.entreprise && <p style={{ fontSize: 12, marginBottom: 1 }}>{devis.client.entreprise}</p>}
        {devis.client?.adresse && <p style={{ fontSize: 11, color: "#555", marginBottom: 1 }}>{devis.client.adresse}</p>}
        {(devis.client?.ville || devis.client?.codePostal) && (
          <p style={{ fontSize: 11, color: "#555", marginBottom: 1 }}>
            {devis.client?.codePostal} {devis.client?.ville}
          </p>
        )}
        {devis.client?.telephone && <p style={{ fontSize: 11, color: "#555", marginBottom: 1 }}>Tél : {devis.client.telephone}</p>}
        {devis.client?.email && <p style={{ fontSize: 11, color: "#555" }}>{devis.client.email}</p>}
      </div>

      {/* ─── ITEMS TABLE ─── */}
      <table className="print-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: 12 }}>
        <thead>
          <tr style={{ backgroundColor: "#1a1a1a", color: "#fff" }}>
            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600 }}>Désignation</th>
            <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, width: 50 }}>Qté</th>
            <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, width: 100 }}>P.U. HT</th>
            {devis.items.some((i) => i.remise > 0) && (
              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, width: 70 }}>Remise</th>
            )}
            <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, width: 110 }}>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {devis.items.map((item, idx) => (
            <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td style={{ padding: "7px 10px", borderBottom: "1px solid #eee" }}>
                <div style={{ fontWeight: 600 }}>{item.designation}</div>
                {item.description && <div style={{ fontSize: 10, color: "#777", marginTop: 2 }}>{item.description}</div>}
              </td>
              <td style={{ padding: "7px 10px", textAlign: "center", borderBottom: "1px solid #eee" }}>{item.quantite}</td>
              <td style={{ padding: "7px 10px", textAlign: "right", borderBottom: "1px solid #eee" }}>{fmt(item.prixUnitaire)} Fmg</td>
              {devis.items.some((i) => i.remise > 0) && (
                <td style={{ padding: "7px 10px", textAlign: "right", borderBottom: "1px solid #eee", color: "#e55" }}>
                  {item.remise > 0 ? `-${item.remise}%` : "—"}
                </td>
              )}
              <td style={{ padding: "7px 10px", textAlign: "right", borderBottom: "1px solid #eee", fontWeight: 600 }}>{fmt(item.total)} Fmg</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ─── TOTALS ─── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <div style={{ width: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
            <span style={{ color: "#555" }}>Sous-total HT</span>
            <span>{fmt(devis.sousTotal)} Fmg</span>
          </div>
          {devis.remise > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: "#e55" }}>
              <span>Remise</span>
              <span>- {fmt(devis.remise)} Fmg</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
            <span style={{ color: "#555" }}>TVA</span>
            <span>{fmt(devis.tva)} Fmg</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", marginTop: 6, backgroundColor: "#1a1a1a", color: "#fff", fontWeight: 700, fontSize: 15, borderRadius: 3 }}>
            <span>TOTAL TTC</span>
            <span>{fmt(devis.total)} Fmg</span>
          </div>
        </div>
      </div>

      {/* ─── CONDITIONS / NOTES ─── */}
      {(devis.conditions || devis.notes) && (
        <div style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginBottom: 16, fontSize: 11 }}>
          {devis.conditions && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontWeight: 700, marginBottom: 4, textTransform: "uppercase", fontSize: 10, letterSpacing: 1, color: "#666" }}>Conditions</p>
              <p style={{ color: "#444", whiteSpace: "pre-line" }}>{devis.conditions}</p>
            </div>
          )}
          {devis.notes && (
            <div>
              <p style={{ fontWeight: 700, marginBottom: 4, textTransform: "uppercase", fontSize: 10, letterSpacing: 1, color: "#666" }}>Notes</p>
              <p style={{ color: "#444", whiteSpace: "pre-line" }}>{devis.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <div style={{ borderTop: "1px solid #ddd", paddingTop: 10, textAlign: "center", fontSize: 10, color: "#888" }}>
        <p>Ce devis est valable jusqu'au <strong>{fmtDate(devis.dateValidite)}</strong>.</p>
        <p style={{ marginTop: 4 }}>Merci de votre confiance ! — {boutique?.nom}</p>
      </div>
    </div>
  );
}
