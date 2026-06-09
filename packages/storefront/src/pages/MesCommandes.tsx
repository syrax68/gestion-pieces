import { useState } from "react";
import { Phone, Loader2, ClipboardList, ChevronDown, ChevronUp, Package } from "lucide-react";
import { publicApi, type Commande, type StatutCommande } from "../lib/api";
import { formatCurrency } from "../lib/utils";

// ─── Statut badge ──────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<StatutCommande, { label: string; classes: string }> = {
  BROUILLON: { label: "En cours de traitement", classes: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  ENVOYE:    { label: "Envoyée",                classes: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  ACCEPTE:   { label: "Acceptée",              classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  REFUSE:    { label: "Refusée",               classes: "bg-red-500/10 text-red-400 border-red-500/30" },
  EXPIRE:    { label: "Expirée",               classes: "bg-ink-700 text-mute border-line" },
};

function StatutBadge({ statut }: { statut: StatutCommande }) {
  const { label, classes } = STATUT_CONFIG[statut] ?? STATUT_CONFIG.BROUILLON;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      {label}
    </span>
  );
}

// ─── Card commande ─────────────────────────────────────────────────────────

function CommandeCard({ commande }: { commande: Commande }) {
  const [open, setOpen] = useState(false);
  const date = new Date(commande.dateDevis).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-ink-800 rounded-xl border border-line overflow-hidden">
      {/* En-tête */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-ink-700 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="bg-accent-soft rounded-lg p-2.5 shrink-0">
            <Package className="h-5 w-5 text-accent-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-100 text-sm">{commande.numero}</span>
              <StatutBadge statut={commande.statut} />
            </div>
            <p className="text-xs text-mute mt-0.5">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className="font-display font-bold text-slate-100">{formatCurrency(commande.total)}</span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-mute" />
          ) : (
            <ChevronDown className="h-4 w-4 text-mute" />
          )}
        </div>
      </button>

      {/* Détail articles */}
      {open && (
        <div className="border-t border-line px-4 py-3 bg-ink-900/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-mute uppercase tracking-wide">
                <th className="text-left pb-2 font-medium">Article</th>
                <th className="text-center pb-2 font-medium w-16">Qté</th>
                <th className="text-right pb-2 font-medium">Prix unit.</th>
                <th className="text-right pb-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {commande.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-2 text-slate-200 pr-4">{item.designation}</td>
                  <td className="py-2 text-center text-mute">{item.quantite}</td>
                  <td className="py-2 text-right text-mute">{formatCurrency(item.prixUnitaire)}</td>
                  <td className="py-2 text-right font-medium text-slate-100">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <td colSpan={3} className="pt-2 text-sm font-semibold text-slate-300 text-right pr-4">
                  Total
                </td>
                <td className="pt-2 text-right font-display font-bold text-accent">{formatCurrency(commande.total)}</td>
              </tr>
            </tfoot>
          </table>

          {commande.notes && (
            <p className="mt-3 text-xs text-mute italic">{commande.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────

export default function MesCommandes() {
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ clientNom: string | null; commandes: Commande[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (telephone.trim().length < 8) {
      setError("Veuillez saisir un numéro de téléphone valide.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await publicApi.getMesCommandes(telephone.trim());
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-accent-soft rounded-xl p-3">
          <ClipboardList className="h-6 w-6 text-accent-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-black text-slate-100">Mes commandes</h1>
          <p className="text-sm text-mute">Retrouvez toutes vos commandes en saisissant votre numéro de téléphone.</p>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-ink-800 rounded-xl border border-line p-5 mb-6">
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Votre numéro de téléphone
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+261 XX XX XXX XX"
              className="w-full pl-9 pr-4 py-2.5 bg-ink-900 border border-line rounded-lg text-sm text-slate-100 placeholder:text-mute focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-accent hover:bg-accent-600 disabled:opacity-60 text-ink-900 px-5 py-2.5 rounded-lg text-sm font-display font-bold transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Rechercher
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </form>

      {/* Résultats */}
      {result && (
        <div>
          {result.commandes.length === 0 ? (
            <div className="text-center py-12 bg-ink-800 rounded-xl border border-line">
              <ClipboardList className="h-10 w-10 text-ink-500 mx-auto mb-3" />
              <p className="text-slate-200 font-medium">Aucune commande trouvée</p>
              <p className="text-sm text-mute mt-1">
                Vérifiez le numéro utilisé lors de votre commande.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-300">
                  {result.clientNom && (
                    <span className="font-semibold text-slate-100">{result.clientNom} — </span>
                  )}
                  {result.commandes.length} commande{result.commandes.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-3">
                {result.commandes.map((commande) => (
                  <CommandeCard key={commande.id} commande={commande} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
