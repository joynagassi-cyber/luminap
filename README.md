# Lumina

> A financial management application for French associations — built with React, Ionic, Capacitor, and PowerSync.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | React 19 + TypeScript | ^19.2.8 |
| **Mobile Shell** | Capacitor 6 (Android) | ^6.2.2 |
| **UI Component Library** | Ionic React 9 | ^9.0.2 |
| **Build Tool** | Vite | ^8.2.2 |
| **State Management** | Zustand | ^5.0.15 |
| **Data Layer** | PowerSync (SQLite + Supabase) | ^2.x |
| **Backend** | Supabase (PostgreSQL) | ^2.x |
| **Auth** | Supabase Auth + Google OAuth + OneSignal | |
| **Routing** | React Router DOM → Ionic React Router | ^6.30.6 |
| **Styling** | Tailwind CSS + Ionic CSS Variables | ^3.4.19 |
| **Forms** | React Hook Form + Zod | ^7.87.0 |
| **Data Fetching** | TanStack React Query | ^5.102.8 |
| **Notifications** | OneSignal (Capacitor) | ^5.5.4 |
| **Utilities** | date-fns, lucide-react, recharts | |

## Architecture

Lumina uses an **incremental Ionic React migration** approach — Ionic components wrap the existing React pages without replacing them. The app runs on both web and Android via Capacitor.

```
src/
├── App.tsx               # Main entry — wraps IonicApp + providers
├── IonicApp.tsx          # Ionic wrapper (IonApp + IonReactRouter + IonSplitPane)
├── main.tsx              # React entry point (imports App + Ionic theme)
├── AppRouter.tsx         # Auth route guard (unchanged)
├── ionic/
│   ├── theme.ts          # Lumina design tokens → Ionic CSS variables
│   ├── theme.css         # Ionic CSS overrides
│   └── routing.tsx       # 38 route definitions
├── pages/                # All 36+ existing pages (unchanged)
├── components/           # Shared React components
├── capabilities/         # Business logic capabilities
├── store/                # Zustand stores
├── lib/                  # Utilities, auth, data layer
└── context/              # React contexts
```

## Installation

```bash
# Install dependencies
pnpm install

# Install Capacitor CLI
pnpm add -D @capacitor/cli

# Sync Capacitor config
npx cap init
```

## Development

```bash
# Start Vite dev server (web)
pnpm dev

# Type-check
pnpm lint

# Run tests
pnpm test
```

## Build

```bash
# Production web build
pnpm build

# Dev web build
pnpm build:dev

# Capacitor build (sets CAPACITOR_BUILD=true)
pnpm build:cap
```

## Ionic-Specific Build Commands

```bash
# Add Android platform (first time only)
npx cap add android

# Sync web build to Android
pnpm build:cap && npx cap sync android

# Open Android Studio
npx cap open android

# Live reload to Android device
npx cap run android

# Platform-specific dev with Ionic
pnpm dev --host 0.0.0.0  # expose for device debugging
```

## Ionic Configuration

Ionic React is initialized directly in `src/App.tsx` via `setupIonicReact()`. The app uses **iOS mode** with dark theme by default:

```typescript
// src/App.tsx
setupIonicReact({
  mode: 'ios',
  animated: true,
  keyboardBehavior: 'ion-focus',
  keyboardFillMode: 'overlap',
});
```

The `IonicApp.tsx` file provides the Ionic shell with `IonSplitPane` for responsive desktop/mobile layout:

```tsx
// IonicApp.tsx — wraps all routes in IonApp + IonReactRouter + IonSplitPane
<IonApp>
  <IonReactRouter>
    <IonSplitPane contentId="main-content" when="lg">
      {/* Desktop sidebar layout */}
      <IonRouterOutlet id="main-content">...</IonRouterOutlet>
    </IonSplitPane>
    {/* Mobile single-pane fallback */}
    <IonRouterOutlet id="main-content-mobile">...</IonRouterOutlet>
  </IonReactRouter>
</IonApp>
```

## Theme

Lumina design tokens are mapped to Ionic CSS variables in `src/ionic/theme.ts`. The default palette is dark mode with orange accents (`#FF6B00`).

See `docs/ionic-migration.md` for full migration details.
