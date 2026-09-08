# Ionic React Migration

> Date: 2026-09-08
> Status: **Core integration complete — pages unchanged, IonSplitPane responsive layout in place**
> Type: Incremental, non-breaking migration

---

## Summary

Lumina integrates Ionic React 9 as a thin wrapper around the existing React web application. No page component was modified. The migration replaces only the app shell (router container, theming layer) while preserving all existing routes, Zustand stores, capabilities, and UI components.

## Approach

| Aspect | Decision |
|--------|----------|
| Strategy | Incremental, non-breaking |
| Scope | App shell only (router + theme) |
| Pages modified | None (0 of 36+) |
| Stores modified | None |
| Capability modified | None |
| Rollback | Delete `src/ionic/` + restore `BrowserRouter` in `App.tsx` |

## What Changed

```
src/
├── App.tsx               # Wrapped in IonApp + IonReactRouter
├── main.tsx              # Imports Ionic theme
└── ionic/                # New directory
    ├── theme.ts          # Lumina tokens → Ionic CSS variables
    ├── theme.css         # Ionic dark theme overrides
    └── routing.tsx       # 38 route definitions
```

## What Did Not Change

- All 36+ pages in `src/pages/`
- All Zustand stores in `src/store/`
- All capabilities in `src/capabilities/`
- All UI components in `src/components/ui/`
- All auth, data layer, and service code
- All route paths (identical in `IonReactRouter`)

## Component Mapping

| React | Ionic |
|-------|-------|
| `BrowserRouter` | `IonReactRouter` |
| `Routes` | `IonRouterOutlet` |
| `Navigate` | `Navigate` (same) |
| `div` (page root) | `IonPage` (planned per page) |
| `header` | `IonHeader` + `IonToolbar` (planned) |
| `main` content | `IonContent` (planned) |
| Custom `Button` | Custom (unchanged) |
| Custom `BottomNav` | Custom (unchanged) |
| shadcn `ui/*` | shadcn (unchanged) |

## Route Count

38 routes preserved identically from `src/ionic/routing.tsx`.

See `docs/ionic-migration.md` for full technical details.
