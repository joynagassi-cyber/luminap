/**
 * Unit tests for the five core UI components:
 * ThemePicker, SyncIndicator, StatusBadge, TopHeader, BottomNav.
 *
 * All external modules are mocked so the tests stay fast and deterministic.
 *
 * Note on vi.mock hoisting: vitest hoists vi.mock() calls above any `const`
 * declarations, so factories cannot reference out-of-scope variables. We
 * therefore define mutable state on `globalThis` (accessible at call time
 * from inside hoisted factories without any top-level declaration inside
 * the factory).
 */

// @vitest-environment jsdom

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import type React from "react";
import {
  useOrganizations,
  useCurrentUser,
  markAllNotificationsRead,
} from "@/lib/dataLayer";
import { useOrganizationContext, exitToCentral } from "@/lib/organization-context";
import * as themes from "@/ionic/themes";

// ─── Mutables read by mock factories at call time ──────────────────────────
// vitest hoists vi.mock() calls above any top-level const in the file, so a
// factory cannot reference `const` bindings from module scope. Reading
// *properties* off `globalThis` at call time is safe — no top-level
// declaration is involved, so the factory remains valid.

(globalThis as Record<string, unknown>).__storeState = {
  caisses: [] as unknown[],
  members: [] as unknown[],
  events: [] as unknown[],
  notifications: [
    { id: "n1", isRead: false, title: "Unread", createdAt: "2025-01-01" },
  ] as unknown[],
  oneSignalState: { lastOnline: Date.now(), isOnline: true },
  isOnline: true,
  user: { id: "user-1", role: "ADMIN" },
  appConfig: { churchName: "Test", churchLogoUrl: "", userPhoto: "" },
};

(globalThis as Record<string, unknown>).__markAllSpy = vi.fn(async () => {});

(globalThis as Record<string, unknown>).__locationRef = {
  pathname: "/dashboard",
  search: "",
};

(globalThis as Record<string, unknown>).__luminaThemes = [
  { id: "fire", name: "Orange Fire", primary: "#FF6B00", light: "#FF8533", dark: "#CC5500", inspiration: "communauté" },
  { id: "spirit", name: "Violet Spirit", primary: "#7C3AED", light: "#A78BFA", dark: "#4C1D95", inspiration: "mystique" },
  { id: "action", name: "Rouge Action", primary: "#DC2626", light: "#FCA5A5", dark: "#991B1B", inspiration: "ONG" },
  { id: "trust", name: "Bleu Confiance", primary: "#2563EB", light: "#93C5FD", dark: "#1E40AF", inspiration: "fintech" },
  { id: "emerald", name: "Vert Émeraude", primary: "#10B981", light: "#6EE7B7", dark: "#065F46", inspiration: "croissance" },
  { id: "care", name: "Teal Soin", primary: "#0D9488", light: "#5EEAD4", dark: "#064E3B", inspiration: "santé" },
  { id: "know", name: "Jaune Savoir", primary: "#D97706", light: "#FCD34D", dark: "#92400E", inspiration: "école" },
  { id: "feminine", name: "Rose Élan", primary: "#DB2777", light: "#F9A8D4", dark: "#9D174D", inspiration: "vitalité" },
  { id: "tech", name: "Indigo Tech", primary: "#4F46E5", light: "#A5B4FC", dark: "#1E1B4B", inspiration: "startup" },
  { id: "luxury", name: "Noir & Or Luxe", primary: "#B45309", light: "#FDE68A", dark: "#78350F", inspiration: "prestige" },
];

// ─── vi.mock blocks ─────────────────────────────────────────────────────────
// Each factory is self-contained. Anything mutable the tests need to flip
// between assertions lives on `globalThis` (see above).

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = (globalThis as Record<string, unknown>).__storeState as Record<string, unknown>;
    // Inject a spy for markAllNotificationsRead so tests can assert on it
    const result: Record<string, unknown> = selector ? { ...selector(state) } : { ...state };
    result.markAllNotificationsRead = (globalThis as Record<string, unknown>).__markAllSpy;
    return result;
  },
}));

