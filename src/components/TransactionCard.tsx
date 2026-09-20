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
import { IonButton } from "@ionic/react";

export default function TransactionCard({
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

  return (
    <IonButton
      onClick={handleClick}
      className="w-full text-left rounded-xl transition-all active:scale-95 !min-height:auto"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isIncome ? tint("var(--data-income)", 12) : tint("var(--data-expense)", 12) }}
        >
          {isIncome ? (
            <ArrowUpRight className="w-5 h-5" style={{ color: "var(--data-income)" }} />
          ) : (
            <ArrowDownRight className="w-5 h-5" style={{ color: "var(--data-expense)" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-semibold truncate">
            {transaction.description || category?.labelFr || "Transaction"}
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
            className={`font-bold text-sm ${isIncome ? "text-income" : "text-expense"}`}
          >
            {isIncome ? "+" : "-"}
            {formatCurrencyCompact(transaction.amount)}
          </p>
          <p className="text-text-tertiary text-xs">FCFA</p>
          <div
            className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: tint(getStatusColor(transaction.status), 12),
              color: getStatusColor(transaction.status),
            }}
          >
            {getStatusLabel(transaction.status)}
          </div>
        </div>
      </div>
    </IonButton>
  );
}
