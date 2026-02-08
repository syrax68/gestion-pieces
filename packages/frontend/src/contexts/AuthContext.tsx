import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, User, ApiError } from "../lib/api";

interface AuthContextType {
  user: User | null;
  boutique: { id: string; nom: string } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isVendeur: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [boutique, setBoutique] = useState<{ id: string; nom: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      authApi
        .me()
        .then((u) => {
          setUser(u);
          if (u.boutique) setBoutique(u.boutique);
        })
        .catch(() => {
          localStorage.removeItem("token");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    localStorage.setItem("token", response.token);
    setUser(response.user);
    if (response.user.boutique) setBoutique(response.user.boutique);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setBoutique(null);
  };

  const isAdmin = user?.role === "ADMIN";
  const isVendeur = user?.role === "VENDEUR";
  const canEdit = isAdmin || isVendeur;
  const canDelete = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        boutique,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        isAdmin,
        isVendeur,
        canEdit,
        canDelete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { ApiError };
