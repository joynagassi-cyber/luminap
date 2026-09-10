import { Bell, Settings, LayoutDashboard } from "lucide-react";
import { IonButton, IonHeader, IonToolbar } from "@ionic/react";
import { useLocalStore } from "@/store/useLocalStore";
import { useNavigate } from "react-router-dom";
import { useCurrentUser, useOrganizations } from "@/lib/dataLayer";
import {
  useOrganizationContext,
  exitToCentral,
} from "@/lib/organization-context";

export default function TopHeader({ title }: { title?: string }) {
  const { notifications, markAllNotificationsRead } = useLocalStore();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const ctx = useOrganizationContext();
  const { data: orgData } = useOrganizations("mine");

  const isCentralAdmin = user?.role === "CENTRAL_ADMIN";
  const inOrgContext = ctx.mode === "ORG";
  const orgName =
    orgData?.find((o) => o.id === ctx.orgId)?.name ?? ctx.orgId;

  const handleReturnToCentral = () => {
    exitToCentral();
    navigate("/admin");
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationsClick = async () => {
    await markAllNotificationsRead();
    navigate("/notifications");
  };

  return (
    <IonHeader>
      <IonToolbar
        style={{
          backgroundColor: "rgba(18,18,18,0.97)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #282828",
        }}
      >
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/lumina-logo.png"
              alt="Lumina"
              className="w-8 h-8 rounded-lg"
            />
            <div>
              <p className="text-text-primary font-bold text-sm leading-none">
                {title || "Lumina"}
              </p>
              <p className="text-text-tertiary text-xs mt-0.5">
                {title ? "Gestion financière" : "Lumina"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IonButton
              onClick={handleNotificationsClick}
              className="!min-height:auto !p-0 !rounded-full !min-w-[36px] !w-9 !h-9"
              style={{ backgroundColor: "#212121" }}
              aria-label="Notifications"
              aria-haspopup="dialog"
            >
              <Bell className="w-4 h-4 text-text-secondary" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: "#E51332", color: "#fff" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </IonButton>
            <IonButton
              onClick={() => navigate("/settings")}
              className="!min-height:auto !p-0 !rounded-full !min-w-[36px] !w-9 !h-9"
              style={{ backgroundColor: "#212121" }}
              aria-label="Paramètres"
            >
              <Settings className="w-4 h-4 text-text-secondary" />
            </IonButton>
          </div>
        </div>
      </IonToolbar>

      {/* Contexte organisationnel (T8) : bandeau « Organisation : X » + retour central.
          Visible pour un admin central (grant actif) ou un utilisateur en
          contexte organisationnelle. La navigation n'est qu'UI : le serveur
          RLS arbitre l'accès réel aux données. */}
      {(inOrgContext || isCentralAdmin) && (
        <div
          style={{
            backgroundColor: isCentralAdmin ? "#1a130f" : "#1a1f2b",
            borderTop: "1px solid #282828",
          }}
        >
          <div className="px-4 py-1.5 flex items-center justify-between gap-2">
            <span
              className="text-xs truncate"
              style={{ color: isCentralAdmin ? "#FF6B00" : "#7aa2ff" }}
            >
              {inOrgContext
                ? `Organisation : ${orgName}`
                : "Administration centrale"}
            </span>
            {isCentralAdmin && (
              <IonButton
                onClick={handleReturnToCentral}
                className="!min-height:auto !p-1 !rounded-full !min-w-[24px] !h-6 !text-xs"
                style={{ backgroundColor: "#2a2a2a", color: "#B3B3B3" }}
                aria-label="Retour à l'administration centrale"
              >
                <LayoutDashboard className="w-3 h-3 mr-1" />
                {inOrgContext ? "Retour au central" : "Ouvrir le dashboard"}
              </IonButton>
            )}
          </div>
        </div>
      )}
    </IonHeader>
  );
}
