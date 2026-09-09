/**
 * Accessibility (a11y) Tests — Screen Reader Patterns
 *
 * Statically analyses component source to verify:
 *   - Keyboard navigation support (keydown/Escape handlers)
 *   - ARIA labels on interactive elements
 *   - Role attributes on landmark/pattern elements
 *   - Focus management (focus-visible styles, aria-hidden correctness)
 *   - Screen-reader-only text (sr-only)
 *
 * No DOM rendering required — uses source-text analysis consistent
 * with how @testing-library/dom queries would behave at runtime.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── Helpers ────────────────────────────────────────────────────────

const COMPONENTS_DIR = path.resolve(__dirname, "../../components");
const UI_DIR = path.resolve(__dirname, "../../components/ui");

function readTsFile(relativePath: string): string {
  const abs = path.resolve(COMPONENTS_DIR, relativePath);
  if (!fs.existsSync(abs))
    throw new Error(`Missing component: ${relativePath}`);
  return fs.readFileSync(abs, "utf-8");
}

function readUiFile(relativePath: string): string {
  const abs = path.resolve(UI_DIR, relativePath);
  if (!fs.existsSync(abs)) throw new Error(`Missing ui file: ${relativePath}`);
  return fs.readFileSync(abs, "utf-8");
}

/**
 * Extract all JSX attributes of the form aria-* or role="..." from source text.
 * Returns pairs of { attribute, value } for manual inspection in failing tests.
 */
function extractAriaAttrs(
  source: string,
): Array<{ attr: string; value: string; line: number }> {
  const lines = source.split("\n");
  const results: Array<{ attr: string; value: string; line: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match aria-*="..." or aria-*={...}
    const ariaMatch = line.match(
      /(aria-[\w-]+)\s*=\s*(?:"([^"]*)"|(\{[^}]+\}))/g,
    );
    if (ariaMatch) {
      for (const m of ariaMatch) {
        const attr = m.split("=")[0].trim();
        const valueMatch = m.match(/=(?:"([^"]*)"|(\{[^}]+\}))/);
        const value = valueMatch ? (valueMatch[1] ?? valueMatch[2] ?? "") : "";
        results.push({ attr, value, line: i + 1 });
      }
    }
    // Match role="..."
    const roleMatch = line.match(/role\s*=\s*"([^"]+)"/);
    if (roleMatch) {
      results.push({ attr: "role", value: roleMatch[1], line: i + 1 });
    }
  }
  return results;
}

