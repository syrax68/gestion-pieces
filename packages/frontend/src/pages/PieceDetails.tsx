import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Package, Loader2, UploadCloud, Star, Trash2, ImageIcon, TrendingUp, X } from "lucide-react";
import { Piece, HistoriquePrix, Image as PieceImage, piecesApi, imagesApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";
import { useAuth } from "@/contexts/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001";
const mediaUrl = (url: string) => (url.startsWith("http") ? url : `${API_BASE}${url}`);

export default function PieceDetails() {
  const { id } = useParams();
  const { canEdit } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [piece, setPiece] = useState<Piece | null>(null);
  const [images, setImages] = useState<PieceImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

  const uploadFile = async (file: File) => {
    if (!id) return;
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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

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
        <div className="md:col-span-2 space-y-6 order-2 md:order-1">
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

          {/* Historique des prix */}
          {piece.historiquePrix && piece.historiquePrix.length > 1 && (
            <PriceHistoryCard historique={piece.historiquePrix} />
          )}

          {/* Images section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Photos ({images.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                className="hidden"
              />

              {images.length === 0 ? (
                canEdit ? (
                  /* Empty drop zone */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-all select-none ${
                      dragOver
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40"
                    }`}
                  >
                    {uploading ? (
                      <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    ) : (
                      <UploadCloud className={`h-12 w-12 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground/50"}`} />
                    )}
                    <div className="text-center">
                      <p className="font-semibold text-sm">Glisser une photo ici</p>
                      <p className="text-xs text-muted-foreground mt-1">ou <span className="text-primary underline underline-offset-2">cliquer pour parcourir</span></p>
                      <p className="text-xs text-muted-foreground/60 mt-3">JPG, PNG, WebP · max 5 Mo</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune photo disponible</p>
                )
              ) : (
                <div
                  className={`space-y-3 transition-all ${canEdit && dragOver ? "ring-2 ring-primary ring-offset-2 rounded-xl" : ""}`}
                  onDragOver={canEdit ? handleDragOver : undefined}
                  onDragLeave={canEdit ? handleDragLeave : undefined}
                  onDrop={canEdit ? handleDrop : undefined}
                >
                  {/* Main image */}
                  {principaleImage && (
                    <div
                      className="aspect-video relative rounded-xl overflow-hidden bg-muted cursor-zoom-in"
                      onClick={() => setSelectedImage(mediaUrl(principaleImage.url))}
                    >
                      <img
                        src={mediaUrl(principaleImage.url)}
                        alt={principaleImage.alt || piece.nom}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* Thumbnails grid + add tile */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {images.map((img) => (
                      <div key={img.id} className="relative group">
                        <div
                          className={`aspect-square rounded-lg overflow-hidden bg-muted border-2 cursor-pointer transition-all ${
                            img.principale ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                          }`}
                          onClick={() => setSelectedImage(mediaUrl(img.url))}
                        >
                          <img
                            src={mediaUrl(img.url)}
                            alt={img.alt || ""}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {img.principale && (
                          <div className="absolute bottom-1 left-1 pointer-events-none">
                            <span className="bg-primary text-primary-foreground text-[10px] px-1 rounded font-medium">★</span>
                          </div>
                        )}
                        {canEdit && (
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!img.principale && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSetPrincipale(img.id); }}
                                className="bg-white/95 dark:bg-zinc-800/95 rounded p-1 hover:bg-white dark:hover:bg-zinc-700 shadow-sm"
                                title="Définir comme principale"
                              >
                                <Star className="h-3 w-3 text-yellow-500" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id); }}
                              className="bg-white/95 dark:bg-zinc-800/95 rounded p-1 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-sm"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add more tile */}
                    {canEdit && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/40 transition-colors text-muted-foreground disabled:opacity-40"
                      >
                        {uploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <UploadCloud className="h-5 w-5" />
                        )}
                        <span className="text-[10px]">Ajouter</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lightbox */}
          {selectedImage && (
            <div
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              <button
                className="absolute top-4 right-4 text-white/80 hover:text-white"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-8 w-8" />
              </button>
              <img
                src={selectedImage}
                alt=""
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>

        <div className="space-y-6 order-1 md:order-2">
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

function PriceHistoryCard({ historique }: { historique: HistoriquePrix[] }) {
  const sorted = [...historique].sort(
    (a, b) => new Date(a.dateChangement).getTime() - new Date(b.dateChangement).getTime(),
  );

  const chartData = sorted.map((h) => ({
    date: new Date(h.dateChangement).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" }),
    "Prix vente": h.prixVente,
    "Prix achat": h.prixAchat ?? undefined,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Historique des prix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toLocaleString()} />
            <Tooltip formatter={(value) => [`${(value as number).toLocaleString()} Fmg`]} />
            <Legend />
            <Line type="monotone" dataKey="Prix vente" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Prix achat" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-1 px-2">Date</th>
                <th className="text-right py-1 px-2">Prix vente</th>
                <th className="text-right py-1 px-2">Prix achat</th>
                <th className="text-left py-1 px-2">Motif</th>
              </tr>
            </thead>
            <tbody>
              {[...historique].slice(0, 10).map((h) => (
                <tr key={h.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-1 px-2 text-muted-foreground text-xs">
                    {new Date(h.dateChangement).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-1 px-2 text-right font-medium">{h.prixVente.toLocaleString()} Fmg</td>
                  <td className="py-1 px-2 text-right text-muted-foreground">
                    {h.prixAchat ? `${h.prixAchat.toLocaleString()} Fmg` : "—"}
                  </td>
                  <td className="py-1 px-2 text-muted-foreground text-xs">{h.motif || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
