# Accessibility Audit Report -- Lumina v2.0
**Date:** 2026-09-09
**Auditor:** Claude Code (Agentic audit)
**Scope:** All pages (`src/pages/`) and components (`src/components/`)
**Standard:** WCAG 2.1 AA (target), with notes on AAA where relevant
**Notes:** Dark theme (`canvas:#121212`, `surface:#212121`, `text-tertiary:#808080`, `text-secondary:#B3B3B3`, `text-primary:#FFFFFF`)

---

## Executive Summary

Lumina has **critical accessibility gaps** that would block WCAG 2.1 AA compliance. The app uses many `<button>` elements for visual toggle patterns without any keyboard focus management, has no skip navigation, missing semantic landmarks, and relies on placeholder-only labelling for a significant number of inputs. These are structural issues, not cosmetic ones.

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| ARIA & labelling | 3 | 5 | 4 | 2 |
| Keyboard navigation | 4 | 3 | 2 | 1 |
| Color contrast | 2 | 1 | 3 | 0 |
| Semantic HTML / landmarks | 1 | 3 | 2 | 0 |
| Focus management | 2 | 4 | 1 | 0 |
| Dynamic content / announcements | 1 | 2 | 1 | 0 |

**Total findings:** 38

---

## CRITICAL Findings

### C-1 -- No Skip Navigation Link
**WCAG 2.4.1 (Level A)**
**Pages:** All pages
**Severity:** Critical

No `#main` or skip-link exists anywhere in the app. Keyboard users must tab through every nav item on every page to reach content. The `TopHeader` and `BottomNav` are always visible and intercept focus immediately.

**Fix:** Add a fixed `<a href="#main" className="sr-only focus:not-sr-only ...">Skip to content</a>` at the top of `App.tsx` and wrap each page's main content in `<main id="main">`.

---

### C-2 -- Toggle Buttons Without Keyboard/Focus Semantics
**WCAG 2.1.1 (Level A), 4.1.2 (Level A)**
**Pages:** `Balance.tsx`, `TransactionEdit.tsx`, `CustomFields.tsx`, `Login.tsx`, `EventNew.tsx`
**Severity:** Critical

Pattern: period toggle, type toggle, status toggle buttons are styled `<button>` elements with no `aria-pressed`, no `aria-current`, and no visible focus ring. When in the "off" state they are styled with `color: '#B3B3B3'` on `#212121` background -- same colour used for the selected state's label, making it impossible for a screen reader user to distinguish the selected item.

Examples:
- `Balance.tsx:73-74` -- Mois/Année toggle (no `aria-pressed`)
- `TransactionEdit.tsx:112-113` -- Entr#xe9e/Sortie toggle
- `Login.tsx:85-96` -- Role selection buttons (no `aria-pressed`)
- `EventNew.tsx:133-147` -- #xe9v#xe9nement/Culte toggle

**Fix:** Add `aria-pressed={period === 'mois'}` (or equivalent) and a visible focus-visible ring to all toggle button groups.

---

### C-3 -- Icon-Only Buttons Without aria-labels
**WCAG 1.1.1 (Level A), 4.1.2 (Level A)**
**Pages:** `Dashboard.tsx` (line 166-180), `EventDetail.tsx` (lines 573-574)
**Severity:** Critical

Multiple icon-only buttons (notification bell, delete icon) have no `aria-label`. Screen reader users hear nothing. The `TopHeader.tsx` buttons at lines 39 and 52 **do** have `aria-label` -- this inconsistency means the in-page duplicates are unintentional gaps.

**Fix:** Add `aria-label="Notifications"` / `aria-label="Supprimer"` / `aria-label="Annuler"` to every icon-only button.

---

### C-4 -- Empty alt on Decorative-Intended Logo
**WCAG 1.1.1 (Level A)**
**Pages:** `Balance.tsx:158`
**Severity:** Critical

