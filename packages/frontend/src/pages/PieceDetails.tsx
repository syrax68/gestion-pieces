import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Edit, Trash2, Package, Loader2 } from "lucide-react";
import { Piece, piecesApi } from "@/lib/api";

export default function PieceDetails() {
  const { id } = useParams();
  const [piece, setPiece] = useState<Piece | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await piecesApi.getById(id);
        setPiece(data);
      } catch {
        setError("Pièce introuvable");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !piece) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error || "Pièce introuvable"}</p>
        <Link to="/pieces">
          <Button className="mt-4">Retour à la liste</Button>
        </Link>
      </div>
    );
  }

  const marge = piece.prixAchat && piece.prixAchat > 0
    ? (((piece.prixVente - piece.prixAchat) / piece.prixAchat) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/pieces">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{piece.nom}</CardTitle>
                  <p className="text-muted-foreground mt-2">Référence: {piece.reference}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {piece.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{piece.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Marque</p>
                    <p className="font-medium">{piece.marque?.nom || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Catégorie</p>
                    <p className="font-medium">{piece.categorie?.nom || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fournisseur</p>
                    <p className="font-medium">{piece.fournisseur?.nom || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Emplacement</p>
                    <p className="font-medium">{piece.emplacement?.code || "-"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Quantité actuelle</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold">{piece.stock}</p>
                  {piece.stock === 0 && <Badge variant="destructive">Rupture</Badge>}
                  {piece.stock > 0 && piece.stock <= piece.stockMin && <Badge variant="warning">Faible</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Stock minimum: {piece.stockMin}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Prix de vente</p>
                <p className="text-2xl font-bold">{piece.prixVente.toLocaleString()} Fmg</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prix d'achat</p>
                <p className="text-lg font-medium">{piece.prixAchat ? `${piece.prixAchat.toLocaleString()} Fmg` : "-"}</p>
              </div>
              {marge && (
                <div>
                  <p className="text-sm text-muted-foreground">Marge</p>
                  <p className="text-lg font-medium text-green-600">{marge}%</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Date d'ajout</p>
                <p className="text-sm font-medium">{new Date(piece.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dernière mise à jour</p>
                <p className="text-sm font-medium">{new Date(piece.updatedAt).toLocaleDateString("fr-FR")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
