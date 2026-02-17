import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import PiecesList from "./pages/PiecesList";
import PieceDetails from "./pages/PieceDetails";
import StockManagement from "./pages/StockManagement";
import Achats from "./pages/Achats";
import Factures from "./pages/Factures";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Activity from "./pages/Activity";
import Clients from "./pages/Clients";
import Fournisseurs from "./pages/Fournisseurs";
import DashboardMultiBoutique from "./pages/DashboardMultiBoutique";
import BoutiquesPage from "./pages/Boutiques";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AdminOrSuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isSuperAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!isAdmin && !isSuperAdmin) {
    return <Navigate to={isSuperAdmin ? "/multi-boutiques" : "/"} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function NonSuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (isSuperAdmin) {
    return <Navigate to="/multi-boutiques" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isSuperAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={isSuperAdmin ? "/multi-boutiques" : "/"} replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route
                  path="/"
                  element={
                    <NonSuperAdminRoute>
                      <Dashboard />
                    </NonSuperAdminRoute>
                  }
                />
                <Route
                  path="/pieces"
                  element={
                    <NonSuperAdminRoute>
                      <PiecesList />
                    </NonSuperAdminRoute>
                  }
                />
                <Route
                  path="/pieces/:id"
                  element={
                    <NonSuperAdminRoute>
                      <PieceDetails />
                    </NonSuperAdminRoute>
                  }
                />
                <Route
                  path="/stock"
                  element={
                    <NonSuperAdminRoute>
                      <StockManagement />
                    </NonSuperAdminRoute>
                  }
                />
                <Route
                  path="/achats"
                  element={
                    <NonSuperAdminRoute>
                      <Achats />
                    </NonSuperAdminRoute>
                  }
                />
                <Route
                  path="/factures"
                  element={
                    <NonSuperAdminRoute>
                      <Factures />
                    </NonSuperAdminRoute>
                  }
                />
                <Route
                  path="/clients"
                  element={
                    <NonSuperAdminRoute>
                      <Clients />
                    </NonSuperAdminRoute>
                  }
                />
                <Route
                  path="/fournisseurs"
                  element={
                    <NonSuperAdminRoute>
                      <Fournisseurs />
                    </NonSuperAdminRoute>
                  }
                />
                <Route
                  path="/activite"
                  element={
                    <NonSuperAdminRoute>
                      <Activity />
                    </NonSuperAdminRoute>
                  }
                />
                <Route
                  path="/boutiques"
                  element={
                    <SuperAdminRoute>
                      <BoutiquesPage />
                    </SuperAdminRoute>
                  }
                />
                <Route
                  path="/multi-boutiques"
                  element={
                    <SuperAdminRoute>
                      <DashboardMultiBoutique />
                    </SuperAdminRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <AdminOrSuperAdminRoute>
                      <Users />
                    </AdminOrSuperAdminRoute>
                  }
                />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
