import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  CheckCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  Layers,
  Weight,
  Ruler,
} from "lucide-react";
import { publicApi, type PieceDetail as PieceDetailType } from "../lib/api";
import { useCart } from "../contexts/CartContext";
import { formatCurrency, formatPrix } from "../lib/utils";

export default function PieceDetail() {
  const { id } = useParams<{ id: string }>();
  const [piece, setPiece] = useState<PieceDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  const { addItem, isInCart, items } = useCart();
  const inCart = piece ? isInCart(piece.id) : false;
  const cartItem = piece ? items.find((i) => i.pieceId === piece.id) : undefined;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    publicApi
      .getPiece(id)
      .then(setPiece)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="aspect-square skeleton rounded-2xl" />
          <div className="space-y-4">
            <div className="h-4 w-1/3 skeleton" />
            <div className="h-7 w-3/4 skeleton" />
            <div className="h-8 w-1/2 skeleton" />
            <div className="h-10 w-full skeleton mt-6" />
            <div className="h-12 w-full skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !piece) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-400 font-medium">{error || "Pièce introuvable"}</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour au catalogue
        </Link>
      </div>
    );
  }

  const prixAffiche = formatPrix(piece.prixVente, piece.prixPromo, piece.enPromotion);
  const rupture = piece.stock === 0;
  const stockFaible = !rupture && piece.stock <= piece.stockMin && piece.stockMin > 0;
  const images = piece.images.length > 0 ? piece.images : [];
  const currentImage = images[imageIndex];

  const handleAjouter = () => {
    if (rupture || inCart) return;
    addItem({
      pieceId: piece.id,
      nom: piece.nom,
      reference: piece.reference,
      prix: prixAffiche,
      image: currentImage?.url || null,
      stockMax: piece.stock,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Fil d'Ariane */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-slate-100 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Retour au catalogue
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Galerie images */}
        <div>
          {/* Image principale */}
          <div className="aspect-square bg-ink-700 rounded-2xl overflow-hidden relative border border-line">
            {currentImage ? (
              <img
                src={currentImage.url}
                alt={currentImage.alt || piece.nom}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-24 w-24 text-ink-500" />
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-ink-900/70 hover:bg-ink-900 rounded-full p-1.5 shadow transition"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-100" />
                </button>
                <button
                  onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-ink-900/70 hover:bg-ink-900 rounded-full p-1.5 shadow transition"
                >
                  <ChevronRight className="h-5 w-5 text-slate-100" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setImageIndex(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === imageIndex ? "border-accent" : "border-line hover:border-ink-500"
                  }`}
                >
                  <img src={img.url} alt={img.alt || ""} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Détails */}
        <div>
          {/* Marque + catégorie */}
          <div className="flex items-center gap-2 mb-2">
            {piece.marque && (
              <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                {piece.marque.nom}
              </span>
            )}
            {piece.categorie && (
              <span className="text-xs text-mute">· {piece.categorie.nom}</span>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-100 mb-1">{piece.nom}</h1>
          <p className="text-sm text-mute mb-4">Réf. {piece.reference}</p>

          {/* Prix */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-display text-3xl font-black text-accent">{formatCurrency(prixAffiche)}</span>
            {piece.enPromotion && piece.prixPromo && (
              <span className="text-lg text-mute line-through">{formatCurrency(piece.prixVente)}</span>
            )}
          </div>

          {/* Stock */}
          <div className="mb-6">
            {rupture ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full" style={{ background: "#3A1515", color: "#F87171" }}>
                Rupture de stock
              </span>
            ) : stockFaible ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full" style={{ background: "#3A2A12", color: "#FBBF24" }}>
                Stock limité — {piece.stock} disponible{piece.stock > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full" style={{ background: "#15321F", color: "#4ADE80" }}>
                En stock ({piece.stock} disponible{piece.stock > 1 ? "s" : ""})
              </span>
            )}
          </div>

          {/* Description */}
          {piece.description && (
            <p className="text-sm text-slate-300 leading-relaxed mb-6">{piece.description}</p>
          )}

          {/* Bouton ajouter */}
          <button
            onClick={handleAjouter}
            disabled={rupture}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base font-display font-bold transition-colors mb-3 ${
              rupture
                ? "bg-ink-700 text-mute cursor-not-allowed"
                : inCart
                  ? "bg-ink-700 text-emerald-400 cursor-default border border-line"
                  : "bg-accent hover:bg-accent-600 text-ink-900"
            }`}
          >
            {inCart ? (
              <>
                <CheckCircle className="h-5 w-5" />
                Dans le panier ({cartItem?.quantite})
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                Ajouter au panier
              </>
            )}
          </button>

          {inCart && (
            <Link
              to="/panier"
              className="block w-full text-center py-3 rounded-xl border border-accent text-accent hover:bg-accent-soft text-base font-display font-bold transition-colors"
            >
              Voir le panier
            </Link>
          )}

          {/* Caractéristiques */}
          <div className="mt-8 border-t border-line pt-6 space-y-3">
            <h2 className="font-display font-bold uppercase tracking-widest text-mute text-xs mb-3">Caractéristiques</h2>
            {piece.poids && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Weight className="h-4 w-4 text-mute" />
                <span>Poids : {piece.poids} kg</span>
              </div>
            )}
            {piece.dimensions && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Ruler className="h-4 w-4 text-mute" />
                <span>Dimensions : {piece.dimensions}</span>
              </div>
            )}
            {piece.sousCategorie && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Layers className="h-4 w-4 text-mute" />
                <span>Sous-catégorie : {piece.sousCategorie.nom}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
