import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, Package, MessageCircle } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { formatCurrency } from "../lib/utils";
import { publicApi, type BoutiqueInfo } from "../lib/api";

export default function Cart() {
  const { items, total, removeItem, updateQuantite } = useCart();
  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);

  useEffect(() => {
    publicApi.getBoutique().then(setBoutique).catch(() => {});
  }, []);

  const whatsappHref = (() => {
    if (!boutique?.telephone) return null;
    const numero = boutique.telephone.replace(/[^0-9]/g, "");
    const lignes = items.map((i) => `• ${i.nom} ×${i.quantite} — ${formatCurrency(i.prix * i.quantite)}`);
    const texte = `Bonjour, je souhaite commander :\n${lignes.join("\n")}\n\nTotal : ${formatCurrency(total)}`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texte)}`;
  })();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="flex justify-center mb-4">
          <ShoppingCart className="h-16 w-16 text-ink-500" />
        </div>
        <h1 className="font-display text-xl font-bold text-slate-200 mb-2">Votre panier est vide</h1>
        <p className="text-mute mb-6">Parcourez notre catalogue pour ajouter des pièces.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-ink-900 px-6 py-3 rounded-xl font-display font-bold transition-colors"
        >
          Voir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-black text-slate-100 mb-6">
        Mon panier <span className="text-mute font-normal text-lg">({items.length} article{items.length > 1 ? "s" : ""})</span>
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Liste des articles */}
        <div className="flex-1 space-y-3">
          {items.map((item) => (
            <div key={item.pieceId} className="bg-ink-800 rounded-xl border border-line p-4 flex gap-4">
              {/* Image */}
              <div className="w-20 h-20 shrink-0 rounded-lg bg-ink-700 overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.nom} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-ink-500" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-100 text-sm truncate">{item.nom}</h3>
                <p className="text-xs text-mute mt-0.5">Réf. {item.reference}</p>
                <p className="text-sm font-medium text-slate-300 mt-1">{formatCurrency(item.prix)} / unité</p>

                <div className="flex items-center justify-between mt-3">
                  {/* Quantité */}
                  <div className="flex items-center border border-line rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantite(item.pieceId, item.quantite - 1)}
                      className="px-2.5 py-1.5 hover:bg-ink-700 text-mute transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-3 py-1.5 text-sm font-semibold text-slate-100 border-x border-line min-w-[2.5rem] text-center">
                      {item.quantite}
                    </span>
                    <button
                      onClick={() => updateQuantite(item.pieceId, item.quantite + 1)}
                      disabled={item.quantite >= item.stockMax}
                      className="px-2.5 py-1.5 hover:bg-ink-700 text-mute transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Total + supprimer */}
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-bold text-slate-100">
                      {formatCurrency(item.prix * item.quantite)}
                    </span>
                    <button
                      onClick={() => removeItem(item.pieceId)}
                      className="text-mute hover:text-red-400 transition-colors"
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
          <div className="bg-ink-800 rounded-xl border border-line p-5 sticky top-24">
            <h2 className="font-display font-bold uppercase tracking-widest text-mute text-xs mb-4">Récapitulatif</h2>

            <div className="space-y-2 text-sm mb-4">
              {items.map((item) => (
                <div key={item.pieceId} className="flex justify-between text-slate-300">
                  <span className="truncate mr-2">{item.nom} ×{item.quantite}</span>
                  <span className="shrink-0">{formatCurrency(item.prix * item.quantite)}</span>
                </div>
              ))}
              <div className="border-t border-line pt-2 flex justify-between font-display font-black text-accent text-base">
                <span className="text-slate-100">Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Link
              to="/commander"
              className="flex items-center justify-center gap-2 w-full bg-accent hover:bg-accent-600 text-ink-900 py-3 rounded-xl font-display font-bold transition-colors"
            >
              Commander
              <ArrowRight className="h-4 w-4" />
            </Link>

            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-3 py-3 rounded-xl font-semibold border border-line transition-colors"
                style={{ color: "#4ADE80" }}
              >
                <MessageCircle className="h-4 w-4" />
                Commander sur WhatsApp
              </a>
            )}

            <Link
              to="/"
              className="block text-center mt-3 text-sm text-mute hover:text-slate-100"
            >
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
