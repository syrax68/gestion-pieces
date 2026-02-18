import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authApi } from "../lib/api";
import { useToast } from "./ui/Toaster";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";
import {
  Package,
  Home,
  Warehouse,
  ShoppingCart,
  FileText,
  Users,
  LogOut,
  Shield,
  User,
  Eye,
  Menu,
  X,
  Clock,
  Contact,
  Truck,
  Store,
  Building2,
  ClipboardList,
  ClipboardCheck,
  RotateCcw,
  KeyRound,
} from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, boutique, logout, isAdmin, isSuperAdmin } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toastError("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      toastError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    try {
      setChangingPassword(true);
      await authApi.changePassword(currentPassword, newPassword);
      toastSuccess("Mot de passe modifié avec succès");
      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Erreur lors du changement");
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case "SUPER_ADMIN":
        return <Shield className="h-3 w-3" />;
      case "ADMIN":
        return <Shield className="h-3 w-3" />;
      case "VENDEUR":
        return <User className="h-3 w-3" />;
      case "LECTEUR":
        return <Eye className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getRoleVariant = (): "default" | "secondary" | "destructive" => {
    switch (user?.role) {
      case "SUPER_ADMIN":
        return "destructive";
      case "ADMIN":
        return "destructive";
      case "VENDEUR":
        return "default";
      default:
        return "secondary";
    }
  };

  const navLinks = (
    <>
      {isSuperAdmin ? (
        <>
          <Link to="/multi-boutiques" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Store className="mr-2 h-4 w-4" />
              Dashboard Multi-Boutiques
            </Button>
          </Link>
          <Link to="/boutiques" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Building2 className="mr-2 h-4 w-4" />
              Gestion des Boutiques
            </Button>
          </Link>
          <Link to="/users" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Utilisateurs
            </Button>
          </Link>
        </>
      ) : (
        <>
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Home className="mr-2 h-4 w-4" />
              Tableau de bord
            </Button>
          </Link>
          <Link to="/pieces" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Package className="mr-2 h-4 w-4" />
              Pièces
            </Button>
          </Link>
          <Link to="/stock" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Warehouse className="mr-2 h-4 w-4" />
              Stock
            </Button>
          </Link>
          <Link to="/achats" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Achats
            </Button>
          </Link>
          <Link to="/devis" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <ClipboardList className="mr-2 h-4 w-4" />
              Devis
            </Button>
          </Link>
          <Link to="/factures" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Factures
            </Button>
          </Link>
          <Link to="/avoirs" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <RotateCcw className="mr-2 h-4 w-4" />
              Avoirs
            </Button>
          </Link>
          <Link to="/inventaires" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Inventaires
            </Button>
          </Link>
          <Link to="/clients" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Contact className="mr-2 h-4 w-4" />
              Clients
            </Button>
          </Link>
          <Link to="/fournisseurs" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Truck className="mr-2 h-4 w-4" />
              Fournisseurs
            </Button>
          </Link>
          <Link to="/activite" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Clock className="mr-2 h-4 w-4" />
              Activité
            </Button>
          </Link>
          {isAdmin && (
            <Link to="/users" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Utilisateurs
              </Button>
            </Link>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          {/* Ligne titre + actions */}
          <div className="flex items-center justify-between py-3">
            <Link to={isSuperAdmin ? "/multi-boutiques" : "/"} className="flex items-center space-x-2">
              <Package className="h-6 w-6" />
              <span className="text-xl font-bold hidden sm:inline">
                {isSuperAdmin ? "Gestion Multi-Boutiques" : boutique?.nom || "Gestion Pièces Moto"}
              </span>
              <span className="text-xl font-bold sm:hidden">{isSuperAdmin ? "GMB" : "GPM"}</span>
            </Link>

            <div className="flex items-center space-x-2">
              <Badge variant={getRoleVariant()} className="flex items-center gap-1">
                {getRoleIcon()}
                {user?.role}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPasswordDialogOpen(true)}
                title="Changer le mot de passe"
              >
                <KeyRound className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="sm:hidden">
                <LogOut className="h-4 w-4" />
              </Button>

              {/* Bouton menu mobile */}
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Navigation desktop — sous le titre */}
          <div className="hidden lg:flex space-x-1 pb-2 -mt-1 border-t pt-2">{navLinks}</div>
        </div>

        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-white dark:bg-slate-900 px-4 py-3">
            <div className="flex flex-col space-y-1">{navLinks}</div>
          </div>
        )}
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* Dialog changement de mot de passe */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Mot de passe actuel</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Votre mot de passe actuel"
              />
            </div>
            <div>
              <Label>Nouveau mot de passe</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
              />
            </div>
            <div>
              <Label>Confirmer le nouveau mot de passe</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le nouveau mot de passe"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleChangePassword();
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? "Modification..." : "Modifier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
