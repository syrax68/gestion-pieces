import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { ShoppingCart, Plus, Trash2, Check, X, Loader2 } from "lucide-react";
import { Achat, Piece, achatsApi, piecesApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";

interface CartItem {
  id: string;
  pieceId: string;
  pieceName: string;
  pieceReference: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
  total: number;
}

export default function Achats() {
  const { error: toastError } = useToast();
  const [achats, setAchats] = useState<Achat[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
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
      const [achatsData, piecesData] = await Promise.all([achatsApi.getAll(), piecesApi.getAll()]);
      setAchats(achatsData);
      setPieces(piecesData);
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
      tva: 0,
      total: 0,
    };
    setCart([...cart, newItem]);
  };

  const handleUpdateCartItem = (index: number, field: string, value: string | number) => {
    const updatedCart = [...cart];

    if (field === "pieceId") {
      const piece = pieces.find((p) => p.id === value);
      if (piece) {
        const prix = piece.prixAchat || piece.prixVente * 0.7;
        updatedCart[index] = {
          ...updatedCart[index],
          pieceId: piece.id,
          pieceName: piece.nom,
          pieceReference: piece.reference,
          prixUnitaire: prix,
          total: updatedCart[index].quantite * prix,
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

  const handleSaveAchat = async () => {
    if (cart.length === 0 || cart.some((item) => !item.pieceId)) {
      toastError("Veuillez ajouter au moins une pièce valide");
      return;
    }

    try {
      setSaving(true);
      await achatsApi.create({
        items: cart.map((item) => ({
          pieceId: item.pieceId,
          quantite: item.quantite,
          prixUnitaire: item.prixUnitaire,
          tva: item.tva,
        })),
        notes: notes || undefined,
      });
      await loadData();
      setCart([]);
      setNotes("");
      setIsFormOpen(false);
    } catch (err) {
      console.error("Erreur lors de la création de l'achat:", err);
      toastError("Erreur lors de la création de l'achat");
    } finally {
      setSaving(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "PAYEE":
        return <Badge variant="success">Payée</Badge>;
      case "EN_ATTENTE":
        return <Badge variant="warning">En attente</Badge>;
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
          <h1 className="text-3xl font-bold tracking-tight">Achats Directs</h1>
          <p className="text-muted-foreground">Gérez vos achats de pièces en local</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel Achat
        </Button>
      </div>

      {/* Liste des achats */}
      <div className="space-y-4">
        {achats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucun achat</h3>
              <p className="text-muted-foreground mt-2">Commencez par créer un nouvel achat</p>
            </CardContent>
          </Card>
        ) : (
          achats.map((achat) => (
            <Card key={achat.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{achat.numero}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{new Date(achat.dateAchat).toLocaleDateString("fr-FR")}</p>
                    {achat.fournisseur && <p className="text-sm text-muted-foreground">Fournisseur: {achat.fournisseur.nom}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatutBadge(achat.statut)}
                    <p className="text-xl font-bold">{achat.total.toFixed(2)} Fmg</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {achat.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">{item.piece?.nom || "-"}</p>
                        <p className="text-sm text-muted-foreground">Réf: {item.piece?.reference || "-"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {item.quantite} × {item.prixUnitaire.toFixed(2)} Fmg
                        </p>
                        <p className="text-sm text-muted-foreground">{item.total.toFixed(2)} Fmg</p>
                      </div>
                    </div>
                  ))}
                </div>
                {achat.notes && (
                  <div className="mt-4 p-2 bg-muted rounded">
                    <p className="text-sm">
                      <span className="font-medium">Notes:</span> {achat.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog Nouvel Achat */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nouvel Achat Direct</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Articles</h3>
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

            <div>
              <Label>Notes</Label>
              <Input placeholder="Notes optionnelles..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="text-lg font-medium">Total:</span>
              <span className="text-2xl font-bold">{calculateTotal().toFixed(2)} Fmg</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            <Button onClick={handleSaveAchat} disabled={cart.length === 0 || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validation...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Valider l'achat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
