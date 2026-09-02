import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { setupRealtime, teardownRealtime } from "@/store/useStore";
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

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin" style={{ border: '3px solid #282828', borderTopColor: '#FF6B00' }} />
          <p className="text-text-tertiary text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Dashboard /> : <Login />} />
      <Route path="/" element={isAuthenticated ? <Dashboard /> : <Login />} />
      <Route path="/finance" element={isAuthenticated ? <Finance /> : <Login />} />
      <Route path="/transaction/new" element={isAuthenticated ? <TransactionNew /> : <Login />} />
      <Route path="/transaction/:id" element={isAuthenticated ? <TransactionDetail /> : <Login />} />
      <Route path="/transaction/:id/edit" element={isAuthenticated ? <TransactionEdit /> : <Login />} />
      <Route path="/balance" element={isAuthenticated ? <Balance /> : <Login />} />
      <Route path="/groups" element={isAuthenticated ? <Groups /> : <Login />} />
      <Route path="/history" element={isAuthenticated ? <History /> : <Login />} />
      <Route path="/settings" element={isAuthenticated ? <Settings /> : <Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function RealtimeManager() {
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated) {
      setupRealtime();
      return () => teardownRealtime();
    }
  }, [isAuthenticated]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RealtimeManager />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
