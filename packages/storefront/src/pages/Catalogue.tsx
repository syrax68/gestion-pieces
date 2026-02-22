import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp, Loader2, LayoutGrid } from "lucide-react";
import PieceCard from "../components/PieceCard";
import { publicApi, type PieceListItem, type Categorie, type Marque } from "../lib/api";

export default function Catalogue() {
  const [pieces, setPieces] = useState<PieceListItem[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [marques, setMarques] = useState<Marque[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(null);
  const [selectedMarque, setSelectedMarque] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const [showFilters, setShowFilters] = useState(false);
  const [catOpen, setCatOpen] = useState(true);
  const [marqueOpen, setMarqueOpen] = useState(true);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce la recherche
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  // Reset page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategorie, selectedMarque]);

  // Charger les filtres une seule fois
  useEffect(() => {
    Promise.all([publicApi.getCategories(), publicApi.getMarques()])
      .then(([cats, mqs]) => {
        setCategories(cats);
        setMarques(mqs);
      })
      .catch(() => {});
  }, []);

  // Charger les pièces
  useEffect(() => {
    const isFirstPage = page === 1;
    if (isFirstPage) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    publicApi
      .getPieces({
        search: debouncedSearch || undefined,
        categorieId: selectedCategorie || undefined,
        marqueId: selectedMarque || undefined,
        page,
        limit: 20,
      })
      .then((res) => {
        if (isFirstPage) {
          setPieces(res.data);
        } else {
          setPieces((prev) => [...prev, ...res.data]);
        }
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [debouncedSearch, selectedCategorie, selectedMarque, page, retryCount]);

  const nbFiltresActifs = [selectedCategorie, selectedMarque].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCategorie(null);
    setSelectedMarque(null);
    setSearch("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-brand-100 rounded-xl p-3">
          <LayoutGrid className="h-6 w-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue de pièces</h1>
          {!loading && (
            <p className="text-sm text-gray-500">
              {total} pièce{total !== 1 ? "s" : ""} disponible{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une pièce, référence…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Bouton filtres mobile */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`lg:hidden flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
            nbFiltresActifs > 0
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtres
          {nbFiltresActifs > 0 && (
            <span className="bg-brand-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {nbFiltresActifs}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Panneau de filtres */}
        <aside
          className={`w-full lg:w-64 shrink-0 ${
            showFilters ? "block" : "hidden"
          } lg:block`}
        >
          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">Filtres</h2>
              {nbFiltresActifs > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  Tout effacer
                </button>
              )}
            </div>

            {/* Catégories */}
            {categories.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setCatOpen(!catOpen)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
                >
                  Catégories
                  {catOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {catOpen && (
                  <ul className="space-y-1">
                    {categories.map((cat) => (
                      <li key={cat.id}>
                        <button
                          onClick={() =>
                            setSelectedCategorie(selectedCategorie === cat.id ? null : cat.id)
                          }
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${
                            selectedCategorie === cat.id
                              ? "bg-brand-50 text-brand-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span className="truncate">{cat.nom}</span>
                          <span className="text-xs text-gray-400 ml-2 shrink-0">{cat.nbPieces}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Marques */}
            {marques.length > 0 && (
              <div>
                <button
                  onClick={() => setMarqueOpen(!marqueOpen)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
                >
                  Marques
                  {marqueOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {marqueOpen && (
                  <ul className="space-y-1">
                    {marques.map((m) => (
                      <li key={m.id}>
                        <button
                          onClick={() =>
                            setSelectedMarque(selectedMarque === m.id ? null : m.id)
                          }
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${
                            selectedMarque === m.id
                              ? "bg-brand-50 text-brand-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span className="truncate">{m.nom}</span>
                          <span className="text-xs text-gray-400 ml-2 shrink-0">{m.nbPieces}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Grille de pièces */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-500 font-medium">{error}</p>
              <button
                onClick={() => { setPage(1); setRetryCount((c) => c + 1); }}
                className="mt-4 text-sm text-brand-600 hover:underline"
              >
                Réessayer
              </button>
            </div>
          ) : pieces.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">Aucune pièce trouvée pour votre recherche.</p>
              {nbFiltresActifs > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm text-brand-600 hover:underline"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {pieces.map((piece) => (
                  <PieceCard key={piece.id} piece={piece} />
                ))}
              </div>

              {/* Charger plus */}
              {page < totalPages && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Charger plus
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
