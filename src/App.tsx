import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import SyncIndicator from "./components/SyncIndicator";
import AppRouter from "./AppRouter";
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

function AppRoutes() {
  return (
    <>
      <SyncIndicator />
      <Routes>
        {/* Root — renders AppRouter which redirects to splash on first visit */}
        <Route path="/" element={<AppRouter />} />

        {/* Splash — always runs first after initial load */}
        <Route path="/splash" element={<Splash />} />

        {/* Auth screens */}
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/role-selection" element={<RoleSelection />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/tutoriel" element={<Tutorial />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/transaction/new" element={<TransactionNew />} />
        <Route path="/groups/:id/transaction/new" element={<TransactionNewGroup />} />
        <Route path="/transaction/:id" element={<TransactionDetail />} />
        <Route path="/transaction/:id/edit" element={<TransactionEdit />} />
        <Route path="/balance" element={<Balance />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route path="/events" element={<Events />} />
        <Route path="/event/new" element={<EventNew />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/event/:id/edit" element={<EventEdit />} />
        <Route path="/versement" element={<Versement />} />
        <Route path="/members" element={<Members />} />
        <Route path="/archives" element={<Archives />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/forms" element={<FormBuilder />} />
        <Route path="/form/fill/:id" element={<FormFill />} />
        <Route path="/custom-fields" element={<CustomFields />} />
        <Route path="/report-builder" element={<ReportBuilder />} />
        <Route path="/trace" element={<Trace />} />
        <Route path="/history" element={<History />} />
        <Route path="/help" element={<Help />} />
        <Route path="/settings" element={<Settings />} />
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
