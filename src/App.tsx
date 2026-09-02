import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useAppSync } from "./hooks/useAppSync";
import SyncIndicator from "./components/SyncIndicator";
import Dashboard from "./pages/Dashboard";
import Finance from "./pages/Finance";
import TransactionNew from "./pages/TransactionNew";
import TransactionDetail from "./pages/TransactionDetail";
import TransactionEdit from "./pages/TransactionEdit";
import Balance from "./pages/Balance";
import Groups from "./pages/Groups";
import Settings from "./pages/Settings";
import History from "./pages/History";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121212' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: '#181818', border: '2px solid #FF6B00' }}>
            <span className="text-3xl font-black" style={{ color: '#FF6B00' }}>L</span>
          </div>
          <p className="text-text-tertiary text-sm">Chargement...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  // Initialize realtime sync
  useAppSync();
  
  return (
    <>
      <SyncIndicator />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/finance" element={
          <ProtectedRoute>
            <Finance />
          </ProtectedRoute>
        } />
        <Route path="/transaction/new" element={
          <ProtectedRoute>
            <TransactionNew />
          </ProtectedRoute>
        } />
        <Route path="/transaction/:id" element={
          <ProtectedRoute>
            <TransactionDetail />
          </ProtectedRoute>
        } />
        <Route path="/transaction/:id/edit" element={
          <ProtectedRoute>
            <TransactionEdit />
          </ProtectedRoute>
        } />
        <Route path="/balance" element={
          <ProtectedRoute>
            <Balance />
          </ProtectedRoute>
        } />
        <Route path="/groups" element={
          <ProtectedRoute>
            <Groups />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
