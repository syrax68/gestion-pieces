import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Bolt, Menu, X, ClipboardList, LayoutGrid } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { publicApi, type BoutiqueInfo } from "../lib/api";

export default function Navbar() {
  const { totalItems } = useCart();
  const location = useLocation();
  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    publicApi.getBoutique().then(setBoutique).catch(() => {});
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-ink-800/90 backdrop-blur border-b border-line sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-display font-extrabold tracking-tight text-slate-100 hover:text-accent transition-colors">
            {boutique?.logo ? (
              <img src={boutique.logo} alt={boutique.nom} className="h-8 w-auto object-contain" />
            ) : (
              <span className="h-8 w-8 rounded-lg bg-accent grid place-items-center text-ink-900">
                <Bolt className="h-5 w-5" />
              </span>
            )}
            <span className="text-lg uppercase">{boutique?.nom || "Pièces Moto"}</span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive("/") ? "text-accent" : "text-mute hover:text-slate-100"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Catalogue
            </Link>
            <Link
              to="/mes-commandes"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive("/mes-commandes") ? "text-accent" : "text-mute hover:text-slate-100"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Mes commandes
            </Link>
          </nav>

          {/* Panier + menu mobile */}
          <div className="flex items-center gap-3">
            <Link
              to="/panier"
              className="relative flex items-center gap-1.5 bg-accent hover:bg-accent-600 text-ink-900 font-display font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Panier</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-slate-100 text-ink-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

            {/* Burger mobile */}
            <button
              className="md:hidden p-2 rounded-lg text-mute hover:bg-ink-700"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="md:hidden border-t border-line py-3 space-y-1">
            <Link
              to="/"
              className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-slate-200 hover:text-accent"
              onClick={() => setMenuOpen(false)}
            >
              <LayoutGrid className="h-4 w-4" />
              Catalogue
            </Link>
            <Link
              to="/mes-commandes"
              className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-slate-200 hover:text-accent"
              onClick={() => setMenuOpen(false)}
            >
              <ClipboardList className="h-4 w-4" />
              Mes commandes
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
