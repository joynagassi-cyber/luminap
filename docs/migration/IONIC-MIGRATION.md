# Ionic Migration — React Web to Ionic React

> Date: 2026-09-09
> Status: **Core integration complete** — app shell migrated, pages unchanged
> Strategy: Incremental, non-breaking, thin wrapper

---

## 1. Migration Overview

Lumina migrated from a pure React web app to an Ionic React app by wrapping the existing application in an Ionic shell. **Zero page components were modified.** The migration replaced only the app container, router, and theming layer.

| Aspect | Before | After |
|--------|--------|-------|
| Router | `BrowserRouter` (react-router-dom) | `IonReactRouter` |
| Route outlet | `<Routes>` | `<IonRouterOutlet>` |
| App root | `<div id="root">` | `<IonApp>` |
| Theme | Tailwind + custom CSS | Ionic CSS variables (mapped from Lumina tokens) |
| Mobile layout | Custom responsive CSS | `IonSplitPane` + safe-area insets |
| Pages | 36+ `.tsx` files | **Unchanged** |

---

## 2. What Changed

```
src/
├── App.tsx                  # Wrapped in IonApp + IonReactRouter
├── main.tsx                 # Imports Ionic theme
├── IonicApp.tsx             # New — alternative entry with IonSplitPane
└── ionic/                   # New directory
    ├── theme.ts             # Lumina tokens → Ionic CSS variables
    ├── theme.css            # Ionic dark theme overrides
    └── routing.tsx          # 38 route definitions (identical paths)
```

### App.tsx — Before

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <SyncIndicator />
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* ... 35 more routes */}
          <Route path="*" element={<Navigate to="/splash" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
```

### App.tsx — After

```tsx
import { IonApp, IonReactRouter, IonRouterOutlet } from '@ionic/react';
import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <AppProvider>
          <SyncIndicator />
          <IonRouterOutlet>
            {luminaRoutes}  {/* same routes, same paths */}
            <Route path="/">
              <Navigate to="/splash" replace />
            </Route>
            <Route path="*">
              <Navigate to="/splash" replace />
            </Route>
          </IonRouterOutlet>
        </AppProvider>
      </IonReactRouter>
    </IonApp>
  );
}
```

---

## 3. What Did NOT Change

- **All 36+ pages** in `src/pages/` — zero modifications
- **All Zustand stores** in `src/store/` — zero modifications
- **All capabilities** in `src/capabilities/` — zero modifications
- **All UI components** in `src/components/ui/` — zero modifications
- **All route paths** — identical in `IonReactRouter`
- **All hooks** — `useNavigate`, `useLocation`, `useParams` work identically

---

## 4. Theme Mapping

Lumina design tokens are mapped to Ionic CSS variables at startup (`src/ionic/theme.ts`):

```typescript
const root = document.documentElement;

// Lumina → Ionic CSS variable mapping
root.style.setProperty('--ion-color-primary',      '#FF6B00');  // accentPrimary
root.style.setProperty('--ion-color-success',      '#1DB954');  // dataIncome
root.style.setProperty('--ion-color-danger',       '#E51332');  // dataExpense
root.style.setProperty('--ion-color-warning',      '#FFB800');  // dataPending
root.style.setProperty('--ion-background-color',   '#FAFAFA');  // canvas
root.style.setProperty('--ion-text-color',         '#1A1A2E');  // textPrimary
root.style.setProperty('--ion-safe-area-top',      'env(safe-area-inset-top, 0px)');
root.style.setProperty('--ion-safe-area-bottom',   'env(safe-area-inset-bottom, 0px)');
```

This means all existing Tailwind color classes continue to render correctly, and Ionic components automatically inherit the Lumina palette.

---

## 5. Route Mapping

38 routes preserved identically from the React router to Ionic:

| React Route | Ionic Route | Path |
|-------------|-------------|------|
| `<Route path="/dashboard">` | `<Route path="/dashboard">` | `/dashboard` |
| `<Route path="/finance">` | `<Route path="/finance">` | `/finance` |
| `<Route path="/members">` | `<Route path="/members">` | `/members` |
| `<Route path="/groups">` | `<Route path="/groups">` | `/groups` |
| `<Route path="/events">` | `<Route path="/events">` | `/events` |
| ... (33 more) | ... (33 more) | Identical |

The route definitions live in `src/ionic/routing.tsx` as a single exported array, making it easy to audit and modify routes in one place.

---

## 6. Mobile Layout — IonSplitPane

`IonicApp.tsx` provides a responsive layout using `IonSplitPane`:

```tsx
<IonApp>
  <IonReactRouter>
    <IonSplitPane contentId="main-content" when=">=lg">
      <IonMenu side="start" menuId="sidebar">
        {/* Navigation sidebar — visible on desktop ≥ lg breakpoint */}
        <SidebarNav />
      </IonMenu>
      <IonRouterOutlet id="main-content">
        {routes}
      </IonRouterOutlet>
    </IonSplitPane>
  </IonReactRouter>
