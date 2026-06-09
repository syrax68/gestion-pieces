import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
    <div>
      {/* Hero */}
      <div className="relative border-b border-line bg-gradient-to-r from-ink-900 to-ink-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-accent font-display font-bold text-xs uppercase tracking-widest">Pièces détachées moto</p>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mt-1">
            Trouvez la <span className="text-accent">bonne pièce</span>, vite.
          </h1>
          <p className="text-mute text-sm mt-2 max-w-xl">
            Recherchez par nom ou référence, filtrez par catégorie et par marque.
          </p>

          {/* Barre de recherche */}
          <div className="flex gap-3 mt-5 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
              <input
                type="text"
                placeholder="Rechercher une pièce, une référence…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-3 border border-line rounded-xl text-sm bg-ink-800 text-slate-100 placeholder:text-mute focus:outline-none focus:border-accent transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Bouton filtres mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`lg:hidden flex items-center gap-2 px-4 py-3 border rounded-xl text-sm font-medium transition-colors ${
                nbFiltresActifs > 0
                  ? "border-accent bg-accent-soft text-accent-400"
                  : "border-line bg-ink-800 text-slate-200 hover:border-accent"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtres
              {nbFiltresActifs > 0 && (
                <span className="bg-accent text-ink-900 text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {nbFiltresActifs}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!loading && (
          <p className="text-sm text-mute mb-5">
            <b className="text-slate-100">{total}</b> pièce{total !== 1 ? "s" : ""} disponible{total !== 1 ? "s" : ""}
          </p>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Panneau de filtres */}
          <aside
            className={`w-full lg:w-64 shrink-0 ${
              showFilters ? "block" : "hidden"
            } lg:block`}
          >
            <div className="bg-ink-800 rounded-xl border border-line p-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold uppercase tracking-widest text-mute text-xs">Filtres</h2>
                {nbFiltresActifs > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-accent hover:text-accent-400 font-medium"
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
                    className="flex items-center justify-between w-full text-sm font-medium text-slate-200 mb-2"
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
                                ? "bg-accent-soft text-accent-400 font-medium"
                                : "text-mute hover:bg-ink-700 hover:text-slate-100"
                            }`}
                          >
                            <span className="truncate">{cat.nom}</span>
                            <span className="text-xs text-mute ml-2 shrink-0">{cat.nbPieces}</span>
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
                    className="flex items-center justify-between w-full text-sm font-medium text-slate-200 mb-2"
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
                                ? "bg-accent-soft text-accent-400 font-medium"
                                : "text-mute hover:bg-ink-700 hover:text-slate-100"
                            }`}
                          >
                            <span className="truncate">{m.nom}</span>
                            <span className="text-xs text-mute ml-2 shrink-0">{m.nbPieces}</span>
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
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-line overflow-hidden">
                    <div className="aspect-square skeleton" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 w-1/2 skeleton" />
                      <div className="h-4 w-4/5 skeleton" />
                      <div className="h-5 w-1/3 skeleton mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <p className="text-red-400 font-medium">{error}</p>
                <button
                  onClick={() => { setPage(1); setRetryCount((c) => c + 1); }}
                  className="mt-4 text-sm text-accent hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : pieces.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-mute">Aucune pièce trouvée pour votre recherche.</p>
                {nbFiltresActifs > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-3 text-sm text-accent hover:underline"
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
                      className="flex items-center gap-2 px-6 py-2.5 border border-line rounded-lg text-sm font-medium text-slate-200 hover:border-accent transition-colors disabled:opacity-50"
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
    </div>
  );
}
