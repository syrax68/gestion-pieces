import { useLocation, Link, Navigate } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";

interface ConfirmationState {
  numero: string;
  message: string;
}

export default function Confirmation() {
  const location = useLocation();
  const state = location.state as ConfirmationState | null;

  if (!state?.numero) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center animate-fade-in">
      {/* Icône succès */}
      <div className="flex justify-center mb-6">
        <div className="bg-green-100 rounded-full p-5">
          <CheckCircle className="h-14 w-14 text-green-500" />
        </div>
      </div>

      {/* Titre */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Commande enregistrée !</h1>
      <p className="text-gray-500 mb-6">{state.message}</p>

      {/* Numéro de devis */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl px-6 py-4 mb-8 inline-block">
        <p className="text-sm text-brand-600 font-medium">Numéro de commande</p>
        <p className="text-2xl font-bold text-brand-700 tracking-wide mt-1">{state.numero}</p>
      </div>

      {/* Étapes suivantes */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-left mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Prochaines étapes</h2>
        <ol className="space-y-3">
          <li className="flex gap-3 text-sm text-gray-600">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold">
              1
            </span>
            Notre équipe vérifie la disponibilité de vos pièces.
          </li>
          <li className="flex gap-3 text-sm text-gray-600">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span className="flex items-center gap-1.5">
              rajouNous vous appelons pour confirmer et convenir d'un mode de retrait ou livraison.
            </span>
          </li>
          <li className="flex gap-3 text-sm text-gray-600">
            <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold">
              3
            </span>
            Vous récupérez vos pièces et effectuez le paiement.
          </li>
        </ol>
      </div>

      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
      >
        Retour au catalogue
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
