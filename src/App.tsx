import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { CartProvider } from "@/context/CartContext";
import { SponsorProvider } from "@/context/SponsorContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import NewPatient from "./pages/NewPatient";
import PatientDetail from "./pages/PatientDetail";
import CaseDetail from "./pages/CaseDetail";
import Cases from "./pages/Cases";
import NewCuration from "./pages/NewCuration";
import Agenda from "./pages/Agenda";
import Marketplace from "./pages/Marketplace";
import Orders from "./pages/Orders";
import Cart from "./pages/Cart";
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
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Clinical */}
                <Route path="/dashboard" element={<ProtectedRoute requiredPermission="dashboard"><Dashboard /></ProtectedRoute>} />
                <Route path="/patients/new" element={<ProtectedRoute requiredPermission="pacientes"><NewPatient /></ProtectedRoute>} />
                <Route path="/patients/:patientId" element={<ProtectedRoute requiredPermission="pacientes"><PatientDetail /></ProtectedRoute>} />
                <Route path="/patients/:patientId/cases/:caseId" element={<ProtectedRoute requiredPermission="casos-heridas"><CaseDetail /></ProtectedRoute>} />
                <Route path="/cases" element={<ProtectedRoute requiredPermission="casos-heridas"><Cases /></ProtectedRoute>} />
                <Route path="/curation/new" element={<ProtectedRoute requiredPermission="nueva-curacion"><NewCuration /></ProtectedRoute>} />
                <Route path="/agenda" element={<ProtectedRoute requiredPermission="agenda"><Agenda /></ProtectedRoute>} />
                <Route path="/assistant" element={<ProtectedRoute requiredPermission="asistente-clinico"><Assistant /></ProtectedRoute>} />

                {/* Sponsor */}
                <Route path="/sponsor" element={<ProtectedRoute requiredPermission="panel-sponsor"><SponsorPanel /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute requiredPermission="reportes"><Reports /></ProtectedRoute>} />
                <Route path="/statistics" element={<ProtectedRoute requiredPermission="estadisticas"><Statistics /></ProtectedRoute>} />

                {/* Shared authenticated routes */}
                <Route path="/marketplace" element={<ProtectedRoute requiredAnyOf={['catalogo-clinico', 'catalogo-productos']}><Marketplace /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute requiredAnyOf={['solicitudes-reposicion', 'pedidos']}><Orders /></ProtectedRoute>} />
                <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                {/* Admin only */}
                <Route path="/admin/products" element={<ProtectedRoute requiredPermission="admin-productos"><AdminProducts /></ProtectedRoute>} />
                <Route path="/admin/orders" element={<ProtectedRoute requiredPermission="admin-pedidos"><AdminOrders /></ProtectedRoute>} />
                <Route path="/admin/accounts" element={<ProtectedRoute requiredPermission="admin-cuentas"><AdminAccounts /></ProtectedRoute>} />

                {/* Alias routes in Spanish */}
                <Route path="/pacientes/:patientId" element={<ProtectedRoute requiredPermission="pacientes"><PatientDetail /></ProtectedRoute>} />
                <Route path="/casos-heridas" element={<ProtectedRoute requiredPermission="casos-heridas"><Cases /></ProtectedRoute>} />
                <Route path="/casos-heridas/:caseId" element={<ProtectedRoute requiredPermission="casos-heridas"><Cases /></ProtectedRoute>} />
                <Route path="/nueva-curacion" element={<ProtectedRoute requiredPermission="nueva-curacion"><NewCuration /></ProtectedRoute>} />
                <Route path="/asistente-clinico" element={<ProtectedRoute requiredPermission="asistente-clinico"><Assistant /></ProtectedRoute>} />
                <Route path="/panel-sponsor" element={<ProtectedRoute requiredPermission="panel-sponsor"><SponsorPanel /></ProtectedRoute>} />
                <Route path="/estadisticas" element={<ProtectedRoute requiredPermission="estadisticas"><Statistics /></ProtectedRoute>} />
                <Route path="/reportes" element={<ProtectedRoute requiredPermission="reportes"><Reports /></ProtectedRoute>} />
                <Route path="/catalogo-productos" element={<ProtectedRoute requiredPermission="catalogo-productos"><AdminProducts /></ProtectedRoute>} />
                <Route path="/pedidos" element={<ProtectedRoute requiredPermission="pedidos"><Orders /></ProtectedRoute>} />
                <Route path="/configuracion" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/cuentas" element={<ProtectedRoute requiredPermission="admin-cuentas"><AdminAccounts /></ProtectedRoute>} />

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
