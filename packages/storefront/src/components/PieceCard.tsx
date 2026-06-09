import { Link } from "react-router-dom";
import { ShoppingCart, Package, Minus, Plus, Eye } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { formatCurrency, formatPrix } from "../lib/utils";
import type { PieceListItem } from "../lib/api";

interface PieceCardProps {
  piece: PieceListItem;
}

export default function PieceCard({ piece }: PieceCardProps) {
  const { addItem, updateQuantite, items } = useCart();
  const cartItem = items.find((i) => i.pieceId === piece.id);
  const prixAffiche = formatPrix(piece.prixVente, piece.prixPromo, piece.enPromotion);
  const rupture = piece.stock === 0;
  const stockFaible = !rupture && piece.stock <= piece.stockMin && piece.stockMin > 0;

  const handleAjouter = (e: React.MouseEvent) => {
    e.preventDefault();
    if (rupture) return;
    addItem({
      pieceId: piece.id,
      nom: piece.nom,
      reference: piece.reference,
      prix: prixAffiche,
      image: piece.image?.url || null,
      stockMax: piece.stock,
    });
  };

  const handleMoins = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cartItem) return;
    updateQuantite(piece.id, cartItem.quantite - 1);
  };

  const handlePlus = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cartItem) return;
    updateQuantite(piece.id, cartItem.quantite + 1);
  };

  return (
    <Link
      to={`/pieces/${piece.id}`}
      className="group relative bg-ink-800 rounded-2xl overflow-hidden border border-line hover:border-accent transition-all duration-300 flex flex-col"
    >
      {/* Zone image */}
      <div className="relative aspect-square bg-ink-700 overflow-hidden">
        {piece.image ? (
          <img
            src={piece.image.url}
            alt={piece.image.alt || piece.nom}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-14 w-14 text-ink-500" />
          </div>
        )}

        {/* Overlay sombre au hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {rupture && (
            <span className="bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
              Rupture
            </span>
          )}
          {stockFaible && (
            <span className="bg-amber-500 text-ink-900 text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
              Stock limité
            </span>
          )}
          {piece.enPromotion && piece.prixPromo && (
            <span className="bg-accent text-ink-900 text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
              Promo
            </span>
          )}
        </div>

        {/* Boutons overlay (apparaissent au hover) */}
        {!rupture && (
          <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            {cartItem ? (
              /* Contrôle quantité au hover */
              <div
                className="flex items-center bg-ink-800 border border-line rounded-xl overflow-hidden shadow-lg"
                onClick={(e) => e.preventDefault()}
              >
                <button
                  onClick={handleMoins}
                  className="px-3 py-2.5 hover:bg-ink-700 text-slate-200 transition-colors font-bold"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2.5 text-sm font-bold text-slate-100 border-x border-line min-w-[2.5rem] text-center">
                  {cartItem.quantite}
                </span>
                <button
                  onClick={handlePlus}
                  disabled={cartItem.quantite >= piece.stock}
                  className="px-3 py-2.5 hover:bg-ink-700 text-slate-200 transition-colors font-bold disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleAjouter}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-600 text-ink-900 px-4 py-2.5 rounded-xl shadow-lg text-sm font-display font-bold transition-colors"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Ajouter
                </button>
                <div className="bg-ink-800/90 hover:bg-ink-800 text-slate-200 p-2.5 rounded-xl shadow-lg transition-colors">
                  <Eye className="h-4 w-4" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Indicateur "dans le panier" (coin bas droit) */}
        {cartItem && (
          <div className="absolute bottom-3 right-3 bg-accent text-ink-900 text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-md">
            {cartItem.quantite}
          </div>
        )}
      </div>

      {/* Infos produit */}
      <div className="p-4">
        {/* Marque */}
        {piece.marque && (
          <span className="inline-block text-[11px] font-semibold text-accent uppercase tracking-widest mb-1">
            {piece.marque.nom}
          </span>
        )}

        {/* Nom */}
        <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug mb-1">
          {piece.nom}
        </h3>

        {/* Prix */}
        <div className="mt-2">
          <span className="font-display text-lg font-black text-accent">{formatCurrency(prixAffiche)}</span>
          {piece.enPromotion && piece.prixPromo && (
            <span className="ml-2 text-[11px] text-mute line-through">
              {formatCurrency(piece.prixVente)}
            </span>
          )}
        </div>

        {/* Bouton Ajouter — visible seulement sur mobile (hover indisponible sur touch) */}
        {!rupture && !cartItem && (
          <div className="sm:hidden mt-3" onClick={(e) => e.preventDefault()}>
            <button
              onClick={handleAjouter}
              className="w-full flex items-center justify-center gap-1.5 bg-accent text-ink-900 py-2 rounded-lg text-sm font-display font-bold"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Ajouter
            </button>
          </div>
        )}

        {/* Contrôles quantité si déjà dans le panier */}
        {cartItem && (
          <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
            <span className="text-xs text-mute">{cartItem.quantite} dans le panier</span>
            <div
              className="flex items-center border border-line rounded-lg overflow-hidden"
              onClick={(e) => e.preventDefault()}
            >
              <button onClick={handleMoins} className="px-2 py-1 hover:bg-ink-700 text-mute transition-colors">
                <Minus className="h-3 w-3" />
              </button>
              <span className="px-2.5 text-xs font-bold text-slate-200 border-x border-line">
                {cartItem.quantite}
              </span>
              <button
                onClick={handlePlus}
                disabled={cartItem.quantite >= piece.stock}
                className="px-2 py-1 hover:bg-ink-700 text-mute transition-colors disabled:opacity-30"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
