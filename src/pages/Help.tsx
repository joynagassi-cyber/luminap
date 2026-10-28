import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/lib/dataLayer";
import { useOrganizations } from "@/lib/dataLayer";
import { HelpCircle, Info, Shield, Database, GraduationCap, ArrowRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import HowToSearch from "@/components/HowToSearch";
import { rolesByPrivilege } from "@/lib/roleGuide";
import { IonPage, IonContent } from "@ionic/react";

export default function Help() {
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();
  const { data: organizations } = useOrganizations();
  const orgName = organizations?.[0]?.name;
  const roles = rolesByPrivilege();

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader title="Aide" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <h1 className="text-text-primary font-bold text-xl mb-4">
              Aide & Informations
            </h1>

            {/* ── Recherche guidée : l'action principale de cette page ─────── */}
            <HowToSearch />

            <button
              type="button"
              onClick={() => navigate("/tutoriel")}
              className="w-full flex items-center gap-3 rounded-xl px-4 mb-6 text-left"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                minHeight: 56,
              }}
            >
              <GraduationCap
                className="w-5 h-5 flex-shrink-0"
                style={{ color: "var(--accent-primary)" }}
                aria-hidden="true"
              />
              <span className="flex-1 py-3">
                <span className="block text-sm font-medium text-text-primary">
                  Tutoriel complet
                </span>
                <span className="block text-xs mt-0.5 text-text-tertiary">
                  Toutes les fonctionnalités, expliquées en détail
                </span>
              </span>
              <ArrowRight
                className="w-4 h-4 flex-shrink-0 text-text-tertiary"
                aria-hidden="true"
              />
            </button>

            <div className="space-y-4 mb-8">
              {[
                {
                  icon: Info,
                  title: "Comment utiliser Lumina",
                  desc: "Ajoutez des transactions, gérez vos caisses et effectuez des versements entre groupes.",
                },
                {
                  icon: Shield,
                  title: "Sécurité des données",
                  desc: "Vos données sont stockées localement et synchronisées via PowerSync pour accès multi-appareil.",
                },
                {
                  icon: Database,
                  title: "Synchronisation",
                  desc: `État: ${notifications?.length ?? 0} notifications reçues.`,
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                  </div>
                  <div>
                    <p className="text-text-primary font-semibold text-sm">
                      {title}
                    </p>
                    <p className="text-text-tertiary text-xs mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="rounded-xl p-4 mb-6"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                <span className="text-text-primary font-semibold">
                  Rôles disponibles
                </span>
              </div>
              {/* Liste dérivée de PERMISSION_MATRIX : impossible d'afficher un
                  rôle inexistant ou d'en oublier un. */}
              <p className="text-text-tertiary text-xs mb-3">
                {roles.length} rôles, du plus large au plus restreint
              </p>
              <ul className="space-y-3">
                {roles.map((r) => (
                  <li key={r.role}>
                    <p className="text-text-primary text-sm font-medium">
                      {r.label}
                    </p>
                    <p className="text-text-tertiary text-xs mt-0.5">
                      {r.summary}
                    </p>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => navigate("/admin/roles")}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium"
                style={{ color: "var(--accent-primary)", minHeight: 44 }}
              >
                Attribuer un rôle
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-text-tertiary text-xs text-center">
              Lumina v2.0{orgName ? ` · ${orgName}` : ""}
            </p>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
