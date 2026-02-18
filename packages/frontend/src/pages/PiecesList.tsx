import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/Label";
import { Search, Plus, Package, Edit, Trash2, Loader2, Filter, X, ChevronDown, ChevronUp, Download, ArrowLeftRight } from "lucide-react";
import { piecesApi, categoriesApi, marquesApi, exportApi, Piece, Categorie, Marque } from "@/lib/api";
import PieceForm from "@/components/PieceForm";
import ReplacePieceDialog from "@/components/ReplacePieceDialog";
import { useToast } from "@/components/ui/Toaster";

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

export default function PiecesList() {
  const { error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [marques, setMarques] = useState<Marque[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<Piece | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [replacePiece, setReplacePiece] = useState<Piece | null>(null);

  // Filtres
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMarques, setSelectedMarques] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [showFilters, setShowFilters] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    marques: true,
    stock: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [piecesData, categoriesData, marquesData] = await Promise.all([
        piecesApi.getAll(),
        categoriesApi.getAll(),
        marquesApi.getAll()
      ]);
      setPieces(piecesData);
      setCategories(categoriesData);
      setMarques(marquesData);
    } catch (err) {
      setError("Erreur lors du chargement des pièces");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePiece = async (pieceData: Partial<Piece>) => {
    try {
      setSaving(true);
      if (selectedPiece) {
        await piecesApi.update(selectedPiece.id, pieceData);
      } else {
        await piecesApi.create(pieceData);
      }
      await loadData();
      setSelectedPiece(undefined);
      setIsFormOpen(false);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
      toastError("Erreur lors de la sauvegarde de la pièce");
    } finally {
      setSaving(false);
    }
  };

  const handleReplacePiece = (e: React.MouseEvent, piece: Piece) => {
    e.preventDefault();
    setReplacePiece(piece);
  };

  const handleEditPiece = (e: React.MouseEvent, piece: Piece) => {
    e.preventDefault();
    setSelectedPiece(piece);
    setIsFormOpen(true);
  };

  const handleDeletePiece = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (confirm("Êtes-vous sûr de vouloir supprimer cette pièce ?")) {
      try {
        await piecesApi.delete(id);
        await loadData();
      } catch (err) {
        console.error("Erreur lors de la suppression:", err);
        toastError("Erreur lors de la suppression de la pièce");
      }
    }
  };

  const handleAddNew = () => {
    setSelectedPiece(undefined);
    setIsFormOpen(true);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleMarque = (marqueId: string) => {
    setSelectedMarques(prev =>
      prev.includes(marqueId)
        ? prev.filter(id => id !== marqueId)
        : [...prev, marqueId]
    );
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedMarques([]);
    setStockFilter("all");
    setSearchTerm("");
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedMarques.length > 0 || stockFilter !== "all" || searchTerm !== "";

  const filteredPieces = pieces.filter((piece) => {
    // Filtre par recherche
    const matchesSearch =
      piece.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      piece.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (piece.marque?.nom || "").toLowerCase().includes(searchTerm.toLowerCase());

    // Filtre par catégorie
    const matchesCategory = selectedCategories.length === 0 ||
      (piece.categorieId && selectedCategories.includes(piece.categorieId));

    // Filtre par marque
    const matchesMarque = selectedMarques.length === 0 ||
      (piece.marqueId && selectedMarques.includes(piece.marqueId));

    // Filtre par stock
    let matchesStock = true;
    if (stockFilter === "in_stock") {
      matchesStock = piece.stock > piece.stockMin;
    } else if (stockFilter === "low_stock") {
      matchesStock = piece.stock <= piece.stockMin && piece.stock > 0;
    } else if (stockFilter === "out_of_stock") {
      matchesStock = piece.stock === 0;
    }

    return matchesSearch && matchesCategory && matchesMarque && matchesStock;
  });

  // Compteurs pour les filtres
  const stockCounts = {
    all: pieces.length,
    in_stock: pieces.filter(p => p.stock > p.stockMin).length,
    low_stock: pieces.filter(p => p.stock <= p.stockMin && p.stock > 0).length,
    out_of_stock: pieces.filter(p => p.stock === 0).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
        <Button onClick={loadData} className="mt-4">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pièces</h1>
          <p className="text-muted-foreground">Gérez votre inventaire de pièces moto</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportApi.downloadPieces()}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Filtres
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {selectedCategories.length + selectedMarques.length + (stockFilter !== "all" ? 1 : 0)}
              </Badge>
            )}
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une pièce
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, référence ou marque..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Panneau de filtres - à gauche */}
        {showFilters && (
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-4 bg-muted/30 rounded-lg border border-border/50 overflow-hidden overflow-x-hidden">
              {/* En-tête du filtre */}
              <div className="bg-muted/50 px-4 py-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Filtres</span>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Effacer
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-5">
                {/* Filtre par statut de stock */}
                <div>
                  <button
                    onClick={() => toggleSection('stock')}
                    className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3"
                  >
                    <span>Statut du stock</span>
                    {expandedSections.stock ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {expandedSections.stock && (
                    <div className="space-y-1">
                      {[
                        { value: "all" as StockFilter, label: "Tous", count: stockCounts.all },
                        { value: "in_stock" as StockFilter, label: "En stock", count: stockCounts.in_stock },
                        { value: "low_stock" as StockFilter, label: "Stock faible", count: stockCounts.low_stock },
                        { value: "out_of_stock" as StockFilter, label: "Rupture", count: stockCounts.out_of_stock },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-colors text-sm ${
                            stockFilter === option.value
                              ? 'bg-primary/15 text-primary font-medium'
                              : 'hover:bg-muted/80 text-foreground/80'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                              stockFilter === option.value ? 'border-primary' : 'border-muted-foreground/40'
                            }`}>
                              {stockFilter === option.value && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              )}
                            </div>
                            <input
                              type="radio"
                              name="stockFilter"
                              value={option.value}
                              checked={stockFilter === option.value}
                              onChange={() => setStockFilter(option.value)}
                              className="sr-only"
                            />
                            <span>{option.label}</span>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            stockFilter === option.value ? 'bg-primary/20' : 'bg-muted text-muted-foreground'
                          }`}>
                            {option.count}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filtre par catégorie */}
                <div className="border-t border-border/50 pt-4">
                  <button
                    onClick={() => toggleSection('categories')}
                    className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3"
                  >
                    <span>Catégories</span>
                    {expandedSections.categories ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {expandedSections.categories && (
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {categories.map((cat) => {
                        const count = pieces.filter(p => p.categorieId === cat.id).length;
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                          <label
                            key={cat.id}
                            className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-colors text-sm ${
                              isSelected
                                ? 'bg-primary/15 text-primary font-medium'
                                : 'hover:bg-muted/80 text-foreground/80'
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center mt-0.5 ${
                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                              }`}>
                                {isSelected && (
                                  <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCategory(cat.id)}
                                className="sr-only"
                              />
                              <span className="break-words min-w-0">{cat.nom}</span>
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                              isSelected ? 'bg-primary/20' : 'bg-muted text-muted-foreground'
                            }`}>
                              {count}
                            </span>
                          </label>
                        );
                      })}
                      {categories.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2">Aucune catégorie</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Filtre par marque */}
                <div className="border-t border-border/50 pt-4">
                  <button
                    onClick={() => toggleSection('marques')}
                    className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3"
                  >
                    <span>Marques</span>
                    {expandedSections.marques ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {expandedSections.marques && (
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {marques.map((marque) => {
                        const count = pieces.filter(p => p.marqueId === marque.id).length;
                        const isSelected = selectedMarques.includes(marque.id);
                        return (
                          <label
                            key={marque.id}
                            className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-colors text-sm ${
                              isSelected
                                ? 'bg-primary/15 text-primary font-medium'
                                : 'hover:bg-muted/80 text-foreground/80'
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center mt-0.5 ${
                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                              }`}>
                                {isSelected && (
                                  <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleMarque(marque.id)}
                                className="sr-only"
                              />
                              <span className="break-words min-w-0">{marque.nom}</span>
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                              isSelected ? 'bg-primary/20' : 'bg-muted text-muted-foreground'
                            }`}>
                              {count}
                            </span>
                          </label>
                        );
                      })}
                      {marques.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2">Aucune marque</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Pied du filtre - résumé */}
              <div className="bg-muted/50 px-4 py-2.5 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  <span className="font-medium text-foreground">{filteredPieces.length}</span> pièce{filteredPieces.length > 1 ? 's' : ''} trouvée{filteredPieces.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Liste des pièces */}
        <div className="flex-1 min-w-0">
          <div className={`grid gap-4 ${showFilters ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {filteredPieces.map((piece) => (
              <Card key={piece.id} className="hover:shadow-md transition-shadow h-full bg-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Link to={`/pieces/${piece.id}`} className="flex-1">
                      <CardTitle className="text-lg hover:text-primary">{piece.nom}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Réf: {piece.reference}</p>
                    </Link>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => handleReplacePiece(e, piece)} title="Remplacer">
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => handleEditPiece(e, piece)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => handleDeletePiece(e, piece.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Marque:</span>
                      <span className="font-medium">{piece.marque?.nom || "-"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Catégorie:</span>
                      <span className="font-medium">{piece.categorie?.nom || "-"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prix d'achat:</span>
                      <span className="font-medium">{piece.prixAchat ? `${piece.prixAchat.toLocaleString()} Fmg` : "-"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prix de vente:</span>
                      <span className="font-medium">{piece.prixVente.toLocaleString()} Fmg</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stock:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{piece.stock} unités</span>
                        {piece.stock <= piece.stockMin && piece.stock > 0 && <Badge variant="warning">Faible</Badge>}
                        {piece.stock === 0 && <Badge variant="destructive">Rupture</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPieces.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucune pièce trouvée</h3>
              <p className="text-muted-foreground mt-2">Essayez de modifier vos filtres</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <PieceForm
        piece={selectedPiece}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSavePiece}
        saving={saving}
      />

      {replacePiece && (
        <ReplacePieceDialog
          piece={replacePiece}
          open={!!replacePiece}
          onClose={() => setReplacePiece(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
