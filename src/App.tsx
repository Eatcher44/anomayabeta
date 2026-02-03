import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimalsProvider } from "@/context/AnimalsContext";
import HomePage from "./pages/HomePage";
import ProfilPage from "./pages/ProfilPage";
import PoidsPage from "./pages/PoidsPage";
import VaccinsPage from "./pages/VaccinsPage";
import VermifugePage from "./pages/VermifugePage";
import AutresSoinsPage from "./pages/AutresSoinsPage";
import ConsultationPage from "./pages/ConsultationPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AnimalsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profil/:id" element={<ProfilPage />} />
            <Route path="/poids/:id" element={<PoidsPage />} />
            <Route path="/vaccins/:id" element={<VaccinsPage />} />
            <Route path="/vermifuge/:id" element={<VermifugePage />} />
            <Route path="/autres-soins/:id" element={<AutresSoinsPage />} />
            <Route path="/consultation/:id" element={<ConsultationPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AnimalsProvider>
  </QueryClientProvider>
);

export default App;
