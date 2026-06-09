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
        <div className="rounded-full p-5" style={{ background: "#15321F" }}>
          <CheckCircle className="h-14 w-14" style={{ color: "#4ADE80" }} />
        </div>
      </div>

      {/* Titre */}
      <h1 className="font-display text-2xl font-black text-slate-100 mb-2">Commande enregistrée !</h1>
      <p className="text-mute mb-6">{state.message}</p>

      {/* Numéro de devis */}
      <div className="bg-accent-soft border border-accent/40 rounded-xl px-6 py-4 mb-8 inline-block">
        <p className="text-sm text-accent-400 font-medium">Numéro de commande</p>
        <p className="font-display text-2xl font-black text-accent tracking-wide mt-1">{state.numero}</p>
      </div>

      {/* Étapes suivantes */}
      <div className="bg-ink-800 border border-line rounded-xl p-6 text-left mb-8">
        <h2 className="font-display font-bold uppercase tracking-widest text-mute text-xs mb-4">Prochaines étapes</h2>
        <ol className="space-y-3">
          <li className="flex gap-3 text-sm text-slate-300">
            <span className="flex-shrink-0 w-6 h-6 bg-accent-soft text-accent-400 rounded-full flex items-center justify-center text-xs font-bold">
              1
            </span>
            Notre équipe vérifie la disponibilité de vos pièces.
          </li>
          <li className="flex gap-3 text-sm text-slate-300">
            <span className="flex-shrink-0 w-6 h-6 bg-accent-soft text-accent-400 rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            Nous vous appelons pour confirmer et convenir d'un mode de retrait ou de livraison.
          </li>
          <li className="flex gap-3 text-sm text-slate-300">
            <span className="flex-shrink-0 w-6 h-6 bg-accent-soft text-accent-400 rounded-full flex items-center justify-center text-xs font-bold">
              3
            </span>
            Vous récupérez vos pièces et effectuez le paiement.
          </li>
        </ol>
      </div>

      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-accent hover:bg-accent-600 text-ink-900 px-6 py-3 rounded-xl font-display font-bold transition-colors"
      >
        Retour au catalogue
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
