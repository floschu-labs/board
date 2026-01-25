import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  Button,
} from '@headlessui/react';
import { motion } from 'motion/react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Blur active element before closing to prevent focus restoration
  const handleConfirm = useCallback(() => {
    (document.activeElement as HTMLElement)?.blur();
    onConfirm();
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    (document.activeElement as HTMLElement)?.blur();
    onCancel();
  }, [onCancel]);

  // Focus confirm button on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard shortcuts - separate effect to avoid re-running on focusedButton change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
      // Arrow keys are intentionally not handled - only shortcuts and mouse allowed
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleConfirm, handleCancel]);

  return (
    <Dialog as="div" className="relative z-50" onClose={onCancel} open={true}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/70"
      />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-bg-secondary border border-border p-6 shadow-2xl focus:outline-none"
          >
            <DialogTitle as="h3" className="text-lg font-semibold text-text-primary mb-2">
              {title}
            </DialogTitle>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed whitespace-pre-line">{message}</p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors text-sm font-medium focus:outline-none focus:ring-1 focus:ring-glow/50 select-none"
              >
                {cancelLabel}
                <span className="ml-2 text-text-muted text-xs">Esc</span>
              </Button>
              <Button
                ref={confirmButtonRef}
                onClick={handleConfirm}
                className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-colors focus:outline-none select-none ${
                  danger
                    ? 'bg-danger/10 hover:bg-danger/20 text-danger focus:ring-2 focus:ring-danger/50'
                    : 'bg-bg-tertiary hover:bg-bg-hover border border-border text-text-primary focus:ring-1 focus:ring-glow/50'
                }`}
              >
                {confirmLabel}
                <span className={`ml-2 text-xs ${danger ? 'text-danger/60' : 'text-text-muted'}`}>Enter</span>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </Dialog>
  );
}

// Hook for managing confirm dialogs
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  }) => {
    setDialog(options);
  };

  const hideConfirm = () => setDialog(null);

  const handleConfirm = () => {
    dialog?.onConfirm();
    hideConfirm();
  };

  return { dialog, showConfirm, hideConfirm, handleConfirm };
}
