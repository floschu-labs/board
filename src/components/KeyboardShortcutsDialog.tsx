import { Fragment } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutProps {
  keys: string[];
  description: string;
}

function Shortcut({ keys, description }: ShortcutProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-text-secondary">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i}>
            {i > 0 && <span className="text-text-muted mx-1">+</span>}
            <kbd className="px-2 py-1 bg-bg-tertiary border border-border rounded text-xs text-text-primary font-mono min-w-[24px] text-center inline-block">
              {key}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

function ShortcutSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">{title}</h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                  Keyboard Shortcuts
                </DialogTitle>

                <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                  <ShortcutSection title="Navigation">
                    <Shortcut keys={['Arrow Keys']} description="Navigate cards & lists" />
                    <Shortcut keys={['1-9']} description="Switch to project" />
                    <Shortcut keys={['Esc']} description="Clear focus" />
                  </ShortcutSection>

                  <ShortcutSection title="Cards">
                    <Shortcut keys={['N']} description="New card" />
                    <Shortcut keys={['Enter']} description="Open focused card" />
                    <Shortcut keys={['Shift', 'Enter']} description="Open card link" />
                    <Shortcut keys={['Shift', 'Backspace']} description="Delete focused card" />
                  </ShortcutSection>

                  <ShortcutSection title="Move Items">
                    <Shortcut keys={['Shift', 'Arrow']} description="Move card/list" />
                  </ShortcutSection>

                  <ShortcutSection title="Lists">
                    <Shortcut keys={['Shift', 'N']} description="New list" />
                    <Shortcut keys={['Enter']} description="New card in focused list" />
                    <Shortcut keys={['Shift', 'Backspace']} description="Delete focused list" />
                  </ShortcutSection>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-bg-tertiary hover:bg-bg-hover border border-border text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-glow/50"
                  >
                    Close
                    <span className="ml-2 text-text-muted text-xs">Esc</span>
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
