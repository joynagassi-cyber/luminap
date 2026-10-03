import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/dataLayer";
import { NotificationsSkeleton } from "@/components/PageSkeletons";
import {
  Bell,
  Check,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IonPage,
  IonContent,
  IonInfiniteScroll,
} from "@ionic/react";

function getNotifIcon(actionType: string) {
  switch (actionType) {
    case "TRANSACTION_PENDING":
      return <Bell className="w-4 h-4" style={{ color: "var(--data-pending)" }} />;
    case "TRANSACTION_APPROVED":
      return <CheckCircle className="w-4 h-4" style={{ color: "var(--data-income)" }} />;
    case "BUDGET_EXCEEDED":
      return <AlertCircle className="w-4 h-4" style={{ color: "var(--data-expense)" }} />;
    default:
      return <Bell className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />;
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    data: notifications,
    isLoading: notificationsLoading,
    error: notificationsError,
    retry: retryNotifications,
  } = useNotifications();

  const [visibleCount, setVisibleCount] = useState(50);

  const sorted = useMemo(
    () =>
      [...(notifications ?? [])].sort(
        (a: any, b: any) =>
          new Date(b.created_at || b.createdAt).getTime() -
          new Date(a.created_at || a.createdAt).getTime(),
      ),
    [notifications],
  );

  const loadNext = () => {
    if (visibleCount < sorted.length) {
      setVisibleCount((c) => c + 50);
    }
  };

  const unread = sorted.filter(
    (n: any) => (!n.is_read && n.is_read !== undefined) || !n.isRead,
  ).length;

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id, {} as any);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead({} as any);
  };

  if (notificationsLoading) {
    return (
      <IonPage>
        <IonContent fullscreen>
          <div className="min-h-dvh">
            <NotificationsSkeleton />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="min-h-dvh">
          <TopHeader title="Notifications" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-text-primary font-bold text-xl">
                Notifications
              </h1>
              {unread > 0 && (
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)", color: "var(--data-expense)" }}
                  >
                    {unread} non lu{unread > 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    Tout marquer lu
                  </button>
                </div>
              )}
            </div>

            {sorted.length === 0 ? (
              <div
                className="text-center py-16 rounded-xl"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <Bell className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-50" />
                <p className="text-text-primary font-medium text-sm mb-2">
                  Pas encore de notification
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                  Les notifications apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sorted.slice(0, visibleCount).map((notif: any) => (
                  <button
                    key={notif.id}
                    onClick={async () => {
                      const isRead =
                        notif.is_read !== undefined
                          ? notif.is_read
                          : notif.isRead;
                      if (!isRead) {
                        await handleMarkRead(notif.id);
                      }
                      if (notif.source_transaction_id)
                        navigate(`/transaction/${notif.source_transaction_id}`);
                    }}
                    className="w-full text-left rounded-xl p-4 flex items-start gap-3 transition-all active:scale-95"
                    style={{
                      backgroundColor: (
                        notif.is_read !== undefined
                          ? notif.is_read
                          : notif.isRead
                      )
                        ? "var(--surface)"
                        : "var(--surface-hover)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getNotifIcon(notif.action_type || notif.actionType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium ${(notif.is_read !== undefined ? notif.is_read : notif.isRead) ? "text-text-secondary" : "text-text-primary"}`}
                        >
                          {notif.title}
                        </p>
                        {!notif.is_read && notif.is_read !== undefined && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ backgroundColor: "var(--accent-primary)" }}
                          />
                        )}
                        {!notif.isRead && notif.isRead !== undefined && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ backgroundColor: "var(--accent-primary)" }}
                          />
                        )}
                      </div>
                      <p className="text-text-tertiary text-xs mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-text-tertiary text-xs mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(
                          new Date(notif.created_at || notif.createdAt),
                          { addSuffix: true, locale: fr },
                        )}
                      </p>
                    </div>
                  </button>
                ))}
                {sorted.length > visibleCount && !notificationsError && (
                  <IonInfiniteScroll
                    position="bottom"
                    threshold="150px"
                    onIonInfinite={loadNext}
                  >
                    <div className="py-3">
                      <p className="text-text-tertiary text-xs">
                        Chargement…
                      </p>
                    </div>
                  </IonInfiniteScroll>
                )}
                {sorted.length > 0 && sorted.length <= visibleCount && !notificationsError && (
                  <p className="text-text-tertiary text-xs text-center py-3">
                    Fin de la liste — {sorted.length} notification
                    {sorted.length !== 1 ? "s" : ""} affichée
                    {sorted.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}

            {notificationsError && (
              <div
                className="text-center py-6 rounded-xl"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <p className="text-text-tertiary text-sm">
                  Impossible de charger les notifications.
                </p>
                <button
                  onClick={retryNotifications}
                  aria-label="Réessayer le chargement des notifications"
                  className="mt-2 px-4 py-2 rounded-full text-sm font-semibold text-on-accent transition-all active:scale-95"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                >
                  Réessayer
                </button>
              </div>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
