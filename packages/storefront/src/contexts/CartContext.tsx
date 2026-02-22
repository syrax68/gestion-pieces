import { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  pieceId: string;
  nom: string;
  reference: string;
  prix: number;
  quantite: number;
  image: string | null;
  stockMax: number;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  total: number;
  addItem: (item: Omit<CartItem, "quantite">) => void;
  removeItem: (pieceId: string) => void;
  updateQuantite: (pieceId: string, quantite: number) => void;
  clearCart: () => void;
  isInCart: (pieceId: string) => boolean;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "storefront_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const totalItems = items.reduce((sum, item) => sum + item.quantite, 0);

  const total = items.reduce((sum, item) => sum + item.prix * item.quantite, 0);

  const addItem = (newItem: Omit<CartItem, "quantite">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.pieceId === newItem.pieceId);
      if (existing) {
        return prev.map((i) =>
          i.pieceId === newItem.pieceId
            ? { ...i, quantite: Math.min(i.quantite + 1, newItem.stockMax) }
            : i,
        );
      }
      return [...prev, { ...newItem, quantite: 1 }];
    });
  };

  const removeItem = (pieceId: string) => {
    setItems((prev) => prev.filter((i) => i.pieceId !== pieceId));
  };

  const updateQuantite = (pieceId: string, quantite: number) => {
    if (quantite < 1) {
      removeItem(pieceId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.pieceId !== pieceId) return i;
        return { ...i, quantite: Math.min(quantite, i.stockMax) };
      }),
    );
  };

  const clearCart = () => setItems([]);

  const isInCart = (pieceId: string) => items.some((i) => i.pieceId === pieceId);

  return (
    <CartContext.Provider
      value={{ items, totalItems, total, addItem, removeItem, updateQuantite, clearCart, isInCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
