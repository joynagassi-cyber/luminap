/**
 * Notifications v2 — Liste des notifications, redesign premium.
 *
 * Design : fond sombre, liste de notifications avec icônes et timestamps,
 * actions de marquage lu.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Clock, CheckCircle2, Mail, AlertCircle, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import EmptyState from "@/components/EmptyState";
import { Section, InfoCard, ListItem } from "@/design/components/PageShell";

const NOTIFICATIONS = [
  {
    id: "1",
    title: "Nouvelle entrée enregistrée",
    subtitle: "Dîme du mois — 150 000 XOF",
    time: "Il y a 2h",
    icon: <CheckCircle2 className="w-4 h-4" style={{ color: "var(--in)" }} />,
    type: "success",
  },
  {
    id: "2",
    title: "Dépense à approuver",
    subtitle: "Matériel de sonorisation — 750 000 XOF",
    time: "Il y a 5h",
    icon: <AlertCircle className="w-4 h-4" style={{ color: "var(--out)" }} />,
    type: "warning",
  },
  {
    id: "3",
    title: "Rapport mensuel disponible",
    subtitle: "Le rapport de octobre est prêt à être téléchargé",
    time: "Hier",
    icon: <FileIcon className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />,
    type: "info",
  },
  {
    id: "4",
    title: "Nouveau membre inscrit",
    subtitle: "Jean Dupont a rejoint l'organisation",
    time: "Il y a 2 jours",
    icon: <UsersIcon className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />,
    type: "info",
  },
];

export default function Notifications() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(2);

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <h1 className="text-text-primary font-bold text-2xl leading-tight">Notifications</h1>
              <p className="text-text-tertiary text-sm">
                Restez informé des activités de votre organisation.
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => setUnreadCount(0)}
                className="text-xs font-medium"
                style={{ color: "var(--accent-primary)" }}
                aria-label="Tout marquer comme lu"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="max-w-lg mx-auto px-5 pt-2 pb-safe-calc">
            {NOTIFICATIONS.length === 0 ? (
              <EmptyState
                title="Aucune notification"
                description="Vous êtes à jour sur toutes les activités de votre organisation."
                icon={<Bell className="w-6 h-6" />}
              />
            ) : (
              <Section title="Activités récentes">
                <div className="space-y-3">
                  {NOTIFICATIONS.map((n) => (
                    <ListItem
                      key={n.id}
                      icon={
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                          }}
                        >
                          {n.icon}
                        </div>
                      }
                      title={n.title}
                      subtitle={`${n.subtitle} · ${n.time}`}
                      onClick={() => navigate(`/notification/${n.id}`)}
                    />
                  ))}
                </div>
              </Section>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}

function FileIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

function UsersIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.47" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
