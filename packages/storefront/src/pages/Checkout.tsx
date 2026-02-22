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
        <ShoppingBag className="h-16 w-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-700 mb-2">Votre panier est vide</h1>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
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
      <Link to="/panier" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Retour au panier
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Finaliser la commande</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Formulaire */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Vos coordonnées</h2>
            <p className="text-sm text-gray-500 mb-5">
              Nous vous contacterons à ce numéro pour confirmer votre commande et organiser la livraison ou le retrait.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom */}
              <div>
                <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="nom"
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Votre nom et prénom"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="telephone"
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+261 XX XX XXX XX"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Bouton */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold transition-colors mt-2"
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

          <p className="text-xs text-gray-400 mt-4 text-center">
            En confirmant, vous acceptez que nous vous recontactions pour finaliser votre commande. Aucun paiement n'est requis en ligne.
          </p>
        </div>

        {/* Résumé */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              Ma commande
            </h2>

            <ul className="space-y-2 mb-4">
              {items.map((item) => (
                <li key={item.pieceId} className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-gray-700 leading-snug">
                    {item.nom}
                    <span className="text-gray-400 ml-1">×{item.quantite}</span>
                  </span>
                  <span className="font-medium text-gray-900 shrink-0">
                    {formatCurrency(item.prix * item.quantite)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
