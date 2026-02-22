import { useState } from "react";
import { Phone, Loader2, ClipboardList, ChevronDown, ChevronUp, Package } from "lucide-react";
import { publicApi, type Commande, type StatutCommande } from "../lib/api";
import { formatCurrency } from "../lib/utils";

// ─── Statut badge ──────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<StatutCommande, { label: string; classes: string }> = {
  BROUILLON: { label: "En cours de traitement", classes: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  ENVOYE:    { label: "Envoyée",                classes: "bg-blue-50 text-blue-700 border-blue-200" },
  ACCEPTE:   { label: "Acceptée",              classes: "bg-green-50 text-green-700 border-green-200" },
  REFUSE:    { label: "Refusée",               classes: "bg-red-50 text-red-700 border-red-200" },
  EXPIRE:    { label: "Expirée",               classes: "bg-gray-50 text-gray-500 border-gray-200" },
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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* En-tête */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="bg-brand-50 rounded-lg p-2.5 shrink-0">
            <Package className="h-5 w-5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 text-sm">{commande.numero}</span>
              <StatutBadge statut={commande.statut} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className="font-bold text-gray-900">{formatCurrency(commande.total)}</span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Détail articles */}
      {open && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left pb-2 font-medium">Article</th>
                <th className="text-center pb-2 font-medium w-16">Qté</th>
                <th className="text-right pb-2 font-medium">Prix unit.</th>
                <th className="text-right pb-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {commande.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-800 pr-4">{item.designation}</td>
                  <td className="py-2 text-center text-gray-500">{item.quantite}</td>
                  <td className="py-2 text-right text-gray-500">{formatCurrency(item.prixUnitaire)}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="pt-2 text-sm font-semibold text-gray-700 text-right pr-4">
                  Total
                </td>
                <td className="pt-2 text-right font-bold text-gray-900">{formatCurrency(commande.total)}</td>
              </tr>
            </tfoot>
          </table>

          {commande.notes && (
            <p className="mt-3 text-xs text-gray-400 italic">{commande.notes}</p>
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
        <div className="bg-brand-100 rounded-xl p-3">
          <ClipboardList className="h-6 w-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes commandes</h1>
          <p className="text-sm text-gray-500">Retrouvez toutes vos commandes en saisissant votre numéro de téléphone.</p>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Votre numéro de téléphone
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+261 XX XX XXX XX"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Rechercher
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </form>

      {/* Résultats */}
      {result && (
        <div>
          {result.commandes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucune commande trouvée</p>
              <p className="text-sm text-gray-400 mt-1">
                Vérifiez le numéro utilisé lors de votre commande.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  {result.clientNom && (
                    <span className="font-semibold text-gray-900">{result.clientNom} — </span>
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
