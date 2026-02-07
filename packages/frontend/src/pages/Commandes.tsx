import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Plus, Trash2, Check, X, Truck, Loader2 } from "lucide-react";
import { Commande, Piece, Fournisseur, commandesApi, piecesApi, fournisseursApi } from "@/lib/api";

interface CartItem {
  id: string;
  pieceId: string;
  pieceName: string;
  pieceReference: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export default function Commandes() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [commandesData, piecesData, fournisseursData] = await Promise.all([
        commandesApi.getAll(),
        piecesApi.getAll(),
        fournisseursApi.getAll()
      ]);
      setCommandes(commandesData);
      setPieces(piecesData);
      setFournisseurs(fournisseursData);
    } catch (err) {
      setError("Erreur lors du chargement des données");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    const newItem: CartItem = {
      id: `item-${Date.now()}`,
      pieceId: "",
      pieceName: "",
      pieceReference: "",
      quantite: 1,
      prixUnitaire: 0,
      total: 0,
    };
    setCart([...cart, newItem]);
  };

  const handleUpdateCartItem = (index: number, field: string, value: string | number) => {
    const updatedCart = [...cart];

    if (field === "pieceId") {
      const piece = pieces.find((p) => p.id === value);
      if (piece) {
        const prixAchat = piece.prixAchat || piece.prixVente * 0.7;
        updatedCart[index] = {
          ...updatedCart[index],
          pieceId: piece.id,
          pieceName: piece.nom,
          pieceReference: piece.reference,
          prixUnitaire: prixAchat,
          total: updatedCart[index].quantite * prixAchat,
        };
      }
    } else if (field === "quantite") {
      updatedCart[index].quantite = Number(value);
      updatedCart[index].total = Number(value) * updatedCart[index].prixUnitaire;
    } else if (field === "prixUnitaire") {
      updatedCart[index].prixUnitaire = Number(value);
      updatedCart[index].total = updatedCart[index].quantite * Number(value);
    }

    setCart(updatedCart);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => acc + item.total, 0);
  };

  const handleSaveCommande = async () => {
    if (!selectedFournisseur || cart.length === 0 || cart.some((item) => !item.pieceId)) {
      alert("Veuillez sélectionner un fournisseur et ajouter au moins une pièce valide");
      return;
    }

    try {
      setSaving(true);
      await commandesApi.create({
        fournisseurId: selectedFournisseur,
        items: cart.map(item => ({
          pieceId: item.pieceId,
          quantite: item.quantite,
          prixUnitaire: item.prixUnitaire,
        })),
      });
      await loadData();
      setCart([]);
      setSelectedFournisseur("");
      setIsFormOpen(false);
    } catch (err) {
      console.error("Erreur lors de la création de la commande:", err);
      alert("Erreur lors de la création de la commande");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatut = async (commandeId: string, newStatut: string) => {
    try {
      await commandesApi.updateStatus(commandeId, newStatut);
      await loadData();
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "BROUILLON":
        return <Badge variant="secondary">Brouillon</Badge>;
      case "EN_ATTENTE":
        return <Badge variant="warning">En attente</Badge>;
      case "CONFIRMEE":
        return <Badge variant="secondary">Confirmée</Badge>;
      case "EXPEDIEE":
        return <Badge variant="secondary">Expédiée</Badge>;
      case "LIVREE":
        return <Badge variant="success">Livrée</Badge>;
      case "ANNULEE":
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge>{statut}</Badge>;
    }
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Commandes Fournisseurs</h1>
          <p className="text-muted-foreground">Gérez vos commandes auprès des fournisseurs</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Commande
        </Button>
      </div>

      {/* Liste des commandes */}
      <div className="space-y-4">
        {commandes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucune commande</h3>
              <p className="text-muted-foreground mt-2">Créez votre première commande fournisseur</p>
            </CardContent>
          </Card>
        ) : (
          commandes.map((commande) => (
            <Card key={commande.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{commande.numero}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fournisseur: {commande.fournisseur?.nom || "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Commandé le {new Date(commande.dateCommande).toLocaleDateString("fr-FR")}
                    </p>
                    {commande.dateReception && (
                      <p className="text-sm text-muted-foreground">
                        Livré le {new Date(commande.dateReception).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatutBadge(commande.statut)}
                    <p className="text-xl font-bold">{commande.total.toFixed(2)} Ar</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    {commande.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <p className="font-medium">{item.piece?.nom || "-"}</p>
                          <p className="text-sm text-muted-foreground">Réf: {item.piece?.reference || "-"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {item.quantite} × {item.prixUnitaire.toFixed(2)} Ar
                          </p>
                          <p className="text-sm text-muted-foreground">{item.total.toFixed(2)} Ar</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {commande.statut !== "LIVREE" && commande.statut !== "ANNULEE" && (
                    <div className="flex gap-2">
                      {commande.statut === "EN_ATTENTE" && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatut(commande.id, "CONFIRMEE")}>
                          Confirmer
                        </Button>
                      )}
                      {commande.statut === "CONFIRMEE" && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatut(commande.id, "EXPEDIEE")}>
                          Marquer expédiée
                        </Button>
                      )}
                      {(commande.statut === "CONFIRMEE" || commande.statut === "EXPEDIEE") && (
                        <Button size="sm" variant="default" onClick={() => handleUpdateStatut(commande.id, "LIVREE")}>
                          <Check className="mr-2 h-4 w-4" />
                          Marquer comme livrée
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => handleUpdateStatut(commande.id, "ANNULEE")}>
                        <X className="mr-2 h-4 w-4" />
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog Nouvelle Commande */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nouvelle Commande Fournisseur</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Fournisseur *</Label>
              <Select value={selectedFournisseur} onChange={(e) => setSelectedFournisseur(e.target.value)}>
                <option value="">Sélectionner un fournisseur...</option>
                {fournisseurs.map((fournisseur) => (
                  <option key={fournisseur.id} value={fournisseur.id}>
                    {fournisseur.nom}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-medium">Articles à commander</h3>
              <Button size="sm" variant="outline" onClick={handleAddToCart}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter un article
              </Button>
            </div>

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
                      <Input
                        type="number"
                        min="1"
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
                      <Label>Total</Label>
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

            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="text-lg font-medium">Total:</span>
              <span className="text-2xl font-bold">{calculateTotal().toFixed(2)} Ar</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            <Button onClick={handleSaveCommande} disabled={!selectedFournisseur || cart.length === 0 || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Créer la commande
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
