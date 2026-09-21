import { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  Check,
  Trash2,
  Receipt,
  Calendar,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import SettingsShell from "@/components/SettingsShell";
import { useNotifications } from "@/lib/dataLayer";
import { useLocalStore } from "@/store/useLocalStore";

interface NotifPrefs {
  transactions: boolean;
  budgets: boolean;
  events: boolean;
  sync: boolean;
}

const PREF_KEY = "lumina-notif-prefs";
const DEFAULT_PREFS: NotifPrefs = {
  transactions: true,
  budgets: true,
  events: true,
  sync: false,
};

const PREF_ROWS: {
  key: keyof NotifPrefs;
  label: string;
  hint: string;
  icon: typeof Bell;
}[] = [
  {
    key: "transactions",
    label: "Transactions",
    hint: "Approbations, rejets et versements",
    icon: TrendingUp,
  },
  {
    key: "budgets",
    label: "Budgets",
    hint: "Alertes de dépassement et clôtures",
    icon: Receipt,
  },
  {
    key: "events",
    label: "Événements",
    hint: "Rappels d'événements à venir",
    icon: Calendar,
  },
  {
    key: "sync",
    label: "Synchronisation",
    hint: "Notifications de sync / hors-ligne",
    icon: RefreshCw,
  },
];

function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    /* repli sur les défauts */
  }
  return DEFAULT_PREFS;
}

export default function SettingsNotifications() {
  const { data: notifications } = useNotifications();
  const { markAllNotificationsRead } = useLocalStore();
  const [prefs, setPrefs] = useState<NotifPrefs>(loadPrefs);
  const [marked, setMarked] = useState(false);

  // Deux formes possibles selon la source : PowerSync expose `is_read` (0/1),
  // IndexedDB expose `isRead` (boolean). Le prédicat normalise les deux.
  const isUnread = (n: any): boolean =>
    n.is_read !== undefined ? n.is_read === 0 : n.isRead === false;
  const unread = (notifications ?? []).filter((n) => isUnread(n)).length;

  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const toggle = (k: keyof NotifPrefs) =>
    setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setMarked(true);
    setTimeout(() => setMarked(false), 2000);
  };

  return (
    <SettingsShell
      title="Notifications"
      subtitle="Préférences et gestion des notifications locales"
    >
      {/* Résumé */}
      <div
        className="rounded-xl p-4 mb-4 flex items-center justify-between"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
            }}
          >
            <Bell className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
          </div>
          <div>
            <p className="text-text-primary text-sm font-semibold">
              {unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est lu"}
            </p>
            <p className="text-text-tertiary text-xs">
              {notifications?.length ?? 0} au total
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unread === 0}
          className="px-3 py-2 rounded-full text-xs font-medium active:scale-95 disabled:opacity-40 transition-transform"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
            color: "var(--accent-primary)",
            border: "1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)",
          }}
          aria-label="Tout marquer comme lu"
        >
          {marked ? (
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Fait
            </span>
          ) : (
            "Tout marquer lu"
          )}
        </button>
      </div>

      {/* Préférences par catégorie */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-text-primary font-semibold text-sm mb-1">Préférences</p>
        <p className="text-text-tertiary text-xs mb-3">
          Réglages conservés localement sur cet appareil.
        </p>
        <div className="space-y-1">
          {PREF_ROWS.map((row) => {
            const Icon = row.icon;
            const on = prefs[row.key];
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => toggle(row.key)}
                role="switch"
                aria-checked={on}
                aria-label={`${row.label}`}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-transform active:scale-[0.99] text-left"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              >
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{
                    color: on ? "var(--accent-primary)" : "var(--text-tertiary)",
                  }}
                />
                <span className="flex-1 min-w-0">
                  <span
                    className="block text-sm"
                    style={{
                      color: on ? "var(--text-primary)" : "var(--text-tertiary)",
                    }}
                  >
                    {row.label}
                  </span>
                  <span className="block text-[11px] text-text-tertiary">
                    {row.hint}
                  </span>
                </span>
                <span
                  className="w-10 h-6 rounded-full relative flex-shrink-0"
                  style={{
                    backgroundColor: on
                      ? "var(--accent-primary)"
                      : "var(--surface-hover)",
                  }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
                    style={{ left: on ? "22px" : "2px" }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vider les notifications */}
      <button
        type="button"
        onClick={handleMarkAll}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-medium text-sm active:scale-95"
        style={{
          backgroundColor: "var(--surface)",
          color: "var(--data-expense)",
          border: "1px solid var(--border)",
        }}
        aria-label="Marquer toutes les notifications comme lues"
      >
        {unread > 0 ? (
          <>
            <BellOff className="w-4 h-4" /> Vider ({unread})
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4" /> Aucune notification à vider
          </>
        )}
      </button>
    </SettingsShell>
  );
}
