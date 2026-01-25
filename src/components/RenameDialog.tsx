import { useState, Fragment, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
  Button,
} from '@headlessui/react';

interface RenameDialogProps {
  title: string;
  currentName: string;
  confirmLabel?: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export function RenameDialog({
  title,
  currentName,
  confirmLabel = 'Rename',
  onConfirm,
  onCancel,
}: RenameDialogProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onCancel}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-bg-secondary border border-border p-6 shadow-2xl transition-all focus:outline-none">
                <DialogTitle as="h3" className="text-lg font-semibold text-text-primary mb-4">
                  {title}
                </DialogTitle>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-glow/50 focus:border-glow/50"
                  placeholder="Enter name..."
                />
                <div className="flex gap-3 justify-end mt-6">
                  <Button
                    onClick={onCancel}
                    className="px-4 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors text-sm font-medium focus:outline-none focus:ring-1 focus:ring-glow/50"
                  >
                    Cancel
                    <span className="ml-2 text-text-muted text-xs">Esc</span>
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!name.trim()}
                    className="px-4 py-2.5 rounded-xl font-medium text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-glow/50 bg-bg-tertiary hover:bg-bg-hover border border-border text-text-primary disabled:opacity-50"
                  >
                    {confirmLabel}
                    <span className="ml-2 text-text-muted text-xs">Enter</span>
                  </Button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Hook for managing rename dialogs
export function useRenameDialog() {
  const [dialog, setDialog] = useState<{
    title: string;
    currentName: string;
    confirmLabel?: string;
    onConfirm: (newName: string) => void;
  } | null>(null);

  const showRename = (options: {
    title: string;
    currentName: string;
    confirmLabel?: string;
    onConfirm: (newName: string) => void;
  }) => {
    setDialog(options);
  };

  const hideRename = () => setDialog(null);

  const handleConfirm = (newName: string) => {
    dialog?.onConfirm(newName);
    hideRename();
  };

  return { dialog, showRename, hideRename, handleConfirm };
}
