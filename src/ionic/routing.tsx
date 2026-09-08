/**
 * Lumina Ionic Router Routes
 *
 * Maps all 38 pages to Ionic <Route> elements.
 * Uses IonReactRouter-compatible paths (same as react-router).
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

import { Route, Navigate } from 'react-router-dom';

// Auth pages
import Splash from '@/pages/Splash';
import AuthPage from '@/pages/AuthPage';
import Login from '@/pages/Login';
import Onboarding from '@/pages/Onboarding';
import RoleSelection from '@/pages/RoleSelection';

// Core pages
import Dashboard from '@/pages/Dashboard';
import Notifications from '@/pages/Notifications';
import Tutorial from '@/pages/Tutorial';

// Finance pages
import Finance from '@/pages/Finance';
import TransactionNew from '@/pages/TransactionNew';
import TransactionNewGroup from '@/pages/TransactionNewGroup';
import TransactionDetail from '@/pages/TransactionDetail';
import TransactionEdit from '@/pages/TransactionEdit';
import Balance from '@/pages/Balance';
import Versement from '@/pages/Versement';
import SaisieRapide from '@/pages/SaisieRapide';

// Groups
import Groups from '@/pages/Groups';
import GroupDetail from '@/pages/GroupDetail';

// Events
import Events from '@/pages/Events';
import EventNew from '@/pages/EventNew';
import EventDetail from '@/pages/EventDetail';
import EventEdit from '@/pages/EventEdit';

// Members
import Members from '@/pages/Members';
import MembresEnAvance from '@/pages/MembresEnAvance';
import MembreDetail from '@/pages/MembreDetail';

// Archives & Reports
import Archives from '@/pages/Archives';
import Reports from '@/pages/Reports';
import ReportBuilder from '@/pages/ReportBuilder';
import Cotisations from '@/pages/Cotisations';

// Forms
import FormBuilder from '@/pages/FormBuilder';
import FormFill from '@/pages/FormFill';
import CustomFields from '@/pages/CustomFields';

// System
import Trace from '@/pages/Trace';
import History from '@/pages/History';
import Help from '@/pages/Help';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';
import CulteDetail from '@/pages/CulteDetail';

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
    <Route path="/onboarding" element={<Onboarding />} />
    <Route path="/role-selection" element={<RoleSelection />} />

    {/* ── Core ─────────────────────────────────────────────────────── */}
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/notifications" element={<Notifications />} />
    <Route path="/tutoriel" element={<Tutorial />} />

    {/* ── Finance ──────────────────────────────────────────────────── */}
    <Route path="/finance" element={<Finance />} />
    <Route path="/transaction/new" element={<TransactionNew />} />
    <Route path="/groups/:id/transaction/new" element={<TransactionNewGroup />} />
    <Route path="/transaction/:id" element={<TransactionDetail />} />
    <Route path="/transaction/:id/edit" element={<TransactionEdit />} />
    <Route path="/balance" element={<Balance />} />
    <Route path="/versement" element={<Versement />} />
    <Route path="/saisie-rapide/:id" element={<SaisieRapide />} />

    {/* ── Groups ───────────────────────────────────────────────────── */}
    <Route path="/groups" element={<Groups />} />
    <Route path="/groups/:id" element={<GroupDetail />} />

    {/* ── Events ───────────────────────────────────────────────────── */}
    <Route path="/events" element={<Events />} />
    <Route path="/event/new" element={<EventNew />} />
    <Route path="/event/:id" element={<EventDetail />} />
    <Route path="/event/:id/edit" element={<EventEdit />} />

    {/* ── Members ──────────────────────────────────────────────────── */}
    <Route path="/members" element={<Members />} />
    <Route path="/membres-en-avance" element={<MembresEnAvance />} />
    <Route path="/membre/:id" element={<MembreDetail />} />
    <Route path="/culte/:id" element={<CulteDetail />} />

    {/* ── Archives ─────────────────────────────────────────────────── */}
    <Route path="/archives" element={<Archives />} />

    {/* ── Reports ──────────────────────────────────────────────────── */}
    <Route path="/reports" element={<Reports />} />
    <Route path="/report-builder" element={<ReportBuilder />} />
    <Route path="/cotisations" element={<Cotisations />} />

    {/* ── Forms ────────────────────────────────────────────────────── */}
    <Route path="/forms" element={<FormBuilder />} />
    <Route path="/form/fill/:id" element={<FormFill />} />
    <Route path="/custom-fields" element={<CustomFields />} />

    {/* ── System ───────────────────────────────────────────────────── */}
    <Route path="/trace" element={<Trace />} />
    <Route path="/history" element={<History />} />
    <Route path="/help" element={<Help />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="*" element={<NotFound />} />
  </>
);

/**
 * Total route count for verification.
 */
export const ROUTE_COUNT = 38;