vi.mock("@/lib/dataLayer", () => ({
  useCurrentUser: vi.fn(() => ({ id: "user-1", role: "ADMIN", email: "t@t" })),
  useOrganizations: vi.fn(() => ({ data: [{ id: "org-1", name: "Test" }] })),
  useMembers: vi.fn(() => ({ data: [] })),
  useEvents: vi.fn(() => ({ data: [] })),
  useCotisations: vi.fn(() => ({ data: [] })),
  useNotifications: vi.fn(() => ({ data: [] })),
  markAllNotificationsRead: vi.fn(async () => {}),
}));

vi.mock("@/lib/organization-context", () => ({
  useOrganizationContext: vi.fn(() => ({
    mode: "ORG",
    orgId: "org-1",
    label: "Test",
  })),
  exitToCentral: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => {
    // Return a single shared spy so that closures captured at mount keep
    // working across re-renders (a fresh spy per call would make the
    // onClick handler hold a stale reference after setState re-renders).
    if (!(globalThis as Record<string, unknown>).__sharedNavigate) {
      (globalThis as Record<string, unknown>).__sharedNavigate = vi.fn();
    }
    return (globalThis as Record<string, unknown>).__sharedNavigate;
  },
  useLocation: vi.fn(
    () => (globalThis as Record<string, unknown>).__locationRef
  ),
}));

vi.mock("@/ionic/themes", () => {
  // LUMINA_THEMES is read lazily from globalThis so the mock is not stale
  // when the factory is evaluated (vi.mock is hoisted above the assignment
  // of globalThis.__luminaThemes, and the real module is imported transitively
  // before the test body runs).
  return {
    get LUMINA_THEMES() {
      return (globalThis as Record<string, unknown>).__luminaThemes;
    },
    getThemeById: (id: string | null | undefined) => {
      const arr = (globalThis as Record<string, unknown>).__luminaThemes as {
        id: string;
      }[];
      return arr.find((t) => t.id === id) ?? arr[0];
    },
    applyTheme: vi.fn(),
    applyStoredTheme: vi.fn(),
    getStoredThemeId: vi.fn(() => "fire"),
    persistThemeId: vi.fn(),
    DEFAULT_THEME_ID: "fire",
    hexToRgb: (hex: string) => {
      const h = hex.replace("#", "");
      const n = parseInt(h, 16);
      return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    },
  };
});

// Ionic React renders its components as native custom elements in jsdom,
// swallowing children and breaking all assertions.  Mock each component so
// its children are rendered directly, making the component act like a
// transparent container (div by default, with special-casing for a few tags).
vi.mock("@ionic/react", () => {
  function makeWrapper(
    tag: string,
    props: Record<string, unknown>,
    children: unknown[],
  ) {
    if (tag === "ion-tab-button") {
      // ion-tab-button is treated as an interactive tab; pass through all
      // DOM-relevant props including role/aria-selected/aria-label and
      // render children so icons/labels appear.
      const {
        onClick,
        className,
        style,
        role,
        "aria-selected": ariaSelected,
        "aria-label": ariaLabel,
        ...rest
      } = props as Record<string, unknown>;
      return (
        <button
          type="button"
          onClick={onClick as (() => void) | undefined}
          className={className as string | undefined}
          style={style as React.CSSProperties | undefined}
          role={role as string | undefined}
          aria-selected={ariaSelected}
          aria-label={ariaLabel}
          {...rest}
        >
          {children}
        </button>
      );
    }
    if (tag === "ion-tab-bar") {
      // tab bar: render children as a plain div so grid layout works.
      return <div {...props}>{children}</div>;
    }
    if (tag === "ion-button") {
      // ion-button: render as button preserving onClick, aria-label, etc.
      const { onClick, className, style, ...rest } = props as Record<
        string,
        unknown
      >;
      return (
        <button
          type="button"
          onClick={onClick as (() => void) | undefined}
          className={className as string | undefined}
          style={style as React.CSSProperties | undefined}
          {...rest}
        >
          {children}
        </button>
      );
    }
    // ion-header, ion-toolbar, ion-content, etc.: render as a div.
    return <div {...props}>{children}</div>;
  }

  return {
    IonHeader: ({
      children,
      ...props
    }: { children?: React.ReactNode } & Record<string, unknown>) =>
      makeWrapper("ion-header", props, [children]),
    IonToolbar: ({
      children,
      ...props
    }: { children?: React.ReactNode } & Record<string, unknown>) =>
      makeWrapper("ion-toolbar", props, [children]),
    IonTabBar: ({
      children,
      ...props
    }: { children?: React.ReactNode } & Record<string, unknown>) =>
      makeWrapper("ion-tab-bar", props, [children]),
    IonTabButton: ({
      children,
      ...props
    }: { children?: React.ReactNode } & Record<string, unknown>) =>
      makeWrapper("ion-tab-button", props, [children]),
    IonButton: ({
      children,
      ...props
    }: { children?: React.ReactNode } & Record<string, unknown>) =>
      makeWrapper("ion-button", props, [children]),
  };
});

