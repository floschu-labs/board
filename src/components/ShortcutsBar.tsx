import { useBoardStore } from '../store';

export function ShortcutsBar() {
  const projects = useBoardStore((s) => s.projects);

  const shortcuts = [
    { key: 'n', label: 'new card' },
    { key: '↑↓←→', label: 'navigate' },
    { key: 'Shift+↑↓←→', label: 'move' },
    { key: 'Enter', label: 'open' },
    { key: 'Shift+Backspace', label: 'delete' },
    ...(projects.length > 1 ? [{ key: '1-9', label: 'projects' }] : []),
  ];

  return (
    <div className="flex items-center justify-center gap-4 px-6 text-xs text-text-muted pb-[env(safe-area-inset-bottom)] pl-[max(env(safe-area-inset-left),1.5rem)] pr-[max(env(safe-area-inset-right),1.5rem)]" style={{ minHeight: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
      {shortcuts.map(({ key, label }, i) => (
        <span key={i}>
          <span className="text-text-secondary">{key}</span>
          <span className="mx-1">·</span>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
