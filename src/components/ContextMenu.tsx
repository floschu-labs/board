import { useState, useEffect, useRef, Fragment, type ReactNode } from 'react';
import { Transition } from '@headlessui/react';

interface ContextMenuItem {
  label: string;
  description?: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Check if any item has a description
  const hasDescriptions = items.some((item) => item.description);
  const menuWidth = hasDescriptions ? 256 : 160;
  const itemHeight = hasDescriptions ? 56 : 40;

  // Adjust position to keep menu within viewport
  const adjustedX = Math.min(x, window.innerWidth - menuWidth);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * itemHeight + 16));

  // Handle Escape key to close menu (accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the menu for keyboard navigation
    menuRef.current?.focus();
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <>
      {/* Backdrop to close menu */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Menu positioned at click coordinates */}
      <Transition
        as={Fragment}
        appear
        show={true}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <div
          ref={menuRef}
          tabIndex={-1}
          role="menu"
          aria-label="Context menu"
          className="fixed z-50 rounded-lg bg-bg-secondary border border-border p-1 shadow-xl outline-none"
          style={{ left: adjustedX, top: adjustedY, minWidth: menuWidth }}
        >
          {items.map((item, index) => (
            <button
              key={index}
              role="menuitem"
              aria-label={item.description ? `${item.label}: ${item.description}` : item.label}
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className={`w-full px-3 py-2 text-left rounded-md transition-colors flex items-start gap-3 ${
                item.danger
                  ? 'bg-danger/10 hover:bg-danger/20 text-danger'
                  : 'text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {item.icon && (
                <span className={`mt-0.5 ${item.danger ? 'text-danger/70' : 'text-text-muted'}`}>
                  {item.icon}
                </span>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{item.label}</span>
                {item.description && (
                  <span className={`text-xs ${item.danger ? 'text-danger/60' : 'text-text-muted'}`}>{item.description}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </Transition>
    </>
  );
}

// Hook for managing context menu state
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const showContextMenu = (
    e: React.MouseEvent,
    items: ContextMenuItem[]
  ) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const hideContextMenu = () => setContextMenu(null);

  return { contextMenu, showContextMenu, hideContextMenu };
}
