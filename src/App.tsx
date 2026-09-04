import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import SyncIndicator from "./components/SyncIndicator";
import Dashboard from "./pages/Dashboard";
import Finance from "./pages/Finance";
import TransactionNew from "./pages/TransactionNew";
import TransactionDetail from "./pages/TransactionDetail";
import TransactionEdit from "./pages/TransactionEdit";
import Balance from "./pages/Balance";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Events from "./pages/Events";
import EventNew from "./pages/EventNew";
import EventDetail from "./pages/EventDetail";
import Versement from "./pages/Versement";
import Settings from "./pages/Settings";
import History from "./pages/History";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import RoleSelection from "./pages/RoleSelection";
import Onboarding from "./pages/Onboarding";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const storedRole = localStorage.getItem('lumina-role');
  if (!storedRole) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <SyncIndicator />
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
        <Route path="/transaction/new" element={<ProtectedRoute><TransactionNew /></ProtectedRoute>} />
        <Route path="/transaction/:id" element={<ProtectedRoute><TransactionDetail /></ProtectedRoute>} />
        <Route path="/transaction/:id/edit" element={<ProtectedRoute><TransactionEdit /></ProtectedRoute>} />
        <Route path="/balance" element={<ProtectedRoute><Balance /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
        <Route path="/groups/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
        <Route path="/event/new" element={<ProtectedRoute><EventNew /></ProtectedRoute>} />
        <Route path="/event/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
        <Route path="/versement" element={<ProtectedRoute><Versement /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
