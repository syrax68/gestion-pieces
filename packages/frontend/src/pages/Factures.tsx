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
import { FileText, Plus, Trash2, Printer, Search, X, Check, Download, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Facture, Piece, Client, facturesApi, piecesApi, clientsApi, exportApi } from "@/lib/api";
import html2pdf from "html2pdf.js";

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

export default function Factures() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulaire nouvelle facture
  const [clientNom, setClientNom] = useState("");
  const [clientTelephone, setClientTelephone] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [expandedFacture, setExpandedFacture] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [methodePaiement, setMethodePaiement] = useState("especes");
  const [notes, setNotes] = useState("");
  const [tauxTVA, setTauxTVA] = useState(20);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [facturesData, piecesData, clientsData] = await Promise.all([
        facturesApi.getAll(),
        piecesApi.getAll(),
        clientsApi.getAll()
      ]);
      setFactures(facturesData);
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

  const calculateSousTotal = () => {
    return cart.reduce((acc, item) => acc + item.total, 0);
  };

  const calculateTVA = () => {
    return (calculateSousTotal() * tauxTVA) / 100;
  };

  const calculateTotal = () => {
    return calculateSousTotal() + calculateTVA();
  };

  const handleSaveFacture = async () => {
    if (cart.length === 0 || cart.some((item) => !item.pieceId && !item.designation)) {
      alert("Veuillez ajouter au moins un article valide");
      return;
    }

    // Vérifier les stocks
    for (const item of cart) {
      if (item.pieceId) {
        const piece = pieces.find((p) => p.id === item.pieceId);
        if (piece && piece.stock < item.quantite) {
          alert(`Stock insuffisant pour ${piece.nom} (disponible: ${piece.stock})`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      const factureData = {
        clientId: selectedClientId || undefined,
        items: cart.map(item => ({
          pieceId: item.pieceId || undefined,
          designation: item.designation,
          description: item.description,
          quantite: item.quantite,
          prixUnitaire: item.prixUnitaire,
          tva: tauxTVA,
        })),
        methodePaiement,
        notes: notes || undefined,
      };

      const newFacture = await facturesApi.create(factureData);
      await loadData();
      resetForm();
      setIsFormOpen(false);

      // Ouvrir l'aperçu d'impression
      setSelectedFacture(newFacture);
      setIsPrintOpen(true);
    } catch (err) {
      console.error("Erreur lors de la création de la facture:", err);
      alert("Erreur lors de la création de la facture");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setClientNom("");
    setClientTelephone("");
    setSelectedClientId("");
    setCart([]);
    setMethodePaiement("especes");
    setNotes("");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById("facture-print");
    if (!element || !selectedFacture) return;

    // Format ticket thermique 80mm de largeur
    const options = {
      margin: [2, 2, 2, 2] as [number, number, number, number],
      filename: `Facture-${selectedFacture.numero}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: [80, 297] as [number, number], orientation: "portrait" as const },
    };

    html2pdf().set(options).from(element).save();
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "PAYEE":
        return <Badge variant="success">Payée</Badge>;
      case "EN_ATTENTE":
        return <Badge variant="warning">En attente</Badge>;
      case "PARTIELLEMENT_PAYEE":
        return <Badge variant="warning">Partiellement payée</Badge>;
      case "ANNULEE":
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge>{statut}</Badge>;
    }
  };

  const filteredFactures = factures.filter(
    (f) => f.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (f.client?.nom || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Facturation Rapide</h1>
          <p className="text-muted-foreground">Créez et gérez vos factures de vente</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportApi.downloadFactures()}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsFormOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nouvelle Facture
          </Button>
        </div>
      </div>

      {/* Recherche */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro ou client..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Liste des factures */}
      {filteredFactures.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucune facture</h3>
            <p className="text-muted-foreground mt-2">Créez votre première facture de vente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-left text-sm font-medium text-muted-foreground">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">N° Facture</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Articles</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredFactures.map((facture) => (
                <>
                  <tr
                    key={facture.id}
                    className="hover:bg-muted/30 cursor-pointer text-sm"
                    onClick={() => setExpandedFacture(expandedFacture === facture.id ? null : facture.id)}
                  >
                    <td className="px-4 py-3">
                      {expandedFacture === facture.id
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </td>
                    <td className="px-4 py-3 font-medium">{facture.numero}</td>
                    <td className="px-4 py-3">{facture.client?.nom || "Client anonyme"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(facture.dateFacture).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{facture.items.length} article{facture.items.length > 1 ? 's' : ''}</td>
                    <td className="px-4 py-3">{getStatutBadge(facture.statut)}</td>
                    <td className="px-4 py-3 text-right font-bold">{facture.total.toLocaleString()} Fmg</td>
                    <td className="px-4 py-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFacture(facture);
                          setIsPrintOpen(true);
                        }}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                  {expandedFacture === facture.id && (
                    <tr key={`${facture.id}-details`}>
                      <td colSpan={8} className="bg-muted/20 px-8 py-3">
                        <div className="space-y-1">
                          {facture.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-sm py-1">
                              <span>{item.designation}</span>
                              <span className="text-muted-foreground">
                                {item.quantite} × {item.prixUnitaire.toLocaleString()} Fmg = <span className="font-medium text-foreground">{item.total.toLocaleString()} Fmg</span>
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

      {/* Dialog Nouvelle Facture */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Nouvelle Facture</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informations Client */}
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
                    {cart.map((item, index) => {
                      const piece = pieces.find((p) => p.id === item.pieceId);
                      return (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                          <div className="col-span-5">
                            <Label>Pièce</Label>
                            <Autocomplete
                              value={item.pieceId}
                              onChange={(value) => handleUpdateCartItem(index, "pieceId", value)}
                              options={pieces
                                .filter((p) => p.stock > 0)
                                .map((piece) => ({
                                  value: piece.id,
                                  label: piece.nom,
                                  subtitle: `${piece.reference} - Stock: ${piece.stock}`,
                                }))}
                              placeholder="Rechercher une pièce..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Quantité</Label>
                            <Input
                              type="number"
                              min="1"
                              max={piece?.stock || 999}
                              value={item.quantite}
                              onChange={(e) => handleUpdateCartItem(index, "quantite", e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Prix Unit.</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.prixUnitaire}
                              onChange={(e) => handleUpdateCartItem(index, "prixUnitaire", e.target.value)}
                            />
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
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totaux et paiement */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Méthode de paiement</Label>
                    <Select value={methodePaiement} onChange={(e) => setMethodePaiement(e.target.value)}>
                      <option value="especes">Espèces</option>
                      <option value="carte">Carte bancaire</option>
                      <option value="cheque">Chèque</option>
                      <option value="virement">Virement</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Taux TVA (%)</Label>
                    <Input type="number" value={tauxTVA} onChange={(e) => setTauxTVA(Number(e.target.value))} />
                  </div>
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
            <Button onClick={handleSaveFacture} disabled={cart.length === 0 || saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Créer la facture
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Impression */}
      <Dialog open={isPrintOpen} onOpenChange={setIsPrintOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:shadow-none">
          {selectedFacture && (
            <div className="space-y-3 text-sm print:text-xs" id="facture-print">
              {/* En-tête */}
              <div className="text-center border-b pb-2">
                <h1 className="text-xl font-bold print:text-lg">FACTURE</h1>
                <p className="text-base font-semibold mt-1 print:text-sm">{selectedFacture.numero}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedFacture.dateFacture).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Vendeur */}
              <div className="border-b pb-2">
                <p className="font-bold text-sm">Gestion Pièces Moto</p>
                <p className="text-xs">123 Avenue des Motards</p>
                <p className="text-xs">75001 Paris</p>
                <p className="text-xs">Tél: 01 23 45 67 89</p>
              </div>

              {/* Client */}
              <div className="border-b pb-2">
                <p className="font-semibold text-xs mb-1">CLIENT:</p>
                <p className="font-bold text-sm">{selectedFacture.client?.nom || "Client anonyme"}</p>
                {selectedFacture.client?.telephone && <p className="text-xs">Tél: {selectedFacture.client.telephone}</p>}
              </div>

              {/* Articles */}
              <div className="border-b pb-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Article</th>
                      <th className="text-right py-1">Qté</th>
                      <th className="text-right py-1">P.U.</th>
                      <th className="text-right py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFacture.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-1">
                          <div className="font-medium">{item.designation}</div>
                          {item.description && <div className="text-[10px] text-muted-foreground">{item.description}</div>}
                        </td>
                        <td className="text-right py-1">{item.quantite}</td>
                        <td className="text-right py-1">{item.prixUnitaire.toFixed(0)}</td>
                        <td className="text-right py-1 font-medium">{item.total.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totaux */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Sous-total HT:</span>
                  <span className="font-semibold">{selectedFacture.sousTotal.toLocaleString()} Fmg</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA:</span>
                  <span className="font-semibold">{selectedFacture.tva.toLocaleString()} Fmg</span>
                </div>
                <div className="flex justify-between py-1 border-t-2 border-black text-base font-bold print:text-sm">
                  <span>Total TTC:</span>
                  <span>{selectedFacture.total.toLocaleString()} Fmg</span>
                </div>
                {selectedFacture.methodePaiement && (
                  <div className="text-[10px] text-muted-foreground">Payé par: {selectedFacture.methodePaiement}</div>
                )}
              </div>

              {selectedFacture.notes && (
                <div className="border-t pt-2">
                  <p className="text-xs">
                    <span className="font-semibold">Notes:</span> {selectedFacture.notes}
                  </p>
                </div>
              )}

              <div className="text-center text-[10px] text-muted-foreground border-t pt-2">
                <p>Merci de votre confiance !</p>
              </div>
            </div>
          )}

          <DialogFooter className="print:hidden">
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
          @page {
            size: 80mm auto;
            margin: 2mm;
          }

          body * {
            visibility: hidden;
          }

          #facture-print, #facture-print * {
            visibility: visible;
          }

          #facture-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            max-width: 80mm;
            font-size: 10px;
            padding: 0;
            margin: 0;
          }

          #facture-print table {
            font-size: 9px;
          }

          #facture-print .text-xs {
            font-size: 8px;
          }

          #facture-print .text-\[10px\] {
            font-size: 8px;
          }
        }
      `}</style>
    </div>
  );
}
