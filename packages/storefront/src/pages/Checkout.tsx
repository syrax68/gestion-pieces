import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, User, Package, Loader2, ShoppingBag } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { publicApi } from "../lib/api";
import { formatCurrency } from "../lib/utils";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();

  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="h-16 w-16 text-ink-500 mx-auto mb-4" />
        <h1 className="font-display text-xl font-bold text-slate-200 mb-2">Votre panier est vide</h1>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-ink-900 px-6 py-3 rounded-xl font-display font-bold transition-colors"
        >
          Voir le catalogue
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nom.trim().length < 2) {
      setError("Veuillez saisir votre nom complet.");
      return;
    }
    if (telephone.trim().length < 8) {
      setError("Veuillez saisir un numéro de téléphone valide.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await publicApi.createCommande({
        clientNom: nom.trim(),
        clientTelephone: telephone.trim(),
        items: items.map((i) => ({ pieceId: i.pieceId, quantite: i.quantite })),
      });

      clearCart();
      navigate("/confirmation", { state: { numero: result.numero, message: result.message } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/panier" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-slate-100 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Retour au panier
      </Link>

      <h1 className="font-display text-2xl font-black text-slate-100 mb-8">Finaliser la commande</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Formulaire */}
        <div className="flex-1">
          <div className="bg-ink-800 rounded-xl border border-line p-6">
            <h2 className="font-semibold text-slate-100 mb-1">Vos coordonnées</h2>
            <p className="text-sm text-mute mb-5">
              Nous vous contacterons à ce numéro pour confirmer votre commande et organiser la livraison ou le retrait.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom */}
              <div>
                <label htmlFor="nom" className="block text-sm font-medium text-slate-200 mb-1.5">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
                  <input
                    id="nom"
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Votre nom et prénom"
                    className="w-full pl-9 pr-4 py-2.5 bg-ink-900 border border-line rounded-lg text-sm text-slate-100 placeholder:text-mute focus:outline-none focus:border-accent transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label htmlFor="telephone" className="block text-sm font-medium text-slate-200 mb-1.5">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
                  <input
                    id="telephone"
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+261 XX XX XXX XX"
                    className="w-full pl-9 pr-4 py-2.5 bg-ink-900 border border-line rounded-lg text-sm text-slate-100 placeholder:text-mute focus:outline-none focus:border-accent transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Bouton */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-600 disabled:opacity-60 text-ink-900 py-3 rounded-xl font-display font-bold transition-colors mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5" />
                    Confirmer la commande
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-xs text-mute mt-4 text-center">
            En confirmant, vous acceptez que nous vous recontactions pour finaliser votre commande. Aucun paiement n'est requis en ligne.
          </p>
        </div>

        {/* Résumé */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-ink-800 rounded-xl border border-line p-5 sticky top-24">
            <h2 className="font-display font-bold uppercase tracking-widest text-mute text-xs mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ma commande
            </h2>

            <ul className="space-y-2 mb-4">
              {items.map((item) => (
                <li key={item.pieceId} className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-slate-300 leading-snug">
                    {item.nom}
                    <span className="text-mute ml-1">×{item.quantite}</span>
                  </span>
                  <span className="font-medium text-slate-100 shrink-0">
                    {formatCurrency(item.prix * item.quantite)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-line pt-3 flex justify-between font-display font-black text-accent">
              <span className="text-slate-100">Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
