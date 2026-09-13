import { Bell, Settings, LayoutDashboard } from "lucide-react";
import { IonHeader, IonToolbar } from "@ionic/react";
import { useLocalStore } from "@/store/useLocalStore";
import { useNavigate } from "react-router-dom";
import {
  useCurrentUser,
  useOrganizations,
  useAppConfig,
} from "@/lib/dataLayer";
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
  const { config: appConfig } = useAppConfig();
  const churchLogo = appConfig?.churchLogoUrl;

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
            {/* Logo Lumina (marque) */}
            <img
              src="/lumina-logo.png"
              alt="Lumina"
              className="w-8 h-8 rounded-lg"
              style={{ border: "1px solid #282828" }}
            />
            {/* Logo de l'église / organisation (uploadé, bucket « logos ») */}
            {churchLogo && (
              <img
                src={churchLogo}
                alt={`Logo de ${appConfig?.churchName || "l'organisation"}`}
                className="w-8 h-8 rounded-lg object-cover"
                style={{ border: "1px solid #282828" }}
              />
            )}
            <div>
              <p className="text-text-primary font-bold text-sm leading-none">
                {title || "Lumina"}
              </p>
              <p className="text-text-tertiary text-xs mt-0.5">
                {title ? "Gestion financière" : "Lumina"}
              </p>
            </div>
          </div>
          {/* Boutons d'action en HTML natif (pas de IonButton) : les
              enfants React des custom elements Ionic pouvaient ne pas
              être rendus (boutons vides) avec React 19. */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNotificationsClick}
              style={{
                position: "relative",
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid #282828",
                backgroundColor: "#212121",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
              aria-label="Notifications"
              title="Notifications"
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
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid #282828",
                backgroundColor: "#212121",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
              aria-label="Paramètres"
              title="Paramètres"
            >
              <Settings className="w-4 h-4 text-text-secondary" />
            </button>
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
              style={{ color: isCentralAdmin ? "var(--accent-primary)" : "#7aa2ff" }}
            >
              {inOrgContext
                ? `Organisation : ${orgName}`
                : "Administration centrale"}
            </span>
            {isCentralAdmin && (
              <button
                type="button"
                onClick={handleReturnToCentral}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: "#2a2a2a",
                  color: "#B3B3B3",
                  fontSize: 12,
                }}
                aria-label="Retour à l'administration centrale"
              >
                <LayoutDashboard className="w-3 h-3 mr-1" />
                {inOrgContext ? "Retour au central" : "Ouvrir le dashboard"}
              </button>
            )}
          </div>
        </div>
      )}
    </IonHeader>
  );
}
