import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Package, Loader2, Upload, Star, Trash2, ImageIcon } from "lucide-react";
import { Piece, Image as PieceImage, piecesApi, imagesApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001";

export default function PieceDetails() {
  const { id } = useParams();
  const { canEdit } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [piece, setPiece] = useState<Piece | null>(null);
  const [images, setImages] = useState<PieceImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    if (!id) return;
    try {
      const data = await imagesApi.getByPiece(id);
      setImages(data);
    } catch {
      // Silently fail — images are optional
    }
  }, [id]);

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
    loadImages();
  }, [id, loadImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      setUploading(true);
      await imagesApi.upload(id, file);
      toastSuccess("Image ajoutée");
      loadImages();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur d'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSetPrincipale = async (imageId: string) => {
    try {
      await imagesApi.setPrincipale(imageId);
      loadImages();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await imagesApi.delete(imageId);
      toastSuccess("Image supprimée");
      loadImages();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur");
    }
  };

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

  const principaleImage = images.find((i) => i.principale) || images[0];

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

          {/* Images section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Photos ({images.length})
                </CardTitle>
                {canEdit && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Ajouter
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune photo</p>
              ) : (
                <div className="space-y-4">
                  {/* Main image */}
                  {principaleImage && (
                    <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={`${API_BASE}${principaleImage.url}`}
                        alt={principaleImage.alt || piece.nom}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {images.map((img) => (
                        <div key={img.id} className="relative group">
                          <div
                            className={`aspect-square rounded-lg overflow-hidden bg-muted border-2 ${
                              img.principale ? "border-blue-500" : "border-transparent"
                            }`}
                          >
                            <img
                              src={`${API_BASE}${img.url}`}
                              alt={img.alt || ""}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {canEdit && (
                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!img.principale && (
                                <button
                                  onClick={() => handleSetPrincipale(img.id)}
                                  className="bg-white/90 rounded p-1 hover:bg-white"
                                  title="Définir comme principale"
                                >
                                  <Star className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteImage(img.id)}
                                className="bg-white/90 rounded p-1 hover:bg-white text-red-500"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
