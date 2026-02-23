import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Package, AlertTriangle, TrendingDown, Plus, Minus, RefreshCw, Loader2, Download } from "lucide-react";
import { Piece, piecesApi, exportApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";

export default function StockManagement() {
  const { error: toastError } = useToast();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<"ENTREE" | "SORTIE" | "AJUSTEMENT">("ENTREE");
  const [movementQuantity, setMovementQuantity] = useState<number>(0);
  const [movementMotif, setMovementMotif] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPieces();
  }, []);

  const loadPieces = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await piecesApi.getAll();
      setPieces(data);
    } catch (err) {
      setError("Erreur lors du chargement des pièces");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const piecesFaibleStock = pieces.filter((p) => p.stock <= p.stockMin && p.stock > 0);
  const piecesRupture = pieces.filter((p) => p.stock === 0);
  const valeurTotaleStock = pieces.reduce((acc, p) => acc + p.stock * (p.prixAchat || p.prixVente), 0);

  const handleOpenMovement = (piece: Piece, type: "ENTREE" | "SORTIE" | "AJUSTEMENT") => {
    setSelectedPiece(piece);
    setMovementType(type);
    setMovementQuantity(0);
    setMovementMotif("");
    setIsMovementDialogOpen(true);
  };

  const handleSaveMovement = async () => {
    if (!selectedPiece || movementQuantity <= 0) return;

    try {
      setSaving(true);
      await piecesApi.adjustStock(selectedPiece.id, {
        type: movementType,
        quantite: movementQuantity,
        motif: movementMotif || `Mouvement de ${movementType.toLowerCase()}`,
      });
      await loadPieces();
      setIsMovementDialogOpen(false);
    } catch (err) {
      console.error("Erreur lors du mouvement de stock:", err);
      toastError("Erreur lors du mouvement de stock");
    } finally {
      setSaving(false);
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
        <Button onClick={loadPieces} className="mt-4">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Stocks</h1>
          <p className="text-muted-foreground">Surveillez et ajustez vos niveaux de stock</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportApi.downloadMouvements()}>
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Export mouvements</span>
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Totale du Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{valeurTotaleStock.toLocaleString('fr-FR')} Fmg</div>
            <p className="text-xs text-muted-foreground mt-1">{pieces.length} pièces différentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Faible</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{piecesFaibleStock.length}</div>
            <p className="text-xs text-muted-foreground mt-1">À réapprovisionner</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ruptures</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{piecesRupture.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Stock à 0</p>
          </CardContent>
        </Card>
      </div>

      {/* Ruptures de Stock */}
      {piecesRupture.length > 0 && (
        <Card className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
              Ruptures de Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {piecesRupture.map((piece) => (
                <div key={piece.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-background rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{piece.nom}</p>
                    <p className="text-sm text-muted-foreground">Réf: {piece.reference}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Rupture</Badge>
                    <Button size="sm" variant="destructive" onClick={() => handleOpenMovement(piece, "ENTREE")}>
                      <Plus className="h-4 w-4 mr-1" />
                      Commander
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertes Stock Faible */}
      {piecesFaibleStock.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              Alertes de Stock Faible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {piecesFaibleStock.map((piece) => (
                <div key={piece.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-background rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{piece.nom}</p>
                    <p className="text-sm text-muted-foreground">Réf: {piece.reference}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium whitespace-nowrap">
                        {piece.stock} / {piece.stockMin} min
                      </p>
                      <Badge variant="warning">Stock faible</Badge>
                    </div>
                    <Button size="sm" onClick={() => handleOpenMovement(piece, "ENTREE")}>
                      <Plus className="h-4 w-4 mr-1" />
                      Réappro
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toutes les pièces */}
      <Card>
        <CardHeader>
          <CardTitle>Toutes les Pièces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pieces.map((piece) => (
              <div key={piece.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{piece.nom}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {piece.reference} • {piece.marque?.nom || "-"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium whitespace-nowrap">Stock: {piece.stock}</p>
                    <p className="text-xs text-muted-foreground">Min: {piece.stockMin}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleOpenMovement(piece, "ENTREE")} title="Entrée">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenMovement(piece, "SORTIE")} title="Sortie">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenMovement(piece, "AJUSTEMENT")} title="Ajuster">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Mouvement de Stock */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === "ENTREE" && "Entrée de Stock"}
              {movementType === "SORTIE" && "Sortie de Stock"}
              {movementType === "AJUSTEMENT" && "Ajustement de Stock"}
            </DialogTitle>
          </DialogHeader>

          {selectedPiece && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedPiece.nom}</p>
                <p className="text-sm text-muted-foreground">Stock actuel: {selectedPiece.stock} unités</p>
              </div>

              <div>
                <Label htmlFor="quantite">{movementType === "AJUSTEMENT" ? "Nouveau stock" : "Quantité"}</Label>
                <Input
                  id="quantite"
                  type="number"
                  min="0"
                  value={movementQuantity}
                  onChange={(e) => setMovementQuantity(Number(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="motif">Motif</Label>
                <Input
                  id="motif"
                  placeholder="Ex: Réception commande, vente, inventaire..."
                  value={movementMotif}
                  onChange={(e) => setMovementMotif(e.target.value)}
                />
              </div>

              {movementType !== "AJUSTEMENT" && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    Nouveau stock:{" "}
                    <span className="font-bold">
                      {movementType === "ENTREE"
                        ? selectedPiece.stock + movementQuantity
                        : Math.max(0, selectedPiece.stock - movementQuantity)}{" "}
                      unités
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSaveMovement} disabled={movementQuantity <= 0 || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validation...
                </>
              ) : (
                "Valider"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