vi.mock("lucide-react", () => {
  const makeIcon =
    (name: string) =>
    function IconComponent({
      className,
      style,
      ...rest
    }: { className?: string; style?: React.CSSProperties } & Record<string, unknown>) {
      return (
        <svg
          data-icon={name}
          className={className}
          style={style}
          {...(rest as object)}
        />
      );
    };

  const names = [
    "Check",
    "Wifi",
    "WifiOff",
    "Bell",
    "Settings",
    "LayoutDashboard",
    "Home",
    "Wallet",
    "Users",
    "CalendarPlus",
    "MoreVertical",
    "BarChart3",
    "LineChart",
    "ClipboardList",
    "History",
    "Plus",
    "ArrowRightLeft",
    "FileText",
    "Archive",
    "HelpCircle",
    "ListChecks",
  ];

  const icons: Record<string, unknown> = {};
  for (const name of names) icons[name] = makeIcon(name);
  return icons;
});

// ─── Imports under test (after mocks so they are hoisted) ────────────────────

import ThemePicker from "@/components/ThemePicker";
import SyncIndicator from "@/components/SyncIndicator";
import StatusBadge from "@/components/StatusBadge";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";

// ─── Per-test overrides ──────────────────────────────────────────────────────

type StoreState = Record<string, unknown> & {
  notifications: unknown[];
  isOnline: boolean;
};

/**
 * The live `navigate` spy for the most-recently-rendered component.
 *
 * The `react-router-dom` mock returns a fresh `vi.fn()` on every call to
 * `useNavigate()`, and exposes the latest instance on `globalThis.__lastNavigate`.
 * Call this helper *after* `render(...)` to assert on the correct instance.
 */
function lastNavigate(): ReturnType<typeof vi.fn> {
  return (globalThis as Record<string, unknown>)
    .__sharedNavigate as ReturnType<typeof vi.fn>;
}

function store(): StoreState {
  return (globalThis as Record<string, unknown>).__storeState as StoreState;
}

function locationRef() {
  return (globalThis as Record<string, unknown>).__locationRef as {
    pathname: string;
    search: string;
  };
}

function setNotifications(notifs: unknown[]) {
  store().notifications = notifs;
}

function setOnline(isOnline: boolean) {
  store().isOnline = isOnline;
}

function setPath(pathname: string) {
  locationRef().pathname = pathname;
  locationRef().search = "";
}

/** Reset the mutable state and mock call logs between tests. */
function resetState() {
  setNotifications([
    { id: "n1", isRead: false, title: "Unread", createdAt: "2025-01-01" },
  ]);
  setOnline(true);
  setPath("/dashboard");

  vi.mocked(useCurrentUser).mockReset();
  vi.mocked(useCurrentUser).mockReturnValue({
    id: "user-1", role: "ADMIN", email: "t@t",
  });

  vi.mocked(useOrganizations).mockReset();
  vi.mocked(useOrganizations).mockReturnValue({
    data: [{ id: "org-1", name: "Test" }],
  });

  vi.mocked(markAllNotificationsRead).mockReset();
  vi.mocked(markAllNotificationsRead).mockResolvedValue(undefined);

  vi.mocked(useOrganizationContext).mockReset();
  vi.mocked(useOrganizationContext).mockReturnValue({
    mode: "ORG",
    orgId: "org-1",
    label: "Test",
  });

  vi.mocked(exitToCentral).mockReset();

  vi.mocked(themes.applyTheme).mockClear();

  // Reset the shared navigate spy between tests
  const nav = (globalThis as Record<string, unknown>).__sharedNavigate;
  if (nav && typeof (nav as unknown as { mockClear: () => void }).mockClear === "function") {
    (nav as unknown as { mockClear: () => void }).mockClear();
  }
}