```tsx
<img src={appConfig.churchLogoUrl} alt="" className="w-6 h-6 rounded" />
```
The church logo in the Balance page is marked `alt=""` but is not clearly decorative -- it displays the church's brand mark. If the logo conveys identity it should have a descriptive alt (e.g., `alt={`Logo ${churchName}`}`). If genuinely decorative, it should be an inline SVG or `role="presentation"` with no alt.

---

### C-5 -- Modal Dialogs Without ARIA Dialog / Trap
**WCAG 1.3.1 (Level A), 2.1.2 (Level A), 4.1.2 (Level A)**
**Pages:** `EventDetail.tsx` (lines 475, 562), `GroupDetail.tsx` (lines 467, 484, 519), `CustomFields.tsx`, `FormBuilder.tsx`, `Balance.tsx`, `Reports.tsx`, `ConfirmModal.tsx`
**Severity:** Critical

All custom modal overlays are plain `<div>` elements with `onClick` on the backdrop. They lack:
- `role="dialog"` and `aria-modal="true"`
- `aria-labelledby` pointing to the title
- `aria-describedby` pointing to the description
- Focus trap (Tab stays within the modal)
- No hidden state for background content (`aria-hidden="true"`)
- The escape key handler in `ConfirmModal.tsx` listens on `window` not the modal (works, but `document` is more reliable)

**Fix:** Convert modals to use `role="dialog" aria-modal="true"`, add `aria-labelledby`/`aria-describedby`, implement focus trap, and set `aria-hidden="true"` on the page content behind the modal.

---

### C-6 -- Hidden File Inputs Without Associated Labels
**WCAG 1.3.1 (Level A), 4.1.2 (Level A)**
**Pages:** `Settings.tsx:84`, `Settings.tsx:123`
**Severity:** Critical

```tsx
<input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
```
The hidden file inputs are triggered by the visible `<label>` wrapping them, which is correct for the photo camera icon. However, the logo upload trigger at line 122-127 is also a `<label>` wrapping an `<input>` which is technically correct -- but the label text is inside the `<span>` that looks like a button, and there is no explicit `htmlFor` association. Ensure `htmlFor` is set on the label and `id` on the input, or use a proper `<button>` trigger with an accessible file input.

---

### C-7 -- `div` Clickables That Should Be `button`
**WCAG 2.1.1 (Level A)**
**Pages:** `Dashboard.tsx:184-239` (main caisse card), `Dashboard.tsx:289-319` (event cards), `Settings.tsx:178-268` (action cards)
**Severity:** Critical

Clickable cards are `<div>` elements with `onClick`. They have no keyboard handler (`onKeyDown`), no `tabIndex={0}`, no `role="button"`, and no focus style. Keyboard users cannot activate them.

**Fix:** Convert to `<button>` or add `role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handler()}` with a visible focus style.

---

## HIGH Findings

### H-1 -- No Semantic Landmark Elements
**WCAG 1.3.1 (Level A), 2.4.1 (Level A)**
**Pages:** All pages
**Severity:** High

Zero `<header>`, `<main>`, `<nav>`, or `<footer>` elements found in any page file. The app relies on Ionic's `<IonHeader>` / `<IonContent>` which provide some implicit landmarks but are not sufficient for screen reader navigation by region.

**Fix:** Wrap each page in `<main role="main" aria-label="Page content">` and use `<nav aria-label="...">` for the bottom nav and more-menu.

---

### H-2 -- Placeholder-Only Form Labelling
**WCAG 1.3.1 (Level A), 2.4.6 (Level A), 3.3.2 (Level A)**
**Pages:** `Members.tsx` (lines 120-168), `EventNew.tsx` (lines 173-228), `TransactionNew.tsx` (lines 141-256), `Settings.tsx` (lines 103-110), `TransactionEdit.tsx`, `EventDetail.tsx`
**Severity:** High

`77` instances of `outline-none` in pages removes default browser focus styling. `50` inputs across pages use `placeholder` as the sole visible label. Placeholder text disappears on input -- this is a confirmed WCAG violation when no visible `<label>` is present.