</IonApp>
```

- **Desktop (>= lg):** Sidebar + main content area
- **Mobile (< lg):** Single pane, full-screen pages, no sidebar

---

## 7. Component Mapping Reference

| React Pattern | Ionic Equivalent | Status |
|--------------|-----------------|--------|
| `BrowserRouter` | `IonReactRouter` | Done |
| `Routes` + `Route` | `IonRouterOutlet` + `Route` | Done |
| `Navigate` | `Navigate` | Done (same component) |
| `div` page wrapper | `IonPage` | Planned per page |
| `header` element | `IonHeader` + `IonToolbar` | Planned per page |
| `main` content | `IonContent` | Planned per page |
| Custom `Button` | Custom (unchanged) | Kept as-is |
| Custom `BottomNav` | Custom (unchanged) | Kept as-is |
| shadcn `ui/*` | shadcn (unchanged) | Kept as-is |
| Custom `Modal` | `IonModal` | Planned |
| Custom `Toast` | `IonToast` | Planned |
| Custom `Fab` | `IonFab` | Planned |
| Custom `Tabs` | `IonTabs` / `IonTabBar` | Planned |

---

## 8. Known Differences and Workarounds

### 8.1 History API — Identical

`useNavigate`, `useLocation`, and `useParams` work identically in both routers:

```typescript
// These work in both BrowserRouter and IonReactRouter
const navigate = useNavigate();
const location = useLocation();
const params = useParams<{ id: string }>();
```

### 8.2 Safe Area Insets

Ionic applies `env(safe-area-inset-*)` globally via the theme. Pages using fixed positioning should verify layout on notched devices.

### 8.3 Keyboard Handling

On mobile builds, Ionic's `keyboardBehavior: 'ion-focus'` auto-scrolls focused inputs into view. This has no effect on web builds.

### 8.4 Touch Feedback

Ionic adds ripple effects to `IonButton`, `IonItem`, etc. Existing custom buttons (`Button.tsx`, `ui/button`) are **not** affected — they retain their current behavior.

### 8.5 Capacitor Build

The `build:cap` script sets `CAPACITOR_BUILD=true` which:
- Disables Nitro SSR (not needed for mobile WebView)
- Disables top-level await (not supported in Capacitor)
- Enables component tagging for debugging

---

## 9. Rollback Plan

Because the migration is a thin wrapper, rollback is straightforward:

1. Restore `<BrowserRouter>` + `<Routes>` in `App.tsx`
2. Delete `src/ionic/` directory
3. Remove Ionic dependencies from `package.json`
4. Remove `import './ionic/theme.css'` from `main.tsx`

All pages, stores, capabilities, and business logic remain fully functional.

---

## 10. Future Phases

| Phase | Description | Effort |
|-------|-------------|--------|
| P4 | Wrap key pages in `IonPage`/`IonHeader`/`IonContent` | Medium — per page |
| P5 | Replace `BottomNav` with `IonTabs`/`IonTabBar` | Medium — navigation refactor |
| P6 | Add native Capacitor plugins (camera, geolocation) | Low — plugin-specific |
| P7 | Optimize `IonSplitPane` desktop performance | Low — lazy init if needed |

---

*No pages were modified in this migration. Future phases will incrementally adopt Ionic-native components on a per-page basis.*