beforeEach(() => {
  resetState();
});

afterEach(() => {
  cleanup();
});

// ─── ThemePicker ──────────────────────────────────────────────────────────────

describe("ThemePicker", () => {
  it("calls onChange(id) and applyTheme(theme) when a swatch is clicked", () => {
    const onChange = vi.fn();
    const { container } = render(<ThemePicker value={null} onChange={onChange} />);

    const swatches = container.querySelectorAll("button[aria-label]");
    expect(swatches.length).toBe(10);

    fireEvent.click(swatches[1]); // id "spirit"

    expect(onChange).toHaveBeenCalledWith("spirit");
    expect(vi.mocked(themes.applyTheme)).toHaveBeenCalledTimes(1);
    const appliedTheme = vi.mocked(themes.applyTheme).mock.calls[0][0] as {
      id: string;
    };
    expect(appliedTheme.id).toBe("spirit");
  });

  it("shows Check icon and aria-pressed=true on the selected swatch", () => {
    const { container } = render(
      <ThemePicker value="trust" onChange={() => {}} />
    );

    const swatches = container.querySelectorAll("button[aria-label]");
    expect(swatches[3]).toHaveAttribute("aria-pressed", "true");
    expect(swatches[0]).toHaveAttribute("aria-pressed", "false");

    const checkIcons = swatches[3].querySelectorAll('[data-icon="Check"]');
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it("shows the first word of the theme name as label in 5-column mode", () => {
    const { container } = render(
      <ThemePicker value={null} onChange={() => {}} columns={5} />
    );
    const labels = Array.from(container.querySelectorAll("span")).map(
      (s) => s.textContent
    );
    expect(labels).toContain("Orange");
    expect(labels).toContain("Violet");
    expect(labels).toContain("Rouge");
  });

  it("does not show labels in 10-column mode", () => {
    const { container } = render(
      <ThemePicker value={null} onChange={() => {}} columns={10} />
    );
    // No label spans in 10-column layout
    expect(container.querySelectorAll("span").length).toBe(0);
  });

  it("shows theme name + inspiration in the footer caption", () => {
    const { container } = render(
      <ThemePicker value="fire" onChange={() => {}} />
    );
    expect(container.textContent).toContain("Orange Fire");
    expect(container.textContent).toContain("communauté");
  });
});

// ─── SyncIndicator ────────────────────────────────────────────────────────────

describe("SyncIndicator", () => {
  it("shows 'Connecté' when isOnline=true", () => {
    setOnline(true);
    render(<SyncIndicator />);
    expect(screen.getByTestId("sync-indicator")).toBeInTheDocument();
    expect(screen.getByText("Connecté")).toBeInTheDocument();
  });

  it("shows 'Hors ligne' when isOnline=false", () => {
    setOnline(false);
    render(<SyncIndicator />);
    expect(screen.getByTestId("sync-indicator")).toBeInTheDocument();
    expect(screen.getByText("Hors ligne")).toBeInTheDocument();
  });

  it("disappears after 1500ms (vi.useFakeTimers + advanceTimersByTime)", () => {
    vi.useFakeTimers();
    try {
      setOnline(true);
      render(<SyncIndicator />);
      expect(screen.getByTestId("sync-indicator")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1499);
      });
      // Still visible at 1499ms
      expect(screen.getByTestId("sync-indicator")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      // Gone at 1500ms
      expect(screen.queryByTestId("sync-indicator")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

// ─── StatusBadge ─────────────────────────────────────────────────────────────

describe("StatusBadge", () => {
  it("renders APPROVED with color #1DB954 and label 'Approuvé'", () => {
    const { container } = render(<StatusBadge status="APPROVED" />);
    const badge = container.querySelector("span") as HTMLElement;
    expect(badge).toHaveTextContent("Approuvé");
    // Browser normalises the tint() colour-mix expression to rgba
    expect(badge.style.backgroundColor).not.toBe("");
    expect(badge.style.color).toBe("rgb(29, 185, 84)");
  });

  it("size md uses text-sm px-3 py-1 classes; sm uses text-xs px-2 py-0.5", () => {
    const { container: cMd } = render(
      <StatusBadge status="APPROVED" size="md" />
    );
    const badgeMd = cMd.querySelector("span") as HTMLElement;
    expect(badgeMd.className).toContain("text-sm");
    expect(badgeMd.className).toContain("px-3");
    expect(badgeMd.className).toContain("py-1");
    expect(badgeMd.className).not.toContain("px-2");

    const { container: cSm } = render(
      <StatusBadge status="APPROVED" size="sm" />
    );
    const badgeSm = cSm.querySelector("span") as HTMLElement;
    expect(badgeSm.className).toContain("text-xs");
    expect(badgeSm.className).toContain("px-2");
    expect(badgeSm.className).toContain("py-0.5");
    expect(badgeSm.className).not.toContain("text-sm");
  });

  it("renders PENDING with color #FFB800 and label 'En attente'", () => {
    const { container } = render(<StatusBadge status="PENDING" />);
    const badge = container.querySelector("span") as HTMLElement;
    expect(badge).toHaveTextContent("En attente");
    expect(badge.style.color).toBe("rgb(255, 184, 0)");
  });

  it("renders REJECTED with color #E51332 and label 'Rejeté'", () => {
    const { container } = render(<StatusBadge status="REJECTED" />);
    const badge = container.querySelector("span") as HTMLElement;
    expect(badge).toHaveTextContent("Rejeté");
    expect(badge.style.color).toBe("rgb(229, 19, 50)");
  });

  it("renders DRAFT with color #808080 and label 'Brouillon'", () => {
    const { container } = render(<StatusBadge status="DRAFT" />);
    const badge = container.querySelector("span") as HTMLElement;
    expect(badge).toHaveTextContent("Brouillon");
    expect(badge.style.color).toBe("rgb(128, 128, 128)");
  });
});

// ─── TopHeader ───────────────────────────────────────────────────────────────

describe("TopHeader", () => {
  it("shows unread notification count badge (filter !isRead)", () => {
    setNotifications([
      { id: "1", isRead: false },
      { id: "2", isRead: false },
      { id: "3", isRead: true },
    ]);
    render(<TopHeader />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows '9+' when unread count exceeds 9", () => {
    setNotifications(
      Array.from({ length: 12 }, (_, i) => ({ id: String(i), isRead: false }))
    );
    render(<TopHeader />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("does not show the badge when all notifications are read", () => {
    setNotifications([
      { id: "1", isRead: true },
      { id: "2", isRead: true },
    ]);
    render(<TopHeader />);
    // No unread count text anywhere in the header
    expect(screen.queryByText("2")).toBeNull();
  });

  it("shows contextual banner in org context (ctx.mode === 'ORG')", () => {
    vi.mocked(useOrganizationContext).mockReturnValue({
      mode: "ORG",
      orgId: "org-1",
      label: "Test",
    });
    vi.mocked(useOrganizations).mockReturnValue({
      data: [{ id: "org-1", name: "My Org" }],
    });
    setNotifications([]);
    render(<TopHeader />);
    expect(screen.getByText(/Organisation/)).toBeInTheDocument();
    expect(screen.getByText(/My Org/)).toBeInTheDocument();
  });

  it("shows 'Administration centrale' banner when isCentralAdmin", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      id: "user-1", role: "CENTRAL_ADMIN", email: "t@t",
    });
    vi.mocked(useOrganizationContext).mockReturnValue({
      mode: "CENTRAL",
      orgId: "org-central",
      label: "Administration centrale",
    });
    setNotifications([]);
    render(<TopHeader />);
    expect(screen.getByText("Administration centrale")).toBeInTheDocument();
  });

  it("hides the banner for a plain ADMIN user in CENTRAL mode", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      id: "user-1", role: "ADMIN", email: "t@t",
    });
    vi.mocked(useOrganizationContext).mockReturnValue({
      mode: "CENTRAL",
      orgId: "org-central",
      label: "Administration centrale",
    });
    setNotifications([]);
    render(<TopHeader />);
    expect(screen.queryByText("Administration centrale")).toBeNull();
    expect(screen.queryByText(/Organisation/)).toBeNull();
  });

  it("clicks notifications → markAllNotificationsRead + navigate('/notifications')", async () => {
    const markAllSpy = (globalThis as Record<string, unknown>).__markAllSpy as ReturnType<typeof vi.fn>;
    markAllSpy.mockClear();
    setNotifications([{ id: "1", isRead: false }]);
    render(<TopHeader />);
    const navigate = lastNavigate();

    fireEvent.click(screen.getByLabelText("Notifications"));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/notifications");
    });
    expect(markAllSpy).toHaveBeenCalled();
  });

  it("navigates to /settings when settings button clicked", () => {
    setNotifications([]);
    render(<TopHeader />);
    const navigate = lastNavigate();
    fireEvent.click(screen.getByLabelText("Paramètres"));
    expect(navigate).toHaveBeenCalledWith("/settings");
  });

  it("calls exitToCentral + navigate('/admin') on 'Retour au central' click", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      id: "user-1", role: "CENTRAL_ADMIN", email: "t@t",
    });
    vi.mocked(useOrganizationContext).mockReturnValue({
      mode: "ORG",
      orgId: "org-1",
      label: "Test",
    });
    setNotifications([]);
    render(<TopHeader />);
    const navigate = lastNavigate();

    fireEvent.click(
      screen.getByLabelText("Retour à l'administration centrale")
    );

    expect(vi.mocked(exitToCentral)).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/admin");
  });

  it("shows 'Ouvrir le dashboard' when CENTRAL_ADMIN in CENTRAL mode", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      id: "user-1", role: "CENTRAL_ADMIN", email: "t@t",
    });
    vi.mocked(useOrganizationContext).mockReturnValue({
      mode: "CENTRAL",
      orgId: "org-central",
      label: "Administration centrale",
    });
    setNotifications([]);
    render(<TopHeader />);

    expect(
      screen.getByLabelText("Retour à l'administration centrale")
    ).toHaveTextContent("Ouvrir le dashboard");
  });

  it("renders custom title or the default 'Lumina'", () => {
    vi.mocked(useOrganizationContext).mockReturnValue({
      mode: "CENTRAL",
      orgId: "org-central",
      label: "Administration centrale",
    });
    vi.mocked(useCurrentUser).mockReturnValue({
      id: "user-1", role: "ADMIN", email: "t@t",
    });
    setNotifications([]);

    const { unmount } = render(<TopHeader title="Custom Title" />);
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    unmount();

    render(<TopHeader />);
    // "Lumina" appears both as main title and as subtitle — use queryAllByText
    expect(screen.getAllByText("Lumina").length).toBeGreaterThanOrEqual(1);
  });
});

