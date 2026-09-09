# Bundle Size Analysis - Lumina

**Date:** 2026-09-09
**Build Tool:** Vite 8.2.2 + Nitro
**Total uncompressed:** ~11.1 MB | **Main JS bundle:** 3,282 KB (gzip: ~855 KB)

---

## 1. Bundle Sizes

### Production Build Output
| Asset | Size | Gzip | Notes |
|-------|------|------|-------|
| index-B7v7BJ7g.js | 3,283 KB | 855 KB | Main application bundle |
| mc-wa-sqlite-async-*.wasm | 2,446 KB | 892 KB | PowerSync WASM (multi-core) |
| wa-sqlite-async-*.wasm | 2,282 KB | 806 KB | PowerSync WASM (async) |
| mc-wa-sqlite-*.wasm | 1,281 KB | 605 KB | PowerSync WASM (multi-core sync) |
| wa-sqlite-*.wasm | 1,098 KB | 530 KB | PowerSync WASM (sync) |
| html2canvas-CCZa1RAX.js | 195 KB | 47 KB | jspdf optional dep |
| index.es-BKV7_MAd.js | 148 KB | 49 KB | DOMPurify + es5-ext |
| websockets-*.js | 108 KB | 23 KB | PowerSync websockets |
| worker-DJSXMwe3.js | 77 KB | -- | PowerSync worker |
| index-BP_HfbmZ.css | 66 KB | 12 KB | App styles |

**Total JS: 4.23 MB | Total WASM: 6.89 MB | Grand total: 11.12 MB**

---

## 2. Large Dependencies (in main bundle)

| Dependency | Estimate | Usage Pattern |
|-----------|----------|---------------|
| **@ionic/react + @ionic/core** | ~400-500 KB | Framework shell, full app navigation |
| **recharts** | ~150-200 KB | Charts in History + Tutorial pages |
| **lucide-react** | ~50-80 KB | 46 distinct icons imported across app |
| **@supabase/supabase-js** | ~100-150 KB | Supabase client + auth |
| **@powersync/web + @journeyapps/wa-sqlite** | ~200-300 KB | Offline-first DB (includes 4 WASM variants) |
| **html2canvas** | ~195 KB | Transitive dep from jspdf (optional) |
| **jspdf + jspdf-autotable** | ~200 KB | PDF export (only used in export.ts) |
| **xlsx (SheetJS)** | ~200 KB | Excel export (only used in export.ts) |
| **sonner** | ~40 KB | Toast notifications (used app-wide) |
| **date-fns** | ~3 KB (actual) | Only `format` + `formatDistanceToNow` used |
| **zustand** | ~10 KB | State management |
| **zod** | ~20 KB | Validation schemas |

---

## 3. Unused / Unused-by-Design Imports

### Heavy deps with minimal actual usage
- **date-fns** -- only `format` and `formatDistanceToNow` used. Bundle includes full library.
  - *Fix:* Replace with `date-fns/format` and `date-fns/formatDistanceToNow` or switch to `dayjs` (tree-shakeable).
- **xlsx** -- 1 file (`src/lib/export.ts`). 200 KB always loaded.
- **jspdf + jspdf-autotable** -- 1 file (`src/lib/export.ts`). ~200 KB always loaded.
- **html2canvas** -- NOT directly imported by source. Pulled in transitively as an optional dependency of jspdf. 195 KB wasted.
- **cmdk** -- component built (`src/components/ui/command.tsx`) but never used in any page.
- **vaul** -- component built (`src/components/ui/drawer.tsx`) and used in `BottomDrawer.tsx`. Valid.
- **embla-carousel-react** -- component built (`src/components/ui/carousel.tsx`) but no pages use it.

### Radix UI over-imports
26 `@radix-ui/*` packages installed. Only these are actually used:
- `@radix-ui/react-slot` (button, input, separator, command)
- `@radix-ui/react-dialog` (modal, drawer, command)
- `@radix-ui/react-label` (form)
- `@radix-ui/react-toast` (sonner is separate)
- `@radix-ui/react-select` (dropdowns)
- `@radix-ui/react-checkbox` (checkboxes)
- `@radix-ui/react-switch` (toggles)
- `@radix-ui/react-tabs` (tabs)
- `@radix-ui/react-tooltip` (tooltips)
- `@radix-ui/react-popover` (popovers)
- `@radix-ui/react-accordion` (accordion)
- `@radix-ui/react-avatar` (avatars)
- Unused: alert-dialog, aspect-ratio, collapsible, context-menu, dropdown-menu, hover-card, menubar, navigation-menu, progress, radio-group, scroll-area, separator, slider, toggle, toggle-group

