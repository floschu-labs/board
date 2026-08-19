import { useEffect, useState, useCallback } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useBoardStore } from '../store';
import { detectImport, validateAndPrepareImport } from '../utils/importExport';
import { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';

/**
 * Full-window drop target: dragging a Board backup or Trello export (.json)
 * onto the app prompts "Do you want to import this?" before importing.
 *
 * Uses native HTML5 drag-and-drop on window, which does not conflict with the
 * pointer-based @dnd-kit card/list dragging.
 */
export function ImportDropZone() {
  const projects = useBoardStore((s) => s.projects);
  const importData = useBoardStore((s) => s.importData);
  const { dialog, showConfirm, hideConfirm, handleConfirm } = useConfirmDialog();
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      let raw: unknown;
      try {
        raw = JSON.parse(await file.text());
      } catch {
        window.alert('Could not import: the file is not valid JSON.');
        return;
      }

      let detected;
      try {
        detected = detectImport(raw);
      } catch (error) {
        window.alert('Could not import: ' + (error as Error).message);
        return;
      }

      const { source, name, counts } = detected;
      const kind = source === 'trello' ? 'Trello board' : 'Board backup';
      const namePart = name ? ` “${name}”` : '';
      const lists = `${counts.lists} list${counts.lists === 1 ? '' : 's'}`;
      const cards = `${counts.cards} card${counts.cards === 1 ? '' : 's'}`;

      showConfirm({
        title: 'Import board',
        message: `Do you want to import this ${kind}${namePart}?\n\n${lists} and ${cards} will be added to your board.`,
        confirmLabel: 'Import',
        onConfirm: () => {
          try {
            const prepared = validateAndPrepareImport(detected.data, projects);
            importData(prepared);
          } catch (error) {
            window.alert('Could not import: ' + (error as Error).message);
          }
        },
      });
    },
    [projects, showConfirm, importData]
  );

  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      // Required so the browser fires a drop event instead of opening the file.
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    };

    const onDragLeave = (e: DragEvent) => {
      // relatedTarget is null only when the cursor leaves the window entirely,
      // which avoids flicker as it passes over child elements.
      if (e.relatedTarget === null) setIsDragging(false);
    };

    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleFile]);

  return (
    <>
      {isDragging && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-glow/60 bg-bg-secondary/80 px-12 py-10 text-center">
            <ArrowDownTrayIcon className="w-8 h-8 text-glow" />
            <p className="text-text-primary text-lg font-medium">Drop to import</p>
            <p className="text-text-muted text-sm">Board backup or Trello export (.json)</p>
          </div>
        </div>
      )}

      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          danger={dialog.danger}
          onConfirm={handleConfirm}
          onCancel={hideConfirm}
        />
      )}
    </>
  );
}
