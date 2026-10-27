/**
 * CapabilityBanner — rend visible, dans l'UI, ce que l'utilisateur peut ou ne
 * peut pas faire (contrat RBAC §3.7 / décision D2).
 *
 * La décision n'est PAS réimplémentée ici : le hook `useMyCapabilities` (D5) en
 * est une projection en lecture, elle-même adossée à `has_permission` /
 * `evaluatePermission`. Ce composant ne fait que l'afficher.
 */
import { Check, X } from "lucide-react";

import { useMyCapabilities } from "@/hooks/useMyCapabilities";
import type { Capability } from "@/lib/capabilities";

export interface CapabilityBannerProps {
  orgId?: string;
  className?: string;
}

function CapabilityList({
  title,
  capabilities,
  tone,
}: {
  title: string;
  capabilities: Capability[];
  tone: "allowed" | "denied";
}) {
  const allowed = tone === "allowed";
  const color = allowed ? "var(--data-income)" : "var(--text-tertiary)";
  const Icon = allowed ? Check : X;

  return (
    <div className="flex-1 min-w-0">
      <p
        className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2"
        data-capability-group={tone}
      >
        {title}
      </p>
      {capabilities.length === 0 ? (
        <p className="text-text-tertiary text-xs">—</p>
      ) : (
        <ul className="space-y-2">
          {capabilities.map((cap) => (
            <li key={cap.id} className="flex items-start gap-2">
              <span
                className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
                aria-hidden
              >
                <Icon className="w-3 h-3" style={{ color }} />
              </span>
              <span className="min-w-0">
                <span className="block text-text-primary text-sm font-medium">
                  {cap.label}
                </span>
                <span className="block text-text-tertiary text-xs">
                  {cap.description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CapabilityBanner({ orgId, className }: CapabilityBannerProps) {
  const { capabilities } = useMyCapabilities(orgId);

  if (capabilities.length === 0) return null;

  const allowed = capabilities.filter((c) => c.allowed).map((c) => c.capability);
  const denied = capabilities.filter((c) => !c.allowed).map((c) => c.capability);

  return (
    <section
      role="status"
      aria-label="Vos capacités dans cette organisation"
      className={`rounded-xl p-4 mb-5${className ? ` ${className}` : ""}`}
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        <CapabilityList title="Vous pouvez" capabilities={allowed} tone="allowed" />
        <CapabilityList title="Vous ne pouvez pas" capabilities={denied} tone="denied" />
      </div>
    </section>
  );
}
