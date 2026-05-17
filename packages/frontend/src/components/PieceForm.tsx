import { useState, useEffect, useRef } from "react";
import { Piece, Categorie, Marque, categoriesApi, marquesApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Loader2, Plus } from "lucide-react";

interface PieceFormProps {
  piece?: Piece;
  open: boolean;
  onClose: () => void;
  onSave: (piece: Partial<Piece>) => void;
  saving?: boolean;
}

interface FormData {
  reference: string;
  nom: string;
  marqueId: string;
  categorieId: string;
  description: string;
  prixVente: number;
  prixAchat: number;
  stock: number;
  stockMin: number;
}

export default function PieceForm({ piece, open, onClose, onSave, saving }: PieceFormProps) {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [marques, setMarques] = useState<Marque[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    reference: "",
    nom: "",
    marqueId: "",
    categorieId: "",
    description: "",
    prixVente: 0,
    prixAchat: 0,
    stock: 0,
    stockMin: 1,
  });

  // Marque autocomplete state
  const [marqueInput, setMarqueInput] = useState("");
  const [marqueOpen, setMarqueOpen] = useState(false);
  const [creatingMarque, setCreatingMarque] = useState(false);
  const marqueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) loadCategoriesAndMarques();
  }, [open]);

  useEffect(() => {
    if (piece) {
      setFormData({
        reference: piece.reference,
        nom: piece.nom,
        marqueId: piece.marqueId || "",
        categorieId: piece.categorieId || "",
        description: piece.description || "",
        prixVente: piece.prixVente,
        prixAchat: piece.prixAchat || 0,
        stock: piece.stock,
        stockMin: piece.stockMin,
      });
      const marque = piece.marque ? (piece.marque as Marque) : undefined;
      setMarqueInput(marque?.nom || "");
    } else {
      setFormData({ reference: "", nom: "", marqueId: "", categorieId: "", description: "", prixVente: 0, prixAchat: 0, stock: 0, stockMin: 1 });
      setMarqueInput("");
    }
  }, [piece, open]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (marqueRef.current && !marqueRef.current.contains(e.target as Node)) {
        setMarqueOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadCategoriesAndMarques = async () => {
    try {
      setLoadingData(true);
      const [cats, mrs] = await Promise.all([categoriesApi.getAll(), marquesApi.getAll()]);
      setCategories(cats);
      setMarques(mrs);
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredMarques = marques.filter((m) => m.nom.toLowerCase().includes(marqueInput.toLowerCase()));
  const exactMatch = marques.some((m) => m.nom.toLowerCase() === marqueInput.toLowerCase());
  const showCreateOption = marqueInput.trim().length > 0 && !exactMatch;

  const selectMarque = (m: Marque) => {
    setFormData((prev) => ({ ...prev, marqueId: m.id }));
    setMarqueInput(m.nom);
    setMarqueOpen(false);
  };

  const createAndSelectMarque = async () => {
    if (!marqueInput.trim()) return;
    try {
      setCreatingMarque(true);
      const newMarque = await marquesApi.create({ nom: marqueInput.trim() });
      setMarques((prev) => [...prev, newMarque]);
      selectMarque(newMarque);
    } catch {
      // ignore
    } finally {
      setCreatingMarque(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pieceData: Partial<Piece> = {
      nom: formData.nom,
      description: formData.description || undefined,
      prixVente: Number(formData.prixVente),
      prixAchat: formData.prixAchat ? Number(formData.prixAchat) : undefined,
      stock: Number(formData.stock),
      stockMin: Number(formData.stockMin),
      marqueId: formData.marqueId || undefined,
      categorieId: formData.categorieId || undefined,
    };
    // Include reference only in edit mode
    if (piece) pieceData.reference = formData.reference;
    onSave(pieceData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{piece ? "Modifier la pièce" : "Ajouter une pièce"}</DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={piece ? "grid grid-cols-2 gap-4" : ""}>
              {piece && (
                <div>
                  <Label htmlFor="reference">Référence</Label>
                  <Input id="reference" name="reference" value={formData.reference} onChange={handleChange} />
                </div>
              )}
              <div className={piece ? "" : ""}>
                <Label htmlFor="nom">Nom *</Label>
                <Input id="nom" name="nom" value={formData.nom} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Marque autocomplete */}
              <div ref={marqueRef} className="relative">
                <Label>Marque</Label>
                <Input
                  value={marqueInput}
                  onChange={(e) => {
                    setMarqueInput(e.target.value);
                    setFormData((prev) => ({ ...prev, marqueId: "" }));
                    setMarqueOpen(true);
                  }}
                  onFocus={() => setMarqueOpen(true)}
                  placeholder="Rechercher ou créer..."
                  autoComplete="off"
                />
                {marqueOpen && (filteredMarques.length > 0 || showCreateOption) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredMarques.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        onMouseDown={() => selectMarque(m)}
                      >
                        {m.nom}
                      </button>
                    ))}
                    {showCreateOption && (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-blue-600 font-medium flex items-center gap-1 border-t border-gray-100"
                        onMouseDown={createAndSelectMarque}
                        disabled={creatingMarque}
                      >
                        {creatingMarque ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        Créer "{marqueInput.trim()}"
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="categorieId">Catégorie</Label>
                <Select id="categorieId" name="categorieId" value={formData.categorieId} onChange={handleChange}>
                  <option value="">Sélectionner...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prixAchat">Prix d'achat (Ar)</Label>
                <Input id="prixAchat" name="prixAchat" type="number" step="0.01" value={formData.prixAchat} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="prixVente">Prix de vente (Ar) *</Label>
                <Input id="prixVente" name="prixVente" type="number" step="0.01" value={formData.prixVente} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stock">Stock *</Label>
                <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="stockMin">Stock minimum</Label>
                <Input id="stockMin" name="stockMin" type="number" value={formData.stockMin} onChange={handleChange} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : piece ? (
                  "Modifier"
                ) : (
                  "Ajouter"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
