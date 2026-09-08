# Ionic React Migration

> Date: 2026-09-08
> Status: **Core integration complete — pages unchanged, IonSplitPane responsive layout in place**
> Scope: Incremental, non-breaking migration from pure React web → React + Ionic mobile

---

## 1. Migration Approach

### Strategy: Incremental, Non-Breaking

Ionic React is integrated as a **thin wrapper** around the existing React application. No page component was modified. The migration follows this principle:

> **React pages stay as-is.** Ionic components wrap the app shell (router, app container) without touching page content.

This means:

- Existing pages (`src/pages/*.tsx`) are **unchanged**.
- Existing Zustand stores, capabilities, and utilities are **unchanged**.
- Only the **app shell** (routing, theming, top-level container) was replaced with Ionic equivalents.
- The old `BrowserRouter` is replaced by `IonReactRouter`; all route paths remain identical.

### Phases

| Phase | Status | Description |
|-------|--------|-------------|
| P0: Core wrapper | Done | `App.tsx` wraps app in `IonApp` + `IonReactRouter` |
| P1: Theme mapping | Done | Lumina tokens mapped to Ionic CSS variables (`theme.ts`) |
| P2: Route preservation | Done | 38 routes migrated from react-router to Ionic routes |
| P3: Mobile layout | Done | `IonSplitPane` for responsive desktop/mobile layout in `IonicApp.tsx` |
| P4: Ionic-native components | Planned | `IonPage`, `IonHeader`, `IonContent`, `IonToolbar`, `IonFab` per page |
| P5: Native features | Planned | Capacitor plugins (camera, geolocation, etc.) |

---

## 2. Component Mapping Table

### React → Ionic Equivalents

| React Pattern | Ionic Equivalent | Usage Notes |
|--------------|-----------------|-------------|
| `BrowserRouter` | `IonReactRouter` | Drop-in replacement; same API |
| `Routes` / `Route` | `IonRouterOutlet` / `Route` | Routes unchanged; outlet wraps them |
| `Navigate` | `Navigate` | Same component from `react-router-dom` |
| `div` (page wrapper) | `IonPage` | Add to page root for safe-area handling |
| `header` | `IonHeader` + `IonToolbar` | Use for native-style top bars |
| `main` / content wrapper | `IonContent` | Handles scroll, safe areas, keyboard |
| `nav` / sidebar | `IonMenu` / `IonSplitPane` | Responsive sidebar for desktop |
| `button` | `IonButton` | Ripple effect, native styling |
| `input` | `IonInput` | Keyboard handling, safe-area aware |
| `select` | `IonModal` (picker) | No native select; use modal picker |
| `Modal` (custom) | `IonModal` / `IonAlert` | Native modal behavior |
| `Snackbar` / toast | `IonToast` | Native toast notifications |
| `Fab` (custom) | `IonFab` | Native floating action button |
| `TabBar` (custom) | `IonTabs` / `IonTabBar` | Native tab navigation |
| `Loading` overlay | `IonLoading` | Native loading indicator |
| `div` (card) | `IonCard` | Native card with ripple |
| `List` / `ul` | `IonList` / `IonItem` | Grouped list items |
| `ProgressBar` | `IonProgress` | Native progress indicators |

### Currently Unchanged (React-only)

The following are intentionally left as React components because they are custom-styled or business-specific:

| Component | Reason |
|-----------|--------|
| `TransactionCard` | Custom financial card layout |
| `BottomNav` | Custom bottom navigation with icons |
| `TopHeader` | Custom header with org selector |
| `DatePicker` | Custom date picker UI |
| `StatusBadge` | Inline badge component |
| `ConfirmModal` | Custom confirmation dialog |
| `ui/*` (shadcn) | Tailwind-based UI library |

---

## 3. Architecture Changes

### Router

**Before (pure React):**
```tsx
<BrowserRouter>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    ...
  </Routes>
</BrowserRouter>
```

**After (Ionic React):**
```tsx
// src/App.tsx
<IonApp>
  <IonReactRouter>
    <AppProvider>
      <SyncIndicator />
      <IonRouterOutlet>
        {luminaRoutes}
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
```

Key differences:
- `IonReactRouter` replaces `BrowserRouter` — same history API, same hook signatures (`useNavigate`, `useLocation`, `useParams`).
- `IonRouterOutlet` replaces `Routes` — wraps all routes.
- Wildcard routes (`path="*"`) still work identically.
- `AppRouter.tsx` (auth guard) is unchanged — it uses `useNavigate` and `useLocation` which are identical across both routers.
- `IonicApp.tsx` provides a secondary entry with `IonSplitPane` for responsive desktop/mobile layout.

### Theming

Lumina's design tokens are mapped to Ionic CSS variables at startup in `src/ionic/theme.ts`:

