import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Finance from "./pages/Finance";
import TransactionNew from "./pages/TransactionNew";
import TransactionDetail from "./pages/TransactionDetail";
import TransactionEdit from "./pages/TransactionEdit";
import Balance from "./pages/Balance";
import Groups from "./pages/Groups";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnlyGuard><Login /></PublicOnlyGuard>} />
          <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/finance" element={<AuthGuard><Finance /></AuthGuard>} />
          <Route path="/transaction/new" element={<AuthGuard><TransactionNew /></AuthGuard>} />
          <Route path="/transaction/:id" element={<AuthGuard><TransactionDetail /></AuthGuard>} />
          <Route path="/transaction/:id/edit" element={<AuthGuard><TransactionEdit /></AuthGuard>} />
          <Route path="/balance" element={<AuthGuard><Balance /></AuthGuard>} />
          <Route path="/groups" element={<AuthGuard><Groups /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
