import { useState, useEffect, useRef } from "react";
import { Piece, piecesApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Loader2, Search, ArrowRight, AlertTriangle } from "lucide-react";

interface ReplacePieceDialogProps {
  piece: Piece;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReplacePieceDialog({ piece, open, onClose, onSuccess }: ReplacePieceDialogProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Piece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) {
      setSearch("");
      setResults([]);
      setSelectedPiece(null);
      setError(null);
      setConfirming(false);
    }
  }, [open]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (search.length < 2) {
      setResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        setLoading(true);
        const pieces = await piecesApi.getAll({ search });
        setResults(pieces.filter((p) => p.id !== piece.id));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [search, piece.id]);

  const handleReplace = async () => {
    if (!selectedPiece) return;

    if (!confirming) {
      setConfirming(true);
      return;
    }

    try {
      setReplacing(true);
      setError(null);
      await piecesApi.replace(piece.id, selectedPiece.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors du remplacement");
      setConfirming(false);
    } finally {
      setReplacing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Remplacer une piece</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Old piece info */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs font-medium text-destructive mb-1">Piece a remplacer</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{piece.nom}</p>
                <p className="text-sm text-muted-foreground">
                  {piece.reference} - {piece.fournisseur?.nom || "Sans fournisseur"}
                </p>
              </div>
              <div className="text-right text-sm">
                <p>Prix: {piece.prixVente.toLocaleString()} Fmg</p>
                <p>Stock: {piece.stock}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Search for replacement */}
          {!selectedPiece ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher la piece de remplacement..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setConfirming(false);
                  }}
                  autoFocus
                />
              </div>

              {loading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}

              {results.length > 0 && (
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPiece(p);
                        setConfirming(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{p.nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.reference} - {p.fournisseur?.nom || "Sans fournisseur"}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <p>{p.prixVente.toLocaleString()} Fmg</p>
                          <p>Stock: {p.stock}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {search.length >= 2 && !loading && results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune piece trouvee</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-xs font-medium text-primary mb-1">Piece de remplacement</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selectedPiece.nom}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPiece.reference} - {selectedPiece.fournisseur?.nom || "Sans fournisseur"}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Prix: {selectedPiece.prixVente.toLocaleString()} Fmg</p>
                    <p>Stock: {selectedPiece.stock}</p>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPiece(null);
                  setConfirming(false);
                }}
              >
                Changer la selection
              </Button>
            </div>
          )}

          {/* Confirmation warning */}
          {confirming && selectedPiece && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Confirmer le remplacement ?</p>
                <p className="text-muted-foreground mt-1">
                  Toutes les factures et mouvements de stock seront transferes vers "{selectedPiece.nom}". Les prix seront mis a jour et
                  l'ancienne piece sera supprimee.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={replacing}>
            Annuler
          </Button>
          <Button onClick={handleReplace} disabled={!selectedPiece || replacing} variant={confirming ? "destructive" : "default"}>
            {replacing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Remplacement...
              </>
            ) : confirming ? (
              "Confirmer le remplacement"
            ) : (
              "Remplacer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