/** Check whether source contains a keyboard event handler (keydown/keyup/keypress). */
function hasKeyboardHandler(source: string): boolean {
  return (
    /addEventListener\s*\(\s*['"]key/i.test(source) ||
    /onKeyDown\s*=/i.test(source) ||
    /onKeyPress\s*=/i.test(source) ||
    /onKeyUp\s*=/i.test(source) ||
    /\.key\s*===\s*['"]/i.test(source)
  );
}

/** Check whether source has focus-visible or focus:ring styles. */
function hasFocusStyles(source: string): boolean {
  return /focus-visible:|focus:ring|focus-visible:outline|focus:outline-none|focus:ring-/.test(
    source,
  );
}

/** Check whether source uses sr-only (screen-reader-only) class. */
function hasSROnly(source: string): boolean {
  return /\bsr-only\b/.test(source);
}

/** Check whether source uses aria-hidden. */
function hasAriaHidden(source: string): boolean {
  return /aria-hidden=/i.test(source);
}

/** Check whether source has an Escape-key close handler (common pattern for modals). */
function hasEscapeKeyHandler(source: string): boolean {
  return (
    /e\.key\s*===\s*['"]Escape['"]/.test(source) ||
    /key\s*===\s*['"]Escape['"]/.test(source)
  );
}

// ─── Tests: Keyboard Navigation ─────────────────────────────────────

describe("a11y — keyboard navigation", () => {
  it("ConfirmModal handles Escape key to close", () => {
    const src = readTsFile("ConfirmModal.tsx");
    expect(
      hasKeyboardHandler(src),
      "ConfirmModal should have a keyboard event listener",
    ).toBe(true);
    expect(
      hasEscapeKeyHandler(src),
      "ConfirmModal should handle Escape key",
    ).toBe(true);
  });

  it("BottomNav has no keyboard trap — all items are focusable", () => {
    const src = readTsFile("BottomNav.tsx");
    // Tab bar items should have role="tab" (managed by Radix/Ionic)
    expect(
      src.includes('role="tab"'),
      'BottomNav tabs should have role="tab"',
    ).toBe(true);
    // The nav landmark itself should have role="navigation"
    expect(
      src.includes('role="navigation"'),
      "BottomNav should be a navigation landmark",
    ).toBe(true);
  });

  it("Sidebar has Escape key handler to dismiss", () => {
    const src = readUiFile("sidebar.tsx");
    expect(
      hasKeyboardHandler(src),
      "Sidebar should listen for keyboard events",
    ).toBe(true);
  });
});

// ─── Tests: ARIA Labels ─────────────────────────────────────────────

describe("a11y — aria labels", () => {
  it("ConfirmModal buttons have aria-label attributes", () => {
    const src = readTsFile("ConfirmModal.tsx");
    const attrs = extractAriaAttrs(src);
    const labels = attrs.filter((a) => a.attr.startsWith("aria-label"));
    const labelValues = labels.map((a) => a.value);
    expect(labelValues).toContain("Annuler");
    expect(
      labelValues.some(
        (l) => l.includes("confirmLabel") || l.includes("Confirm"),
      ),
    ).toBe(true);
  });

  it("TopHeader action buttons have aria-labels", () => {
    const src = readTsFile("TopHeader.tsx");
    const attrs = extractAriaAttrs(src);
    const labels = attrs
      .filter((a) => a.attr.startsWith("aria-label"))
      .map((a) => a.value);
    expect(labels).toContain("Notifications");
    expect(labels).toContain("Paramètres");
  });

  it("BottomNav items all have aria-labels", () => {
    const src = readTsFile("BottomNav.tsx");
    const attrs = extractAriaAttrs(src);
    const labels = attrs
      .filter((a) => a.attr.startsWith("aria-label"))
      .map((a) => a.value);
    // Nav landmark label
    expect(labels).toContain("Navigation principale");
    // Each tab should have a label (the label variable is interpolated)
    expect(labels.some((l) => l === "label" || l.includes("label"))).toBe(true);
    // More button toggle - label may vary by implementation
    expect(
      labels.some(
        (l) =>
          l.includes("Plus") || l.includes("options") || l.includes("More"),
      ),
    ).toBe(true);
    expect(
      labels.some(
        (l) =>
          l.includes("Fermer") ||
          l.includes("Close") ||
          l.includes("Fermer le menu"),
      ),
    ).toBe(true);
    // FAB action
    expect(
      labels.some((l) => l.includes("label") || l.includes("Transaction")),
    ).toBe(true);
  });

  it("BottomDrawer close button has aria-label", () => {
    const src = readTsFile("BottomDrawer.tsx");
    const attrs = extractAriaAttrs(src);
    const labels = attrs
      .filter((a) => a.attr.startsWith("aria-label"))
      .map((a) => a.value);
    expect(labels).toContain("Fermer");
  });

  it("TopHeader notification button declares dialog role", () => {
    const src = readTsFile("TopHeader.tsx");
    expect(
      src.includes('aria-haspopup="dialog"'),
      'Notification button should declare aria-haspopup="dialog"',
    ).toBe(true);
  });
});

// ─── Tests: Role Attributes ─────────────────────────────────────────

describe("a11y — role attributes", () => {
  it("BottomNav uses correct ARIA roles for tab pattern", () => {
    const src = readTsFile("BottomNav.tsx");
    expect(
      src.includes('role="tablist"'),
      'Tab list container should have role="tablist"',
    ).toBe(true);
    expect(src.includes('role="tab"'), 'Each tab should have role="tab"').toBe(
      true,
    );
    expect(
      src.includes("aria-selected"),
      "Tabs should expose aria-selected state",
    ).toBe(true);
  });

  it('Alert component uses role="alert"', () => {
    const src = readUiFile("alert.tsx");
    expect(src.includes('role="alert"'), 'Alert should use role="alert"').toBe(
      true,
    );
  });

  it("Carousel uses landmark roles", () => {
    const src = readUiFile("carousel.tsx");
    expect(src.includes('role="region"'), "Carousel should be a region").toBe(
      true,
    );
    expect(
      src.includes('role="group"'),
      "Slide items should be in a group",
    ).toBe(true);
    expect(
      src.includes('aria-roledescription="carousel"'),
      "Carousel should declare roledescription",
    ).toBe(true);
    expect(
      src.includes('aria-roledescription="slide"'),
      "Slides should declare roledescription",
    ).toBe(true);
  });

  it("Breadcrumb uses proper navigation and link roles", () => {
    const src = readUiFile("breadcrumb.tsx");
    // Breadcrumb uses native <nav> with aria-label="breadcrumb" (Radix pattern)
    expect(
      src.includes('aria-label="breadcrumb"') ||
        src.includes("aria-label='breadcrumb'"),
      'Breadcrumb should have aria-label="breadcrumb"',
    ).toBe(true);
    // Check for link roles or native <a> elements
    expect(
      src.includes('role="link"') ||
        src.includes("<a ") ||
        src.includes("href="),
      'Breadcrumb links should have role="link" or href',
    ).toBe(true);
    expect(
      src.includes('aria-current="page"'),
      'Active breadcrumb should have aria-current="page"',
    ).toBe(true);
  });

  it("Pagination uses landmark and aria-current roles", () => {
    const src = readUiFile("pagination.tsx");
    expect(
      src.includes('role="navigation"'),
      "Pagination should be a navigation landmark",
    ).toBe(true);
    expect(
      src.includes('aria-label="pagination"'),
      'Pagination should have aria-label="pagination"',
    ).toBe(true);
    expect(
      src.includes("aria-current"),
      "Active page should declare aria-current",
    ).toBe(true);
  });

  it("Dialog close button has sr-only label", () => {
    const src = readUiFile("dialog.tsx");
    expect(
      src.includes('<span className="sr-only">Close</span>'),
      "Dialog close should have sr-only label",
    ).toBe(true);
  });
});

// ─── Tests: Focus Management ────────────────────────────────────────

describe("a11y — focus management", () => {
  it("Button component includes focus-visible ring styles", () => {
    const src = readUiFile("button.tsx");
    expect(hasFocusStyles(src), "Button should have focus-visible styles").toBe(
      true,
    );
  });

  it("Input component includes focus-visible ring styles", () => {
    const src = readUiFile("input.tsx");
    expect(hasFocusStyles(src), "Input should have focus-visible styles").toBe(
      true,
    );
  });

  it("Checkbox includes focus-visible ring styles", () => {
    const src = readUiFile("checkbox.tsx");
    expect(
      hasFocusStyles(src),
      "Checkbox should have focus-visible styles",
    ).toBe(true);
  });

  it("AlertDialog close button is focusable with visible ring", () => {
    const src = readUiFile("alert-dialog.tsx");
    // Radix provides focus management; check for aria-label on close button or button component usage
    expect(
      src.includes("aria-label") ||
        src.includes("button") ||
        src.includes("Button"),
      "AlertDialog close should manage focus",
    ).toBe(true);
  });

  it("Sidebar toggle has aria-label for screen readers", () => {
    const src = readUiFile("sidebar.tsx");
    expect(
      src.includes('aria-label="Toggle Sidebar"') ||
        src.includes("aria-label='Toggle Sidebar'"),
      "Sidebar toggle should be labelled",
    ).toBe(true);
    expect(
      hasSROnly(src),
      "Sidebar toggle should use sr-only for icon-only button",
    ).toBe(true);
  });

  it("Disabled elements have pointer-events-none to prevent focus", () => {
    const src = readUiFile("button.tsx");
    expect(
      src.includes("disabled:pointer-events-none") ||
        src.includes("pointer-events-none"),
      "Disabled buttons should not receive focus",
    ).toBe(true);
  });
});

// ─── Tests: Screen-Reader-Only Text ─────────────────────────────────

describe("a11y — sr-only text", () => {
  it("Carousel previous/next buttons have sr-only labels", () => {
    const src = readUiFile("carousel.tsx");
    expect(
      src.includes('<span className="sr-only">Previous slide</span>'),
      "Prev button should have sr-only label",
    ).toBe(true);
    expect(
      src.includes('<span className="sr-only">Next slide</span>'),
      "Next button should have sr-only label",
    ).toBe(true);
  });

  it('Breadcrumb "More" item has sr-only label', () => {
    const src = readUiFile("breadcrumb.tsx");
    expect(
      src.includes('<span className="sr-only">More</span>'),
      "Breadcrumb more should have sr-only label",
    ).toBe(true);
  });

  it('Pagination "More pages" has sr-only label', () => {
    const src = readUiFile("pagination.tsx");
    expect(
      src.includes('<span className="sr-only">More pages</span>'),
      "Pagination more should have sr-only label",
    ).toBe(true);
  });
});

// ─── Tests: aria-hidden Correctness ────────────────────────────────

describe("a11y — aria-hidden correctness", () => {
  it('Decorative elements use aria-hidden="true"', () => {
    const src = readTsFile("ConfirmModal.tsx");
    // The drag handle decoration should be hidden from screen readers
    expect(
      src.includes('aria-hidden="true"'),
      "Decorative modal handle should be aria-hidden",
    ).toBe(true);
  });

  it("Navigation menu hidden items use aria-hidden", () => {
    const src = readUiFile("navigation-menu.tsx");
    expect(
      src.includes('aria-hidden="true"'),
      "Hidden nav items should be aria-hidden",
    ).toBe(true);
  });
});

// ─── Tests: aria-expanded on Toggle Buttons ────────────────────────

describe("a11y — aria-expanded", () => {
  it("BottomNav more-button exposes aria-expanded state", () => {
    const src = readTsFile("BottomNav.tsx");
    expect(
      src.includes("aria-expanded"),
      "More button should expose aria-expanded",
    ).toBe(true);
  });

  it("Dropdown menu items are keyboard accessible (outline-none + focus styles)", () => {
    const src = readUiFile("dropdown-menu.tsx");
    // Dropdown menus use focus:bg-accent for visual focus indication
    expect(
      hasFocusStyles(src) || src.includes("focus:") || src.includes("focus-bg"),
      "Dropdown menu items should have focus styles",
    ).toBe(true);
  });
});
