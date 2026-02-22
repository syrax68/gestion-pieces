import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, Package } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { formatCurrency } from "../lib/utils";

export default function Cart() {
  const { items, total, removeItem, updateQuantite } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="flex justify-center mb-4">
          <ShoppingCart className="h-16 w-16 text-gray-200" />
        </div>
        <h1 className="text-xl font-semibold text-gray-700 mb-2">Votre panier est vide</h1>
        <p className="text-gray-400 mb-6">Parcourez notre catalogue pour ajouter des pièces.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
        >
          Voir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Mon panier <span className="text-gray-400 font-normal text-lg">({items.length} article{items.length > 1 ? "s" : ""})</span>
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Liste des articles */}
        <div className="flex-1 space-y-3">
          {items.map((item) => (
            <div key={item.pieceId} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
              {/* Image */}
              <div className="w-20 h-20 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.nom} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{item.nom}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Réf. {item.reference}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{formatCurrency(item.prix)} / unité</p>

                <div className="flex items-center justify-between mt-3">
                  {/* Quantité */}
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantite(item.pieceId, item.quantite - 1)}
                      className="px-2.5 py-1.5 hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-3 py-1.5 text-sm font-semibold text-gray-900 border-x border-gray-200 min-w-[2.5rem] text-center">
                      {item.quantite}
                    </span>
                    <button
                      onClick={() => updateQuantite(item.pieceId, item.quantite + 1)}
                      disabled={item.quantite >= item.stockMax}
                      className="px-2.5 py-1.5 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Total + supprimer */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(item.prix * item.quantite)}
                    </span>
                    <button
                      onClick={() => removeItem(item.pieceId)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Résumé commande */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
            <h2 className="font-semibold text-gray-900 mb-4">Récapitulatif</h2>

            <div className="space-y-2 text-sm mb-4">
              {items.map((item) => (
                <div key={item.pieceId} className="flex justify-between text-gray-600">
                  <span className="truncate mr-2">{item.nom} ×{item.quantite}</span>
                  <span className="shrink-0">{formatCurrency(item.prix * item.quantite)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Link
              to="/commander"
              className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Commander
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/"
              className="block text-center mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
