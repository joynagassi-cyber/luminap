import { memo } from "react";
import type { TransactionStatus } from "@/types";
import { getStatusColor, getStatusLabel, tint } from "@/lib/utils";

interface StatusBadgeProps {
  status: TransactionStatus;
  size?: "sm" | "md";
}

// M6 — memo : badge re-rendu à chaque tick du store sinon.
const StatusBadge = memo(function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  const sizeClasses =
    size === "md" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses}`}
      style={{ backgroundColor: tint(color, 12), color }}
    >
      {label}
    </span>
  );
});

export default StatusBadge;
