import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  CheckCircle,
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Tag,
  Layers,
  Weight,
  Ruler,
  Bike,
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
      <div className="flex justify-center items-center py-32">
        <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (error || !piece) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 font-medium">{error || "Pièce introuvable"}</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
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
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Retour au catalogue
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Galerie images */}
        <div>
          {/* Image principale */}
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative">
            {currentImage ? (
              <img
                src={currentImage.url}
                alt={currentImage.alt || piece.nom}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-24 w-24 text-gray-300" />
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition"
                >
                  <ChevronRight className="h-5 w-5 text-gray-700" />
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
                    i === imageIndex ? "border-brand-500" : "border-gray-200 hover:border-gray-300"
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
              <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
                {piece.marque.nom}
              </span>
            )}
            {piece.categorie && (
              <span className="text-xs text-gray-400">· {piece.categorie.nom}</span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">{piece.nom}</h1>
          <p className="text-sm text-gray-400 mb-4">Réf. {piece.reference}</p>

          {/* Prix */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-gray-900">{formatCurrency(prixAffiche)}</span>
            {piece.enPromotion && piece.prixPromo && (
              <span className="text-lg text-gray-400 line-through">{formatCurrency(piece.prixVente)}</span>
            )}
          </div>

          {/* Stock */}
          <div className="mb-6">
            {rupture ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
                Rupture de stock
              </span>
            ) : stockFaible ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                Stock limité — {piece.stock} disponible{piece.stock > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">
                En stock ({piece.stock} disponible{piece.stock > 1 ? "s" : ""})
              </span>
            )}
          </div>

          {/* Description */}
          {piece.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-6">{piece.description}</p>
          )}

          {/* Bouton ajouter */}
          <button
            onClick={handleAjouter}
            disabled={rupture}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base font-semibold transition-colors mb-3 ${
              rupture
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : inCart
                  ? "bg-green-100 text-green-700 cursor-default"
                  : "bg-brand-600 hover:bg-brand-700 text-white"
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
              className="block w-full text-center py-3 rounded-xl border border-brand-600 text-brand-600 hover:bg-brand-50 text-base font-semibold transition-colors"
            >
              Voir le panier
            </Link>
          )}

          {/* Caractéristiques */}
          <div className="mt-8 border-t border-gray-100 pt-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Caractéristiques</h2>
            {piece.poids && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Weight className="h-4 w-4 text-gray-400" />
                <span>Poids : {piece.poids} kg</span>
              </div>
            )}
            {piece.dimensions && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Ruler className="h-4 w-4 text-gray-400" />
                <span>Dimensions : {piece.dimensions}</span>
              </div>
            )}
            {piece.sousCategorie && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Layers className="h-4 w-4 text-gray-400" />
                <span>Sous-catégorie : {piece.sousCategorie.nom}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Tag className="h-4 w-4 text-gray-400" />
              <span>TVA : {piece.tauxTVA}%</span>
            </div>
          </div>

          {/* Compatibilité */}
          {piece.modelesCompatibles.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Bike className="h-4 w-4 text-gray-400" />
                Compatibilité véhicules
              </h2>
              <ul className="space-y-1.5">
                {piece.modelesCompatibles.map((comp, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    <span className="font-medium">{comp.modele.marque.nom} {comp.modele.nom}</span>
                    {(comp.modele.anneeDebut || comp.modele.anneeFin) && (
                      <span className="text-gray-400">
                        {" "}({comp.modele.anneeDebut}
                        {comp.modele.anneeFin && comp.modele.anneeFin !== comp.modele.anneeDebut
                          ? `–${comp.modele.anneeFin}`
                          : ""}
                        )
                      </span>
                    )}
                    {comp.notes && <span className="text-gray-400"> — {comp.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
