/**
 * Lumina Ionic Router Routes (Lazy Loaded)
 *
 * Maps all 41 pages to Ionic <Route> elements.
 * Uses IonReactRouter-compatible paths (same as react-router).
 *
 * Heavy pages use React.lazy() for code-splitting.
 * All routes are wrapped in a Suspense boundary with a loading fallback.
 *
 * Route groups:
 *   - Auth: splash, auth, login, onboarding, role-selection
 *   - Dashboard: dashboard, notifications, tutoriel
 *   - Finance: finance, transaction/*, balance, versement, saisie-rapide/*
 *   - Groups: groups, groups/:id
 *   - Events: events, event/new, event/:id
 *   - Members: members, membres-en-avance, membre/:id
 *   - Archives: archives
 *   - Reports: reports, report-builder, cotisations
 *   - Forms: forms, form/fill/:id, custom-fields
 *   - System: trace, history, help, settings, not-found
 */

import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { IonPage, IonContent } from "@ionic/react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Suspense Fallback ─────────────────────────────────────────────────────────
const PageSkeleton = () => (
  <IonPage>
    <IonContent fullscreen className="ion-padding ion-padding-top">
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </IonContent>
  </IonPage>
);

// ─── Auth Pages (lightweight — load eagerly) ───────────────────────────────────
import Splash from "@/pages/Splash";
import AuthPage from "@/pages/AuthPage";
import Login from "@/pages/Login";

