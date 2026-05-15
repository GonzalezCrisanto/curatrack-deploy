import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { CartProvider } from "@/context/CartContext";
import { SponsorProvider } from "@/context/SponsorContext";
import { RoleGuard } from "@/components/RoleGuard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import CaseDetail from "./pages/CaseDetail";
import Cases from "./pages/Cases";
import NewCuration from "./pages/NewCuration";
import Agenda from "./pages/Agenda";
import Marketplace from "./pages/Marketplace";
import Orders from "./pages/Orders";
import SponsorPanel from "./pages/SponsorPanel";
import Reports from "./pages/Reports";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminAccounts from "./pages/AdminAccounts";
import Statistics from "./pages/Statistics";
import Assistant from "./pages/Assistant";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Allowed role groups
const CLINICAL = ['professional', 'admin'] as const;
const SPONSOR_OR_ADMIN = ['sponsor', 'admin'] as const;
const ALL = ['professional', 'sponsor', 'admin'] as const;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SponsorProvider>
        <AppProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Clinical (professional + admin) */}
                <Route path="/dashboard" element={<RoleGuard allow={[...CLINICAL]}><Dashboard /></RoleGuard>} />
                <Route path="/patients" element={<RoleGuard allow={[...CLINICAL]}><Patients /></RoleGuard>} />
                <Route path="/patients/:patientId" element={<RoleGuard allow={[...CLINICAL]}><PatientDetail /></RoleGuard>} />
                <Route path="/patients/:patientId/cases/:caseId" element={<RoleGuard allow={[...CLINICAL]}><CaseDetail /></RoleGuard>} />
                <Route path="/cases" element={<RoleGuard allow={[...CLINICAL]}><Cases /></RoleGuard>} />
                <Route path="/curation/new" element={<RoleGuard allow={[...CLINICAL]}><NewCuration /></RoleGuard>} />
                <Route path="/agenda" element={<RoleGuard allow={[...CLINICAL]}><Agenda /></RoleGuard>} />
                <Route path="/assistant" element={<RoleGuard allow={[...CLINICAL]}><Assistant /></RoleGuard>} />

                {/* Sponsor + admin */}
                <Route path="/sponsor" element={<RoleGuard allow={[...SPONSOR_OR_ADMIN]}><SponsorPanel /></RoleGuard>} />
                <Route path="/reports" element={<RoleGuard allow={[...SPONSOR_OR_ADMIN]}><Reports /></RoleGuard>} />
                <Route path="/statistics" element={<RoleGuard allow={[...SPONSOR_OR_ADMIN]}><Statistics /></RoleGuard>} />

                {/* Shared (all signed-in) */}
                <Route path="/marketplace" element={<RoleGuard allow={[...ALL]}><Marketplace /></RoleGuard>} />
                <Route path="/orders" element={<RoleGuard allow={[...ALL]}><Orders /></RoleGuard>} />
                <Route path="/settings" element={<RoleGuard allow={[...ALL]}><Settings /></RoleGuard>} />

                {/* Admin only */}
                <Route path="/admin/products" element={<RoleGuard allow={['admin']}><AdminProducts /></RoleGuard>} />
                <Route path="/admin/orders" element={<RoleGuard allow={['admin']}><AdminOrders /></RoleGuard>} />
                <Route path="/admin/accounts" element={<RoleGuard allow={['admin']}><AdminAccounts /></RoleGuard>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </AppProvider>
      </SponsorProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
