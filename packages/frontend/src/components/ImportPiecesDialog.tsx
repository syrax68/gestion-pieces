import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { piecesApi, type ImportResult } from "@/lib/api";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  Loader2,
  Info,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COLONNES = [
  { nom: "reference", requis: true, description: "Référence unique de la pièce" },
  { nom: "nom", requis: true, description: "Nom / désignation de la pièce" },
  { nom: "prixVente", requis: true, description: "Prix de vente (nombre entier ou décimal)" },
  { nom: "prixAchat", requis: false, description: "Prix d'achat (optionnel)" },
  { nom: "stock", requis: false, description: "Quantité en stock (défaut : 0)" },
  { nom: "stockMin", requis: false, description: "Stock minimum d'alerte (défaut : 0)" },
  { nom: "tauxTVA", requis: false, description: "Taux de TVA en % (défaut : 0)" },
  { nom: "marque", requis: false, description: "Nom de la marque (doit exister dans le système)" },
  { nom: "categorie", requis: false, description: "Nom de la catégorie (doit exister dans le système)" },
  { nom: "codeBarres", requis: false, description: "Code-barres (optionnel)" },
  { nom: "description", requis: false, description: "Description détaillée (optionnel)" },
];

export default function ImportPiecesDialog({ open, onClose, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    onClose();
  };

  const handleFile = (f: File) => {
    const lower = f.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      setError("Format non supporté. Utilisez un fichier Excel (.xlsx ou .xls).");
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await piecesApi.importXlsx(file);
      setResult(res);
      if (res.imported > 0) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await piecesApi.downloadTemplate();
    } catch {
      setError("Impossible de télécharger le template.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Import en masse — Pièces</h2>
              <p className="text-xs text-muted-foreground">Importez vos pièces depuis un fichier Excel</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Résultat après import */}
          {result ? (
            <div className="space-y-4">
              {/* Bilan */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                  <p className="text-xs text-green-600 font-medium">Importées</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                  <SkipForward className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                  <p className="text-xs text-amber-600 font-medium">Ignorées (doublon)</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                  <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
                  <p className="text-xs text-red-600 font-medium">Erreurs</p>
                </div>
              </div>

              {/* Détail des erreurs */}
              {result.errors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-red-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-semibold text-red-700">Détail des erreurs</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-red-100">
                    {result.errors.map((e, i) => (
                      <div key={i} className="px-4 py-2 flex items-start gap-3 text-sm">
                        <span className="text-red-400 font-mono shrink-0">Ligne {e.ligne}</span>
                        <span className="text-red-700">{e.erreur}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.imported > 0 && (
                <p className="text-sm text-center text-muted-foreground">
                  La liste des pièces a été actualisée automatiquement.
                </p>
              )}

              <Button onClick={handleClose} className="w-full">
                Fermer
              </Button>
            </div>
          ) : (
            <>
              {/* Étape 1 — Template */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Étape 1 — Téléchargez le modèle Excel
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Utilisez ce fichier comme base et remplissez vos données en respectant la structure.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="shrink-0">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Modèle .xlsx
                  </Button>
                </div>
              </div>

              {/* Étape 2 — Structure */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Structure du fichier Excel</p>
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Colonne</th>
                        <th className="text-center px-3 py-2 font-semibold text-muted-foreground w-24">Requis</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {COLONNES.map((col) => (
                        <tr key={col.nom} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2">
                            <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-foreground/80">
                              {col.nom}
                            </code>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {col.requis ? (
                              <span className="inline-block bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                Requis
                              </span>
                            ) : (
                              <span className="inline-block bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                                Optionnel
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{col.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Les pièces dont la référence existe déjà seront ignorées (pas de doublon).
                  Les marques et catégories doivent correspondre exactement aux noms existants dans le système.
                </p>
              </div>

              {/* Étape 3 — Upload */}
              <div>
                <p className="text-sm font-semibold mb-3">Étape 2 — Sélectionnez votre fichier</p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragging
                      ? "border-primary bg-primary/5"
                      : file
                      ? "border-green-400 bg-green-50"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                  />
                  {file ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-green-700">{file.name}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {(file.size / 1024).toFixed(1)} Ko · Cliquez pour changer de fichier
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">
                        Glissez votre fichier ici, ou cliquez pour choisir
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Fichiers acceptés : .xlsx, .xls</p>
                    </>
                  )}
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Annuler
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Import en cours…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Lancer l'import
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