---

## 4. Code Splitting Opportunities

### Current state
- **Zero route-level code splitting.** All 39 pages are statically imported in `src/ionic/routing.tsx`.
- **Zero lazy-loaded components.** 0 `React.lazy()` or `Suspense` wrappers in the codebase.
- **18 dynamic imports** exist but only in test files.

### High-impact opportunities
1. **Lazy-load pages** -- 39 pages all bundled in `index-B7v7BJ7g.js` (3.3 MB). Code-splitting by route could reduce initial load by 60-70%.
   - `src/ionic/routing.tsx` imports all pages statically. Replace with `React.lazy(() => import('@/pages/SomePage'))`.
   - Expected savings: ~1.5-2 MB on initial load.

2. **Lazy-load export utilities** -- `src/lib/export.ts` imports jspdf, jspdf-autotable, and xlsx (each ~150-200 KB). Move to `React.lazy()` or dynamic import at point of use.
   - Expected savings: ~350-400 KB.

3. **Remove jspdf optional dependency html2canvas** -- jspdf declares html2canvas as an optional dependency, which pnpm resolves and bundles even though it's never used.
   - Expected savings: ~195 KB.

4. **Remove unused Radix UI packages** from package.json -- 15 unused packages (~50-80 KB combined).
   - Expected savings: ~50-80 KB.

5. **Remove embla-carousel-react** -- built but unused (50-80 KB).
   - Expected savings: ~50-80 KB.

6. **Remove cmdk** -- built but unused (30-50 KB).
   - Expected savings: ~30-50 KB.

### WASM strategy
4 wa-sqlite WASM variants bundled (2.2 MB + 2.5 MB + 1.3 MB + 1.1 MB = 7.1 MB total). These are from `@journeyapps/wa-sqlite` via `@powersync/web`. They could potentially be:
- Only loaded on-demand (first time PowerSync is initialized)
- Reduced to 1-2 variants instead of 4
- Expected savings: 3-5 MB if optimized.

---

## 5. Recommendations (Priority Order)

| Priority | Action | Expected Impact | Effort |
|----------|--------|-----------------|--------|
| P0 | Lazy-load all 39 pages via React.lazy + Suspense | -1.5 to -2 MB initial load | Medium |
| P0 | Dynamic import jspdf/xlsx in export.ts | -350-400 KB | Low |
| P1 | Remove jspdf html2canvas optional dep | -195 KB | Low |
| P1 | Remove unused Radix UI packages | -50-80 KB | Low |
| P1 | Remove embla-carousel-react | -50-80 KB | Low |
| P1 | Remove cmdk | -30-50 KB | Low |
| P2 | Replace date-fns with selective imports or dayjs | -2-3 KB | Low |
| P2 | Reduce wa-sqlite WASM variants | -3-5 MB | Medium-High |
| P3 | Investigate recharts tree-shaking (currently loads full lib) | -50-100 KB | Medium |

---

## 6. Files to Modify

- `src/ionic/routing.tsx` -- convert static imports to lazy()
- `src/lib/export.ts` -- wrap jspdf/xlsx in dynamic import()
- `package.json` -- remove unused dev/peer deps:
  - `@radix-ui/react-alert-dialog`
  - `@radix-ui/react-aspect-ratio`
  - `@radix-ui/react-collapsible`
  - `@radix-ui/react-context-menu`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-hover-card`
  - `@radix-ui/react-menubar`
  - `@radix-ui/react-navigation-menu`
  - `@radix-ui/react-progress`
  - `@radix-ui/react-radio-group`
  - `@radix-ui/react-scroll-area`
  - `@radix-ui/react-separator`
  - `@radix-ui/react-slider`
  - `@radix-ui/react-toggle`
  - `@radix-ui/react-toggle-group`
  - `embla-carousel-react`
  - `cmdk`
- `vite.config.ts` -- add manualChunks for heavy deps

---

*Report generated by bundle analysis. Visualizer HTML saved at bundle-analysis.html.*
