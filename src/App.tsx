import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AnimalsProvider } from "@/context/AnimalsContext";
import { BreederProvider } from "@/context/BreederContext";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import ProfilPage from "./pages/ProfilPage";
import PoidsPage from "./pages/PoidsPage";
import VaccinsPage from "./pages/VaccinsPage";
import VermifugePage from "./pages/VermifugePage";
import AutresSoinsPage from "./pages/AutresSoinsPage";
import ConsultationPage from "./pages/ConsultationPage";
import HealthDashboardPage from "./pages/HealthDashboardPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotFound from "./pages/NotFound";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AbonnementPage from "./pages/AbonnementPage";
import ParadisPage from "./pages/ParadisPage";
import ReproductionPage from "./pages/ReproductionPage";
import PorteesPage from "./pages/PorteesPage";
import TransferPage from "./pages/TransferPage";
import ChaleursPage from "./pages/ChaleursPage";
import StatsElevagePage from "./pages/StatsElevagePage";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profil/:id"
        element={
          <ProtectedRoute>
            <ProfilPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/poids/:id"
        element={
          <ProtectedRoute>
            <PoidsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vaccins/:id"
        element={
          <ProtectedRoute>
            <VaccinsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vermifuge/:id"
        element={
          <ProtectedRoute>
            <VermifugePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/autres-soins/:id"
        element={
          <ProtectedRoute>
            <AutresSoinsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultation/:id"
        element={
          <ProtectedRoute>
            <ConsultationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard-sante"
        element={
          <ProtectedRoute>
            <HealthDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/abonnement"
        element={
          <ProtectedRoute>
            <AbonnementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/paradis"
        element={
          <ProtectedRoute>
            <ParadisPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reproduction/:id"
        element={
          <ProtectedRoute>
            <ReproductionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chaleurs/:id"
        element={
          <ProtectedRoute>
            <ChaleursPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portees"
        element={
          <ProtectedRoute>
            <PorteesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stats-elevage"
        element={
          <ProtectedRoute>
            <StatsElevagePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfer/:id"
        element={
          <ProtectedRoute>
            <TransferPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/claim"
        element={
          <ProtectedRoute>
            <TransferPage />
          </ProtectedRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AnimalsProvider>
        <BreederProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </BreederProvider>
      </AnimalsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
