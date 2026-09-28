interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onCancel}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative card p-5 w-full max-w-sm shadow-2xl"
      >
        <h2 id="confirm-dialog-title" className="text-sm font-semibold text-neutral-900 mb-2">
          {title}
        </h2>
        <p className="text-sm text-neutral-600 leading-relaxed mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-outline text-xs px-3 py-1.5" disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              destructive
                ? 'bg-[#d03b3b] text-white hover:bg-[#b83232] disabled:opacity-50'
                : 'btn-primary'
            }`}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