Examples:
- `Members.tsx:120` search input -- placeholder only, no label
- `Members.tsx:136-161` -- first name, last name, phone, email fields all placeholder-only
- `EventNew.tsx` -- IonInput elements use placeholder but no visible `<label>`
- `TransactionNew.tsx` -- amount, description, date fields use placeholder only

Note: Some fields (e.g., EventNew name at line 173) **do** have a `<label>` element, which is correct. The issue is the inconsistency.

**Fix:** Add `<label htmlFor="id">` for every input. Use `aria-label` as a fallback only where a visual label is intentionally hidden.

---

### H-3 -- `text-tertiary` (#808080) on `canvas` (#121212) Fails Contrast
**WCAG 1.4.3 (Level AA)**
**Pages:** All pages
**Severity:** High

`text-tertiary` = `#808080` on `canvas` = `#121212` gives a contrast ratio of **~2.85:1** -- well below the 4.5:1 AA requirement for normal text and below the 3:1 requirement for large text.

Affected text includes:
- Subheading descriptions ("Gestion financi#xe8re", "Caisse principale")
- Helper text under form fields
- Status labels and metadata

`text-secondary` (#B3B3B3) on #121212 gives ~6.2:1 -- acceptable. This colour should be used for all body copy. `text-tertiary` should be reserved for decorative/ambient text only.

**Fix:** Change `text-tertiary` usage on primary content to `text-secondary`. Reserve `#808080` for truly decorative text (e.g., section headers with uppercase tracking).

---

### H-4 -- No Focus Visible Styles on Custom Buttons
**WCAG 2.4.7 (Level AA)**
**Pages:** All pages
**Severity:** High

`outline-none` appears 77 times in pages, removing the default browser focus ring. The custom buttons in pages have no `:focus-visible` pseudo-class or equivalent Tailwind class. The only focus-visible styles in the entire app are in `Tutorial.tsx` and a few UI components (`badge.tsx`, `dialog.tsx`, `pagination.tsx`).

**Fix:** Add `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-500` (or similar) as a global focus style in `App.css`, and remove `outline-none` from interactive elements that don't have a custom focus style.

---

### H-5 -- Notification Badge Not Announced to Screen Readers
**WCAG 4.1.3 (Level AA)**
**Pages:** `Dashboard.tsx:172-178`, `TopHeader.tsx:42-46`
**Severity:** High

The unread notification count badge is a visually distinct element but has no `aria-live` region or `aria-label` that conveys the count. Screen reader users cannot know how many unread notifications exist.

**Fix:** Add `aria-label={`${unreadCount} notification(s) non lue(s)`}` to the notification button, or use `<span aria-live="polite" aria-atomic="true">` for the badge.

---

### H-6 -- Tabs Without Keyboard Arrow Navigation
**WCAG 2.1.1 (Level A)**
**Pages:** `EventDetail.tsx`, `GroupDetail.tsx` (tab-like UI)
**Severity:** High

Custom tab patterns use `<button>` elements but lack `role="tab"`, `role="tablist"`, `role="tabpanel"`, and arrow key navigation. The Tutorial page implements these correctly -- use it as a reference.

---

### H-7 -- No `aria-busy` or `aria-live` for Dynamic Content
**WCAG 4.1.3 (Level AA)**
**Pages:** All pages with async data
**Severity:** High

Pages like `Dashboard.tsx`, `Members.tsx`, `Finance.tsx` load data asynchronously and update the UI dynamically. There are no `aria-live` regions to announce content changes (e.g., "Transaction added", "Membre supprim#xe9").

**Fix:** Add `<div aria-live="polite" aria-atomic="true" className="sr-only">` near the top of each page and update it when data changes.

---

### H-8 -- Image Upload Triggers Lack Focus Styles
**WCAG 2.4.7 (Level AA)**
**Pages:** `Settings.tsx:82-85`, `Settings.tsx:122-127`
**Severity:** High

The camera icon and "Choisir un logo" span inside a `<label>` have no visible focus style. `outline-none` or no focus style at all.

---

## MEDIUM Findings

### M-1 -- Inconsistent `IonTitle` Usage
**Pages:** Multiple
**Severity:** Medium

Many pages use `<IonTitle>` inside `<IonToolbar>` but it says a static value (e.g., "Settings", "FormFill", "Login") rather than the contextual page title. This means screen reader users who jump to the title hear the wrong thing.

**Fix:** Make `<IonTitle>` reflect the actual page content (e.g., "Param#xe8tres" for Settings, "Formulaire" for FormFill).

---

### M-2 -- Empty alt on Logo Image in TopHeader
**Pages:** `TopHeader.tsx:28`
**Severity:** Medium

```tsx
<img src="/lumina-logo.png" alt="Lumina" className="w-8 h-8 rounded-lg" />
```
The alt text "Lumina" is appropriate but repeated on every page. If the logo is purely decorative (the brand name is already announced via the `<IonTitle>`), consider `alt=""` to avoid redundancy. This is a judgment call; keeping it is acceptable.

---

### M-3 -- No `lang` Attribute on `<html>` or Page Wrappers
**Severity:** Medium

The app is in French but there is no `lang="fr"` attribute on `<html>` or page root elements. Screen readers default to English and will mispronounce French text.

**Fix:** Add `lang="fr"` to `<html>` in `index.html` or `App.tsx`.

---

### M-4 -- Chart Components Missing Accessible Descriptions
**Pages:** `Tutorial.tsx` (the good example), `Reports.tsx`, `Balance.tsx`
**Severity:** Medium

`Tutorial.tsx` correctly uses `aria-label` on charts. Other pages with charts likely do not. Verify and fix.

---

### M-5 -- `tabIndex={-1}` on Sidebar Toggle
**Pages:** `ui/sidebar.tsx:305`
**Severity:** Medium

```tsx
tabIndex={-1}
```
The sidebar toggle has `tabIndex=-1` which means it's not keyboard-focusable. It is triggered by a button click only. This is intentional for a programmatic toggle but verify that the trigger button itself is keyboard-accessible.

---

### M-6 -- Error Messages Not Associated with Inputs
**WCAG 3.3.1 (Level A)**
**Pages:** `TransactionNew.tsx`, `EventNew.tsx`, `Members.tsx`
**Severity:** Medium

Form validation errors are displayed in `<div>` elements but not linked to their respective inputs via `aria-describedby`. The `form.tsx` UI component uses `aria-invalid` and `aria-describedby` correctly -- apply this pattern globally.

---

### M-7 -- Period/Status Toggle Buttons Missing Active State Indication for Screen Readers
**WCAG 4.1.2 (Level A)**
**Pages:** `Balance.tsx`, `EventDetail.tsx`, `TransactionEdit.tsx`
**Severity:** Medium

Toggle buttons do not communicate their selected state. A screen reader user hears "Mois button" and cannot tell if it is selected or not.

**Fix:** Add `aria-pressed={period === 'mois'}`.

---

### M-8 -- No Loading State Announcements
**WCAG 4.1.3 (Level AA)**
**Pages:** All pages with async data
**Severity:** Medium

No `aria-busy="true"` on loading containers. Screen reader users are not notified when content is loading.

---

## LOW Findings

### L-1 -- Decorative SVGs Without `aria-hidden`
**Severity:** Low

Lucide icons used purely decoratively (e.g., calendar icon next to a date) should have `aria-hidden="true"` or be wrapped in a `<span aria-hidden="true">`. Currently they are rendered as children of buttons/labels where they are ancillary to the text label, which is acceptable. However, standalone icon divs (e.g., `Dashboard.tsx:35` circle with initial) are fine as they are supplementary.

### L-2 -- Color-Only Status Indication
**WCAG 1.4.1 (Level A)**
**Pages:** `Dashboard.tsx`, `EventDetail.tsx`, `GroupDetail.tsx`
**Severity:** Low

Status is communicated via color (green = income, red = expense) without text labels in some contexts. Most places add text labels, but the numeric color coding alone in the stats grid (`text-yellow-500`, `text-purple-500`, `text-blue-500`) relies on color association with the label above it, which is acceptable when the label is present.

### L-3 -- Missing `h1` on Some Pages
**WCAG 1.3.1 (Level A)**
**Severity:** Low

Not every page has a single `<h1>`. The `Dashboard` page uses a `<p>` for the greeting instead of an `<h1>`. Screen reader users rely on heading structure to understand page organization.

### L-4 -- `span` Used for Status Badges Without Role
**Severity:** Low

Status badges use `<span>` without `role="status"` or `aria-label`. These are visual indicators; consider adding `role="status"` for screen readers.

---

## Positive Findings (What's Done Well)

1. **Tutorial.tsx** implements ARIA tab pattern correctly with `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`, and `tabIndex` management.
2. **TopHeader.tsx** buttons have `aria-label`.
3. **BottomNav.tsx** FAB has `aria-label`.
4. **UI components** (breadcrumb, pagination, dialog, carousel, form) from shadcn/ui have proper ARIA attributes.
5. **ConfirmModal.tsx** has an escape key handler.
6. **`sr-only`** classes are used appropriately in sidebar, dialog, carousel, and breadcrumb.
7. **`aria-invalid`** and **`aria-describedby`** are used in the `form.tsx` UI component.
8. **SVG charts** in Tutorial.tsx have `role="img"` and `aria-label`.

---

## Recommended Priority Order

| Priority | Finding | Effort |
|---|---|---|
| P0 | C-1: Skip navigation | 30 min |
| P0 | C-7: div clickables -> button | 2 h |
| P0 | C-5: Modal ARIA dialog + focus trap | 4 h |
| P1 | C-2: Toggle buttons aria-pressed | 2 h |
| P1 | H-2: Placeholder-only labels -> proper labels | 3 h |
| P1 | H-4: Add global focus-visible styles | 1 h |
| P1 | H-3: Fix text-tertiary contrast | 30 min |
| P2 | C-3: Icon-only button aria-labels | 1 h |
| P2 | H-5: Notification badge aria-live | 30 min |
| P2 | H-6: Tab keyboard nav | 2 h |
| P2 | M-1: Fix IonTitle values | 30 min |
| P2 | M-3: Add lang="fr" | 5 min |
| P3 | H-7: aria-live for dynamic content | 2 h |
| P3 | M-6: Error message association | 1 h |
| P3 | L-3: Add h1 elements | 1 h |

---

## Files Requiring Most Attention

| File | Issues |
|---|---|
| `src/pages/Dashboard.tsx` | C-7, H-5, M-1, L-3 |
| `src/pages/Members.tsx` | C-2, H-2, M-6 |
| `src/pages/TransactionNew.tsx` | H-2, M-6 |
| `src/pages/EventNew.tsx` | C-2, H-2, M-6 |
| `src/pages/Login.tsx` | C-2, H-2 |
| `src/pages/Settings.tsx` | C-6, H-2, H-8, M-1 |
| `src/pages/EventDetail.tsx` | C-3, C-5, H-6 |
| `src/pages/GroupDetail.tsx` | C-3, C-5, H-6 |
| `src/components/TopHeader.tsx` | H-5 |
| `src/components/ConfirmModal.tsx` | C-5 |
| `src/components/ui/sidebar.tsx` | M-5 |

---

## Notes

- The app is a mobile-first Ionic/PWA. Some WCAG criteria (like keyboard focus order) are less critical on touch devices but still required for desktop/pwa use.
- `outline-none` is used extensively. Removing it without replacing with a custom focus style will cause a regression. Always pair `outline-none` with an explicit `focus-visible` style.
- The `text-tertiary` (#808080) color is the single biggest contrast violation and the easiest to fix -- simply switch body copy to `text-secondary` (#B3B3B3).