```typescript
// Lumina tokens → Ionic CSS variables
const LUMINA_TOKENS = {
  accentPrimary: '#FF6B00',
  dataIncome: '#1DB954',
  dataExpense: '#E51332',
  dataPending: '#FFB800',
  // ...
};

root.style.setProperty('--ion-color-primary', LUMINA_TOKENS.accentPrimary);
root.style.setProperty('--ion-background-color', LUMINA_TOKENS.canvas);
// ... 12+ variable mappings
```

This means all existing Tailwind color classes continue to work, and Ionic components inherit the Lumina palette automatically.

### Navigation

**Desktop (≥ `lg` breakpoint):**
- `IonSplitPane` provides a responsive sidebar layout.
- Navigation is handled by the existing `BottomNav` / `TopHeader` components.

**Mobile (< `lg` breakpoint):**
- Single-pane `IonRouterOutlet` renders pages full-screen.
- Safe-area insets are applied via CSS `env(safe-area-inset-*).`

**Future (planned):**
- Replace `BottomNav` with `IonTabs` / `IonTabBar` for native mobile bottom navigation.
- Replace `TopHeader` with `IonHeader` + `IonToolbar` for native top bars.

---

## 4. Known Differences and Workarounds

### 4.1 `IonReactRouter` vs `BrowserRouter`

| Concern | Detail |
|---------|--------|
| History API | Identical — `useNavigate`, `useLocation`, `useParams` work the same |
| Nested routes | Same behavior |
| Redirects | `Navigate` component works identically |
| **Caveat** | `IonReactRouter` must wrap `IonRouterOutlet` — cannot be used standalone |

### 4.2 Safe Area Insets

Ionic requires `env(safe-area-inset-*)` for notched devices. The theme sets these globally:

```css
--ion-safe-area-top: env(safe-area-inset-top, 0px);
--ion-safe-area-bottom: env(safe-area-inset-bottom, 0px);
```

Pages that use fixed positioning may need adjustment. Currently, the existing layout handles this without changes.

### 4.3 Keyboard Handling

Ionic's `keyboardBehavior: 'ion-focus'` automatically scrolls focused inputs into view. This is active on mobile builds but has no effect on web.

### 4.4 `IonPage` Wrapping

When migrating individual pages to use `IonPage`, ensure:
- `IonPage` is the **root element** of the page component.
- `IonContent` wraps all scrollable content inside `IonPage`.
- Existing page CSS is preserved — `IonPage` uses `position: relative` and full viewport height.

### 4.5 Touch Feedback

Ionic adds ripple effects to `IonButton`, `IonItem`, etc. Existing custom buttons (`Button.tsx`, `ui/button`) are **not** affected — they retain their current behavior.

### 4.6 React Router Hooks Compatibility

All hooks are fully compatible:

```typescript
// These work identically in both routers
const { navigate } = useNavigate();      // same
const { pathname } = useLocation();      // same
const { id } = useParams<{ id: string }>(); // same
```

### 4.7 Capacitor Build Considerations

The `build:cap` script sets `CAPACITOR_BUILD=true` which:
- Disables Nitro SSR (server-side rendering) — not needed for mobile.
- Disables top-level await (not supported in Capacitor WebView).
- Enables component tagging for debugging.

### 4.8 Performance: `IonSplitPane` on Desktop

`IonSplitPane` evaluates the `when` breakpoint on every resize. For Lumina's current use case (mostly mobile, occasional desktop), this is acceptable. If desktop performance becomes an issue, consider lazy-initializing the split pane.

---

## 5. Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Wrapped in `IonApp` + `IonReactRouter` + `IonRouterOutlet` |
| `src/ionic/theme.ts` | New — Lumina token → Ionic variable mapping |
| `src/ionic/theme.css` | New — Ionic CSS overrides for dark theme |
| `src/ionic/routing.tsx` | New — 38 route definitions for Ionic router |
| `src/IonicApp.tsx` | New — standalone Ionic wrapper (alternative entry) |
| `src/main.tsx` | Imports `./ionic/theme.css` and `./ionic/theme` |
| `package.json` | Added `@ionic/react`, `@ionic/react-router`, `@ionic/core` |

---

## 6. Rollback Plan

Because the migration is a thin wrapper:

1. Remove `IonApp`, `IonReactRouter`, `IonRouterOutlet` from `App.tsx`.
2. Restore `<BrowserRouter>` + `<Routes>`.
3. Delete `src/ionic/` directory.
4. Remove Ionic dependencies from `package.json`.

All pages, stores, and business logic remain fully functional without Ionic.

---

## 7. Next Steps

1. **P3 Mobile layout**: Implement `IonTabs` bottom navigation for mobile.
2. **P4 Ionic-native pages**: Wrap key pages (Finance, Members, Events) in `IonPage`/`IonHeader`/`IonContent`.
3. **P5 Native features**: Add camera, geolocation, and file-picker via Capacitor plugins.
4. **P6 Offline-first**: Leverage Ionic's native offline storage alongside PowerSync.
