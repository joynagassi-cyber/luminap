/**
 * Sessions v2 — Gestion des sessions, redesign premium.
 *
 * Design : fond sombre, liste des comptes connectés avec avatars,
 * actions de déconnexion.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Clock, ShieldCheck } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import EmptyState from "@/components/EmptyState";
import { Section, InfoCard, ListItem } from "@/design/components/PageShell";

const SESSIONS = [
  {
    id: "1",
    name: "Compte principal",
    email: "admin@eglise.example.com",
    role: "Administrateur",
    status: "active",
    lastSeen: "Il y a 5 min",
  },
  {
    id: "2",
    name: "Compte trésorier",
    email: "tresorier@eglise.example.com",
    role: "Trésorier",
    status: "active",
    lastSeen: "Hier",
  },
];

export default function Sessions() {
  const navigate = useNavigate();

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <h1 className="text-text-primary font-bold text-2xl leading-tight">Mes comptes</h1>
              <p className="text-text-tertiary text-sm">
                Gérez vos sessions actives sur cette appareil.
              </p>
            </div>
          </div>
          <div className="max-w-lg mx-auto px-5 pt-2 pb-safe-calc">
            {SESSIONS.length === 0 ? (
              <EmptyState
                title="Aucune session"
                description="Aucun compte n'est connecté sur cet appareil."
                icon={<User className="w-6 h-6" />}
              />
            ) : (
              <Section title="Comptes connectés">
                <div className="space-y-3">
                  {SESSIONS.map((s) => (
                    <ListItem
                      key={s.id}
                      icon={
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                          }}
                        >
                          <User className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                        </div>
                      }
                      title={s.name}
                      subtitle={`${s.role} • ${s.lastSeen}`}
                      onClick={() => navigate(`/session/${s.id}`)}
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
