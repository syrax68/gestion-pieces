import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Wrench, Menu, X, ClipboardList, LayoutGrid } from "lucide-react";
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
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 hover:text-brand-600 transition-colors">
            {boutique?.logo ? (
              <img src={boutique.logo} alt={boutique.nom} className="h-8 w-auto object-contain" />
            ) : (
              <Wrench className="h-6 w-6 text-brand-600" />
            )}
            <span className="text-lg">{boutique?.nom || "Boutique Pièces Moto"}</span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive("/") ? "text-brand-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Catalogue
            </Link>
            <Link
              to="/mes-commandes"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive("/mes-commandes") ? "text-brand-600" : "text-gray-600 hover:text-gray-900"
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
              className="relative flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Panier</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

            {/* Burger mobile */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            <Link
              to="/"
              className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-gray-700 hover:text-brand-600"
              onClick={() => setMenuOpen(false)}
            >
              <LayoutGrid className="h-4 w-4" />
              Catalogue
            </Link>
            <Link
              to="/mes-commandes"
              className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-gray-700 hover:text-brand-600"
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