// ─── BottomNav ────────────────────────────────────────────────────────────────

describe("BottomNav", () => {

  it("marks the active tab based on pathname (aria-selected)", () => {
    setPath("/finance");
    const { container } = render(<BottomNav />);
    const tabs = container.querySelectorAll('[role="tab"]');

    const financeTab = Array.from(tabs).find(
      (t) => t.getAttribute("aria-label") === "Finances"
    );
    const homeTab = Array.from(tabs).find(
      (t) => t.getAttribute("aria-label") === "Accueil"
    );

    expect(financeTab?.getAttribute("aria-selected")).toBe("true");
    expect(homeTab?.getAttribute("aria-selected")).toBe("false");
  });

  it("home tab is active on '/' (exact match)", () => {
    setPath("/");
    const { container } = render(<BottomNav />);
    const homeTab = container.querySelector(
      '[aria-label="Accueil"]'
    ) as HTMLElement;
    expect(homeTab.getAttribute("aria-selected")).toBe("true");
  });

  it("FAB shows Check 'Valider' on /transaction/:id", () => {
    setPath("/transaction/tx-1");
    const { container } = render(<BottomNav />);
    const fab = container.querySelector('[aria-label="Valider"]');
    expect(fab).toBeInTheDocument();
    expect(fab?.querySelector('[data-icon="Check"]')).toBeInTheDocument();
  });

  it("FAB shows Plus 'Nouveau' on /event routes", () => {
    setPath("/event");
    const { container } = render(<BottomNav />);
    const fab = container.querySelector('[aria-label="Nouveau"]');
    expect(fab).toBeInTheDocument();
  });

  it("FAB shows ArrowRightLeft 'Verser' on /groups/:id", () => {
    setPath("/groups/group-1");
    const { container } = render(<BottomNav />);
    const fab = container.querySelector('[aria-label="Verser"]');
    expect(fab).toBeInTheDocument();
    expect(
      fab?.querySelector('[data-icon="ArrowRightLeft"]')
    ).toBeInTheDocument();
  });

  it("FAB shows Plus 'Transaction' on the dashboard (default)", () => {
    setPath("/dashboard");
    const { container } = render(<BottomNav />);
    const fab = container.querySelector('[aria-label="Transaction"]');
    expect(fab).toBeInTheDocument();
  });

  it("opens the More menu on 'Plus d'options' click", () => {
    setPath("/dashboard");
    render(<BottomNav />);

    const moreButton = screen.getByLabelText("Plus d'options");
    expect(moreButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(moreButton);

    expect(screen.getByLabelText("Versement")).toBeInTheDocument();
    expect(screen.getByLabelText("Rapports")).toBeInTheDocument();
    expect(screen.getByLabelText("Aide")).toBeInTheDocument();
    // Now the toggle reads 'Fermer le menu'
    expect(screen.getByLabelText("Fermer le menu")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("closes the More menu on outside mousedown (useEffect listener)", () => {
    setPath("/dashboard");
    render(<BottomNav />);

    fireEvent.click(screen.getByLabelText("Plus d'options"));
    expect(screen.getByLabelText("Versement")).toBeInTheDocument();

    // Outside click: mousedown on document.body
    fireEvent.mouseDown(document.body);

    expect(screen.queryByLabelText("Versement")).toBeNull();
  });

  it("toggles the More menu closed by clicking the button again", () => {
    setPath("/dashboard");
    render(<BottomNav />);

    const moreButton = screen.getByLabelText("Plus d'options");
    fireEvent.click(moreButton);
    expect(screen.getByLabelText("Versement")).toBeInTheDocument();

    const closeBtn = screen.getByLabelText("Fermer le menu");
    fireEvent.click(closeBtn);
    expect(screen.queryByLabelText("Versement")).toBeNull();
  });

  it("navigates when a More action item is clicked and closes the menu", async () => {
    setPath("/dashboard");
    render(<BottomNav />);
    const navigate = lastNavigate();

    fireEvent.click(screen.getByLabelText("Plus d'options"));
    // Wait for the More menu to render, then click "Aide"
    const aideBtn = await screen.findByLabelText("Aide");
    fireEvent.click(aideBtn);

    expect(navigate).toHaveBeenCalledWith("/help");
    // Menu closes on navigation
    expect(screen.queryByLabelText("Versement")).toBeNull();
  });

  it("clicking the default FAB navigates to /transaction/new", () => {
    setPath("/dashboard");
    const { container } = render(<BottomNav />);
    const navigate = lastNavigate();
    const fab = container.querySelector('[aria-label="Transaction"]') as HTMLElement;
    fireEvent.click(fab);
    expect(navigate).toHaveBeenCalledWith("/transaction/new");
  });

  it("clicking the /event FAB navigates to /event/new", () => {
    setPath("/event");
    const { container } = render(<BottomNav />);
    const navigate = lastNavigate();
    const fab = container.querySelector('[aria-label="Nouveau"]') as HTMLElement;
    fireEvent.click(fab);
    expect(navigate).toHaveBeenCalledWith("/event/new");
  });

  it("clicking the /groups FAB navigates to /versement", () => {
    setPath("/groups/group-1");
    const { container } = render(<BottomNav />);
    const navigate = lastNavigate();
    const fab = container.querySelector('[aria-label="Verser"]') as HTMLElement;
    fireEvent.click(fab);
    expect(navigate).toHaveBeenCalledWith("/versement");
  });
});
