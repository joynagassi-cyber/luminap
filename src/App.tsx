import AppEntrypoint from "./AppEntrypoint";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import SyncIndicator from "./components/SyncIndicator";
import Splash from "./pages/Splash";
import Dashboard from "./pages/Dashboard";
import Finance from "./pages/Finance";
import TransactionNew from "./pages/TransactionNew";
import TransactionNewGroup from "./pages/TransactionNewGroup";
import TransactionDetail from "./pages/TransactionDetail";
import TransactionEdit from "./pages/TransactionEdit";
import Balance from "./pages/Balance";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Events from "./pages/Events";
import EventNew from "./pages/EventNew";
import EventDetail from "./pages/EventDetail";
import EventEdit from "./pages/EventEdit";
import Versement from "./pages/Versement";
import Settings from "./pages/Settings";
import History from "./pages/History";
import Trace from "./pages/Trace";
import Help from "./pages/Help";
import Tutorial from "./pages/Tutorial";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import RoleSelection from "./pages/RoleSelection";
import Onboarding from "./pages/Onboarding";
import Notifications from "./pages/Notifications";
import Members from "./pages/Members";
import Archives from "./pages/Archives";
import Reports from "./pages/Reports";
import FormBuilder from "./pages/FormBuilder";
import FormFill from "./pages/FormFill";
import CustomFields from "./pages/CustomFields";
import ReportBuilder from "./pages/ReportBuilder";

const queryClient = new QueryClient();

function AuthRoute({ children }: { children: React.ReactNode }) {
  const storedRole = localStorage.getItem('lumina-role');
  const storedOnboarded = localStorage.getItem('lumina-onboarded');
  if (!storedRole || storedOnboarded !== 'true') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <SyncIndicator />
      <Routes>
        {/* Root — redirect to splash on every app load */}
        <Route path="/" element={<AppEntrypoint />} />

        {/* Splash screen — handles all routing logic after native splash */}
        <Route path="/splash" element={<Splash />} />

        {/* Auth screens */}
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/role-selection" element={<RoleSelection />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<AuthRoute><Dashboard /></AuthRoute>} />
        <Route path="/notifications" element={<AuthRoute><Notifications /></AuthRoute>} />
        <Route path="/tutoriel" element={<AuthRoute><Tutorial /></AuthRoute>} />
        <Route path="/finance" element={<AuthRoute><Finance /></AuthRoute>} />
        <Route path="/transaction/new" element={<AuthRoute><TransactionNew /></AuthRoute>} />
        <Route path="/groups/:id/transaction/new" element={<AuthRoute><TransactionNewGroup /></AuthRoute>} />
        <Route path="/transaction/:id" element={<AuthRoute><TransactionDetail /></AuthRoute>} />
        <Route path="/transaction/:id/edit" element={<AuthRoute><TransactionEdit /></AuthRoute>} />
        <Route path="/balance" element={<AuthRoute><Balance /></AuthRoute>} />
        <Route path="/groups" element={<AuthRoute><Groups /></AuthRoute>} />
        <Route path="/groups/:id" element={<AuthRoute><GroupDetail /></AuthRoute>} />
        <Route path="/events" element={<AuthRoute><Events /></AuthRoute>} />
        <Route path="/event/new" element={<AuthRoute><EventNew /></AuthRoute>} />
        <Route path="/event/:id" element={<AuthRoute><EventDetail /></AuthRoute>} />
        <Route path="/event/:id/edit" element={<AuthRoute><EventEdit /></AuthRoute>} />
        <Route path="/versement" element={<AuthRoute><Versement /></AuthRoute>} />
        <Route path="/members" element={<AuthRoute><Members /></AuthRoute>} />
        <Route path="/archives" element={<AuthRoute><Archives /></AuthRoute>} />
        <Route path="/reports" element={<AuthRoute><Reports /></AuthRoute>} />
        <Route path="/forms" element={<AuthRoute><FormBuilder /></AuthRoute>} />
        <Route path="/form/fill/:id" element={<AuthRoute><FormFill /></AuthRoute>} />
        <Route path="/custom-fields" element={<AuthRoute><CustomFields /></AuthRoute>} />
        <Route path="/report-builder" element={<AuthRoute><ReportBuilder /></AuthRoute>} />
        <Route path="/trace" element={<AuthRoute><Trace /></AuthRoute>} />
        <Route path="/history" element={<AuthRoute><History /></AuthRoute>} />
        <Route path="/help" element={<AuthRoute><Help /></AuthRoute>} />
        <Route path="/settings" element={<AuthRoute><Settings /></AuthRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