// ─── Heavy Pages (lazy-loaded) ─────────────────────────────────────────────────
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const RoleSelection = lazy(() => import("@/pages/RoleSelection"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Tutorial = lazy(() => import("@/pages/Tutorial"));
const Finance = lazy(() => import("@/pages/Finance"));
const TransactionNew = lazy(() => import("@/pages/TransactionNew"));
const TransactionNewGroup = lazy(() => import("@/pages/TransactionNewGroup"));
const TransactionDetail = lazy(() => import("@/pages/TransactionDetail"));
const TransactionEdit = lazy(() => import("@/pages/TransactionEdit"));
const Balance = lazy(() => import("@/pages/Balance"));
const Versement = lazy(() => import("@/pages/Versement"));
const SaisieRapide = lazy(() => import("@/pages/SaisieRapide"));
const Groups = lazy(() => import("@/pages/Groups"));
const GroupDetail = lazy(() => import("@/pages/GroupDetail"));
const Events = lazy(() => import("@/pages/Events"));
const EventNew = lazy(() => import("@/pages/EventNew"));
const EventDetail = lazy(() => import("@/pages/EventDetail"));
const EventEdit = lazy(() => import("@/pages/EventEdit"));
const Members = lazy(() => import("@/pages/Members"));
const MembresEnAvance = lazy(() => import("@/pages/MembresEnAvance"));
const MembreDetail = lazy(() => import("@/pages/MembreDetail"));
const CulteDetail = lazy(() => import("@/pages/CulteDetail"));
const Archives = lazy(() => import("@/pages/Archives"));
const Reports = lazy(() => import("@/pages/Reports"));
const ReportBuilder = lazy(() => import("@/pages/ReportBuilder"));
const Cotisations = lazy(() => import("@/pages/Cotisations"));
const FormBuilder = lazy(() => import("@/pages/FormBuilder"));
const FormFill = lazy(() => import("@/pages/FormFill"));
const CustomFields = lazy(() => import("@/pages/CustomFields"));
const Trace = lazy(() => import("@/pages/Trace"));
const History = lazy(() => import("@/pages/History"));
const Help = lazy(() => import("@/pages/Help"));
const Settings = lazy(() => import("@/pages/Settings"));
const InvitationEmit = lazy(() => import("@/pages/InvitationEmit"));
const InvitationClaim = lazy(() => import("@/pages/InvitationClaim"));
const InvitationManage = lazy(() => import("@/pages/InvitationManage"));
const CentralAdmin = lazy(() => import("@/pages/CentralAdmin"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// ─── Lazy Route Wrapper ────────────────────────────────────────────────────────
function LazyRoute({
  component: LazyComponent,
}: {
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LazyComponent />
    </Suspense>
  );
}

/**
 * All routes for the Ionic app.
 * Each Route uses the same path as the original react-router setup.
 */
export const luminaRoutes = (
  <>
    {/* ── Auth ─────────────────────────────────────────────────────── */}
    <Route path="/splash" element={<Splash />} />
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/auth/callback" element={<AuthPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/onboarding" element={<LazyRoute component={Onboarding} />} />
    <Route
      path="/role-selection"
      element={<LazyRoute component={RoleSelection} />}
    />

    {/* ── Core ─────────────────────────────────────────────────────── */}
    <Route path="/dashboard" element={<LazyRoute component={Dashboard} />} />
    <Route
      path="/notifications"
      element={<LazyRoute component={Notifications} />}
    />
    <Route path="/tutoriel" element={<LazyRoute component={Tutorial} />} />

    {/* ── Finance ──────────────────────────────────────────────────── */}
    <Route path="/finance" element={<LazyRoute component={Finance} />} />
    <Route
      path="/transaction/new"
      element={<LazyRoute component={TransactionNew} />}
    />
    <Route
      path="/groups/:id/transaction/new"
      element={<LazyRoute component={TransactionNewGroup} />}
    />
    <Route
      path="/transaction/:id"
      element={<LazyRoute component={TransactionDetail} />}
    />
    <Route
      path="/transaction/:id/edit"
      element={<LazyRoute component={TransactionEdit} />}
    />
    <Route path="/balance" element={<LazyRoute component={Balance} />} />
    <Route path="/versement" element={<LazyRoute component={Versement} />} />
    <Route
      path="/saisie-rapide/:id"
      element={<LazyRoute component={SaisieRapide} />}
    />

    {/* ── Groups ───────────────────────────────────────────────────── */}
    <Route path="/groups" element={<LazyRoute component={Groups} />} />
    <Route path="/groups/:id" element={<LazyRoute component={GroupDetail} />} />

    {/* ── Events ───────────────────────────────────────────────────── */}
    <Route path="/events" element={<LazyRoute component={Events} />} />
    <Route path="/event/new" element={<LazyRoute component={EventNew} />} />
    <Route path="/event/:id" element={<LazyRoute component={EventDetail} />} />
    <Route
      path="/event/:id/edit"
      element={<LazyRoute component={EventEdit} />}
    />

    {/* ── Members ──────────────────────────────────────────────────── */}
    <Route path="/members" element={<LazyRoute component={Members} />} />
    <Route
      path="/membres-en-avance"
      element={<LazyRoute component={MembresEnAvance} />}
    />
    <Route
      path="/membre/:id"
      element={<LazyRoute component={MembreDetail} />}
    />
    <Route path="/culte/:id" element={<LazyRoute component={CulteDetail} />} />

    {/* ── Archives ─────────────────────────────────────────────────── */}
    <Route path="/archives" element={<LazyRoute component={Archives} />} />

    {/* ── Reports ──────────────────────────────────────────────────── */}
    <Route path="/reports" element={<LazyRoute component={Reports} />} />
    <Route
      path="/report-builder"
      element={<LazyRoute component={ReportBuilder} />}
    />
    <Route
      path="/cotisations"
      element={<LazyRoute component={Cotisations} />}
    />

    {/* ── Forms ────────────────────────────────────────────────────── */}
    <Route path="/forms" element={<LazyRoute component={FormBuilder} />} />
    <Route path="/form/fill/:id" element={<LazyRoute component={FormFill} />} />
    <Route
      path="/custom-fields"
      element={<LazyRoute component={CustomFields} />}
    />

    {/* ── Invitations ──────────────────────────────────────────── */}
    <Route path="/invitation/emit" element={<LazyRoute component={InvitationEmit} />} />
    <Route path="/invitation/claim" element={<LazyRoute component={InvitationClaim} />} />
    <Route path="/invitation/manage" element={<LazyRoute component={InvitationManage} />} />

    {/* ── Central Administration (multi-org) ─────────────────────── */}
    <Route path="/admin" element={<LazyRoute component={CentralAdmin} />} />
    <Route
      path="/admin/organizations/:id"
      element={<LazyRoute component={CentralAdmin} />}
    />

    {/* ── System ───────────────────────────────────────────────────── */}
    <Route path="/trace" element={<LazyRoute component={Trace} />} />
    <Route path="/history" element={<LazyRoute component={History} />} />
    <Route path="/help" element={<LazyRoute component={Help} />} />
    <Route path="/settings" element={<LazyRoute component={Settings} />} />
    <Route path="*" element={<LazyRoute component={NotFound} />} />
  </>
);

/**
 * Total route count for verification.
 */
export const ROUTE_COUNT = 38;
