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
          backgroundColor: "var(--nav-bg)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Logo Lumina (marque) */}
            <img
              src="/lumina-logo.png"
              alt="Lumina"
              className="w-8 h-8 rounded-lg"
              style={{ border: "1px solid var(--border)" }}
            />
            {/* Logo de l'église / organisation (uploadé, bucket « logos ») */}
            {churchLogo && (
              <img
                src={churchLogo}
                alt={`Logo de ${appConfig?.churchName || "l'organisation"}`}
                className="w-8 h-8 rounded-lg object-cover"
                style={{ border: "1px solid var(--border)" }}
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
            {/* Zone tactile ≥ 44 px (bouton transparent) autour d'un cercle
                36 px inchangé visuellement (a11y : cible tactile WCAG). */}
            <button
              type="button"
              onClick={handleNotificationsClick}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                backgroundColor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
              aria-label={
                unreadCount > 0
                  ? `Notifications (${unreadCount} non lues)`
                  : "Notifications"
              }
              title="Notifications"
              aria-haspopup="dialog"
            >
              <span
                style={{
                  position: "relative",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bell className="w-4 h-4 text-text-secondary" />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: "var(--data-expense)", color: "#fff" }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                backgroundColor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
              aria-label="Paramètres"
              title="Paramètres"
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Settings className="w-4 h-4 text-text-secondary" />
              </span>
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
            backgroundColor: isCentralAdmin ? "var(--band-central)" : "var(--band-org)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div className="px-4 py-1.5 flex items-center justify-between gap-2">
            <span
              className="text-xs truncate"
              style={{ color: isCentralAdmin ? "var(--accent-primary)" : "var(--band-org-ink)" }}
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
                  backgroundColor: "var(--surface-hover)",
                  color: "var(--text-secondary)",
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
