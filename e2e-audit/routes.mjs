// Route inventory for the audit runner. Parametrized routes are resolved to
// the demo ids seeded by demoSeed.mjs so each screen renders real data.
export const ROUTES = [
  "/welcome", "/splash", "/auth", "/onboarding", "/sessions", "/org-setup",
  "/dashboard", "/notifications", "/search", "/history", "/help", "/tutoriel",
  "/finance", "/balance", "/cotisations", "/versement", "/membres-en-avance",
  "/budgets", "/giving", "/reports", "/report-builder", "/admin", "/admin/federation",
  "/admin/federation/tree", "/admin/roles", "/admin/reports", "/admin/units",
  "/admin/transfer-ownership", "/admin/report-send", "/groups", "/members",
  "/events", "/forms", "/custom-fields", "/archives", "/trace",
  "/invitation/emit", "/invitation/manage", "/invitation/claim",
  "/settings", "/settings/about", "/settings/features", "/settings/gestion",
  "/settings/health", "/settings/notifications", "/settings/personnalisation",
  "/settings/profil", "/settings/theme",
  // Parametrized (resolved to demo ids)
  "/budgets/demo-budget-2026",
  "/culte/demo-event-culte",
  "/event/demo-event-retraite",
  "/event/demo-event-retraite/edit",
  "/form/fill/demo-form-visite",
  "/forms/demo-form-visite/submissions",
  "/giving/campaigns/demo-campaign-construction",
  "/groups/demo-group-jeunesse",
  "/groups/demo-group-jeunesse/cotisation",
  "/groups/demo-group-jeunesse/transaction/new",
  "/membre/demo-mem-1",
  "/saisie-rapide/demo-group-jeunesse",
  "/transaction/demo-tx-1",
  "/transaction/demo-tx-1/edit",
  "/admin/reports/demo-report-mensuel",
];

// Screens exempt from the "empty space under header" check (full-bleed).
export const FULLBLEED = new Set(["/splash", "/welcome", "/auth"]);
