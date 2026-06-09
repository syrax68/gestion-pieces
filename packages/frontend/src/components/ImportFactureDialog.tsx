import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, Loader2, Check, Plus, AlertCircle, Trash2, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { piecesApi, fournisseursApi, Fournisseur } from "@/lib/api";

type InvoiceItem = {
  nom: string;
  quantite: number;
  prix: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type Step = "upload" | "review" | "done";

export function ImportFactureDialog({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [devise, setDevise] = useState<"ariary" | "fmg">("ariary");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [fournisseurInput, setFournisseurInput] = useState("");
  const [fournisseurId, setFournisseurId] = useState<string | undefined>();
  const [fournisseurOpen, setFournisseurOpen] = useState(false);
  const [creatingFournisseur, setCreatingFournisseur] = useState(false);

  useEffect(() => {
    if (step === "review") {
      fournisseursApi.getAll().then(setFournisseurs).catch(() => {});
    }
  }, [step]);

  const reset = () => {
    setStep("upload");
    setDevise("ariary");
    setImage(null);
    setPreview(null);
    setItems([]);
    setParsing(false);
    setSaving(false);
    setParseError(null);
    setSaveResult(null);
    setFournisseurInput("");
    setFournisseurId(undefined);
    setFournisseurOpen(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = useCallback((file: File) => {
    setImage(file);
    setParseError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const handleAnalyse = async () => {
    if (!image) return;
    setParsing(true);
    setParseError(null);
    try {
      const result = await piecesApi.parseInvoice(image);
      if (result.items.length === 0) {
        setParseError("Aucune pièce détectée. Vérifiez que la photo est nette et bien cadrée.");
        return;
      }
      setItems(result.items);
      setStep("review");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Erreur lors de l'analyse");
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await piecesApi.bulkUpdate(items, devise, fournisseurId);
      setSaveResult(result);
      setStep("done");
      onSuccess();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const filteredFournisseurs = fournisseurs.filter((f) =>
    f.nom.toLowerCase().includes(fournisseurInput.toLowerCase()),
  );

  const handleSelectFournisseur = (f: Fournisseur) => {
    setFournisseurId(f.id);
    setFournisseurInput(f.nom);
    setFournisseurOpen(false);
  };

  const handleCreateFournisseur = async () => {
    const nom = fournisseurInput.trim();
    if (!nom) return;
    setCreatingFournisseur(true);
    try {
      const created = await fournisseursApi.create({ nom, pays: "Madagascar" });
      setFournisseurs((prev) => [...prev, created]);
      handleSelectFournisseur(created);
    } catch {
      // silently fail — user can retry
    } finally {
      setCreatingFournisseur(false);
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, [field]: field === "nom" ? value : Number(value) || 0 }
          : item,
      ),
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { nom: "", quantite: 1, prix: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Import facture fournisseur
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1 : Upload */}
        {step === "upload" && (
          <div className="space-y-5">
            {/* Devise toggle */}
            <div className="flex items-center gap-3">
              <Label>Devise de la facture :</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={devise === "ariary" ? "default" : "outline"}
                  onClick={() => setDevise("ariary")}
                >
                  Ariary
                </Button>
                <Button
                  size="sm"
                  variant={devise === "fmg" ? "default" : "outline"}
                  onClick={() => setDevise("fmg")}
                >
                  FMG (÷5)
                </Button>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
            >
              {preview ? (
                <div className="space-y-3">
                  <img src={preview} alt="Aperçu facture" className="max-h-64 mx-auto rounded object-contain" />
                  <p className="text-sm text-gray-500">{image?.name}</p>
                  <p className="text-xs text-gray-400">Cliquez pour changer d'image</p>
                </div>
              ) : (
                <div className="space-y-3 text-gray-500">
                  <Upload className="h-12 w-12 mx-auto text-gray-300" />
                  <p className="font-medium">Glissez une photo de facture ici</p>
                  <p className="text-sm">ou cliquez pour sélectionner une image</p>
                  <p className="text-xs text-gray-400">JPG, PNG, WEBP — max 20 Mo</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {parseError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {parseError}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Annuler
              </Button>
              <Button onClick={handleAnalyse} disabled={!image || parsing}>
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse en cours…
                  </>
                ) : (
                  "Analyser la facture"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 2 : Review */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">{items.length} pièce(s) détectée(s)</p>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={devise === "ariary" ? "default" : "outline"}
                    onClick={() => setDevise("ariary")}
                  >
                    Ariary
                  </Button>
                  <Button
                    size="sm"
                    variant={devise === "fmg" ? "default" : "outline"}
                    onClick={() => setDevise("fmg")}
                  >
                    FMG (÷5)
                  </Button>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setStep("upload")}>
                ← Retour
              </Button>
            </div>

            {/* Fournisseur autocomplete */}
            <div className="relative">
              <Label className="text-sm mb-1 block">Fournisseur (optionnel)</Label>
              <div className="relative">
                <Input
                  value={fournisseurInput}
                  onChange={(e) => {
                    setFournisseurInput(e.target.value);
                    setFournisseurId(undefined);
                    setFournisseurOpen(true);
                  }}
                  onFocus={() => setFournisseurOpen(true)}
                  onBlur={() => setTimeout(() => setFournisseurOpen(false), 150)}
                  placeholder="Rechercher ou créer un fournisseur…"
                  className="pr-8"
                />
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {fournisseurOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredFournisseurs.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onMouseDown={() => handleSelectFournisseur(f)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {f.nom}
                    </button>
                  ))}
                  {fournisseurInput.trim() && !filteredFournisseurs.some(
                    (f) => f.nom.toLowerCase() === fournisseurInput.trim().toLowerCase(),
                  ) && (
                    <button
                      type="button"
                      onMouseDown={handleCreateFournisseur}
                      disabled={creatingFournisseur}
                      className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                    >
                      {creatingFournisseur ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      Créer "{fournisseurInput.trim()}"
                    </button>
                  )}
                  {filteredFournisseurs.length === 0 && !fournisseurInput.trim() && (
                    <p className="px-3 py-2 text-sm text-gray-400">Tapez pour rechercher…</p>
                  )}
                </div>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-1/2">Désignation</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Quantité</th>
                    <th className="text-right px-3 py-2 font-medium w-32">
                      {devise === "fmg" ? "Prix (Ar)" : "Prix unitaire"}
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-2 py-1">
                        <Input
                          value={item.nom}
                          onChange={(e) => updateItem(i, "nom", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="number"
                          min={0}
                          value={item.quantite}
                          onChange={(e) => updateItem(i, "quantite", e.target.value)}
                          className="h-8 text-sm text-right"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="number"
                          min={0}
                          value={devise === "fmg" ? Math.round(item.prix / 5) : item.prix}
                          onChange={(e) => {
                            const v = Number(e.target.value) || 0;
                            setItems((prev) =>
                              prev.map((it, idx) =>
                                idx === i ? { ...it, prix: devise === "fmg" ? v * 5 : v } : it,
                              ),
                            );
                          }}
                          className="h-8 text-sm text-right"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          onClick={() => removeItem(i)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button size="sm" variant="outline" onClick={addItem} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter une ligne
            </Button>

            {parseError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {parseError}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving || items.length === 0}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  "Enregistrer tout"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 3 : Done */}
        {step === "done" && saveResult && (
          <div className="space-y-4 py-4 text-center">
            <div className="flex justify-center">
              <div className="bg-green-100 rounded-full p-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-800">Import terminé</p>
              <p className="text-sm text-gray-600">
                {saveResult.created} pièce(s) créée(s) &nbsp;·&nbsp; {saveResult.updated} mise(s) à jour
              </p>
            </div>
            {saveResult.errors.length > 0 && (
              <div className="text-left bg-yellow-50 border border-yellow-200 rounded p-3 space-y-1">
                <p className="text-sm font-medium text-yellow-800">Erreurs :</p>
                {saveResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-yellow-700">
                    · {e}
                  </p>
                ))}
              </div>
            )}
            <DialogFooter className="justify-center pt-2">
              <Button onClick={() => handleClose(false)}>Fermer</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
