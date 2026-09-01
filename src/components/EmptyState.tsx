interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-16 h-16 mb-4 text-text-tertiary">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-tertiary text-sm mb-6 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 rounded-full font-semibold text-sm transition-all active:scale-95"
          style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
