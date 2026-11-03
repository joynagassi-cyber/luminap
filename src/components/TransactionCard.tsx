import { memo } from "react";
import { ArrowUpRight, ArrowDownRight, Users, Calendar } from "lucide-react";
import {
  formatCurrencyCompact,
  formatDate,
  getStatusLabel,
  getStatusColor,
  tint,
} from "@/lib/utils";
import type { Transaction } from "@/types";
import { useNavigate } from "react-router-dom";

/**
 * TransactionCard — ligne « Derniers mouvements » du dashboard.
 *
 * Bug P0-5 : rendue par un `IonButton` sans `fill` ni `--background`, la
 * carte prenait le fond accent SOLIDE d'Ionic (orange `#FF6B00`) — le
 * `backgroundColor` posé en style ne touche que l'hôte, pas le bouton
 * natif du shadow DOM — avec montant rouge et badge vert illisibles
 * dessus. C'est désormais un <button> HTML natif, comme le reste de la
 * navigation : fond neutre en permanence, l'accent n'apparaît qu'en
 * teintes (pastilles), jamais en aplat sous du texte.
 *
 * Règles (spéc. dashboard §5.3) :
 * - titre = description, sinon catégorie, sinon « Entrée »/« Sortie »
 *   (jamais « Transaction » générique) ;
 * - montant signé (− typographique), devise incluse par le format choisi
 *   (aucune ligne « FCFA » répétée) ;
 * - badge de statut UNIQUEMENT si différent d'approuvé.
 */
export const TransactionCard = memo(function TransactionCard({
  transaction,
  onPress,
}: {
  transaction: Transaction;
  onPress?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (onPress) onPress(transaction.id);
    else navigate(`/transaction/${transaction.id}`);
  };
  const isIncome = transaction.type === "INCOME";
  const category = transaction.category;
  const orgUnit = transaction.orgUnit;
  const event = transaction.event;
  const showStatus = transaction.status !== "APPROVED";

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left rounded-xl p-4 transition-transform active:scale-[0.98]"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isIncome ? tint("var(--in)", 12) : tint("var(--out)", 12) }}
        >
          {isIncome ? (
            <ArrowUpRight className="w-5 h-5" style={{ color: "var(--in)" }} />
          ) : (
            <ArrowDownRight className="w-5 h-5" style={{ color: "var(--out)" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-semibold truncate">
            {transaction.description ||
              category?.labelFr ||
              (isIncome ? "Entrée" : "Sortie")}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-text-tertiary text-xs">
              {formatDate(transaction.date)}
            </span>
            {category && (
              <>
                <span className="text-text-tertiary text-xs">·</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 8%,  transparent)", color: "var(--accent-primary)" }}
                >
                  {category.labelFr}
                </span>
              </>
            )}
            {orgUnit && (
              <>
                <span className="text-text-tertiary text-xs">·</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: tint("var(--data-planified)", 15), color: "var(--data-planified)" }}
                >
                  <Users className="w-3 h-3" /> {orgUnit.name}
                </span>
              </>
            )}
            {event && (
              <>
                <span className="text-text-tertiary text-xs">·</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: tint("var(--data-advance)", 15), color: "var(--data-advance)" }}
                >
                  <Calendar className="w-3 h-3" /> {event.name}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p
            className={`font-bold text-sm whitespace-nowrap ${isIncome ? "text-income" : "text-expense"}`}
          >
            {isIncome ? "+" : "−"}
            {formatCurrencyCompact(transaction.amount)}
          </p>
          {showStatus && (
            <div
              className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: tint(getStatusColor(transaction.status), 12),
                color: getStatusColor(transaction.status),
              }}
            >
              {getStatusLabel(transaction.status)}
            </div>
          )}
        </div>
      </div>
    </button>
  );
});

export default TransactionCard;
