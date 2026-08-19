import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  Field,
  Input,
  Label,
  Button,
  Textarea,
} from '@headlessui/react';
import { motion } from 'motion/react';
import { PhotoIcon, CalendarIcon, LinkIcon, Bars3BottomLeftIcon, PencilSquareIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/16/solid';
import type { Card } from '../types';
import { useBoardStore } from '../store';
import { useCardFocusStore } from '../store/cardFocus';
import { getSafeHref, getSafeImageUrl } from '../utils/url';
import { continueMarkdownList } from '../utils/markdownList';
import { DatePicker } from './DatePicker';
import { ConfirmDialog } from './ConfirmDialog';
import { Markdown } from './Markdown';

interface CardModalProps {
  card: Card;
  onClose: () => void;
  isNew?: boolean;
}

// Focusable field indices for arrow navigation - no longer used with fixed indices
// Navigation is now dynamic based on visible elements

export function CardModal({ card, onClose, isNew = false }: CardModalProps) {
  const updateCard = useBoardStore((s) => s.updateCard);
  const deleteCard = useBoardStore((s) => s.deleteCard);
  const clearFocus = useCardFocusStore((s) => s.clearFocus);
  
  // Refs for focusable elements
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const descriptionPreviewRef = useRef<HTMLDivElement>(null);
  const addDescriptionRef = useRef<HTMLButtonElement>(null);
  const coverImageRef = useRef<HTMLInputElement>(null);
  const coverImageClearRef = useRef<HTMLButtonElement>(null);
  const addCoverImageRef = useRef<HTMLButtonElement>(null);
  const dueDateButtonRef = useRef<HTMLButtonElement>(null);
  const dueDateClearRef = useRef<HTMLButtonElement>(null);
  const addDueDateRef = useRef<HTMLButtonElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const linkOpenRef = useRef<HTMLAnchorElement>(null);
  const addLinkRef = useRef<HTMLButtonElement>(null);

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [link, setLink] = useState(card.link ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(card.coverImageUrl ?? '');
  const [dueDate, setDueDate] = useState(card.dueDate ?? '');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // Trello-style description: show rendered markdown until the user clicks in
  // to edit. An empty description always shows the editor so there's nothing
  // blank to click.
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const showDescriptionEditor = isEditingDescription || description.trim() === '';
  
  // Track which optional fields are expanded (shown as inputs vs collapsed buttons)
  const [expandedFields, setExpandedFields] = useState<{
    description: boolean;
    coverImage: boolean;
    dueDate: boolean;
    link: boolean;
  }>({
    description: !!card.description,
    coverImage: !!card.coverImageUrl,
    dueDate: !!card.dueDate,
    link: !!card.link,
  });

  // State to auto-open calendar when "Add due date" is clicked
  const [autoOpenCalendar, setAutoOpenCalendar] = useState(false);

  const expandField = useCallback((field: 'description' | 'coverImage' | 'dueDate' | 'link') => {
    setExpandedFields(prev => ({ ...prev, [field]: true }));
    // Expanding the description should open the editor, not the preview.
    if (field === 'description') {
      setIsEditingDescription(true);
    }
  }, []);

  // Switch the description from rendered preview into the raw-markdown editor
  // and move focus to the textarea (Trello-style click-to-edit).
  const startEditingDescription = useCallback(() => {
    setIsEditingDescription(true);
    setTimeout(() => descriptionRef.current?.focus(), 0);
  }, []);

  // Auto-resize description textarea when it becomes visible or content changes
  useEffect(() => {
    if (expandedFields.description && descriptionRef.current) {
      const textarea = descriptionRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [expandedFields.description, description]);

  // Each row contains elements that can be navigated horizontally
  // Rows are navigated vertically
  const getNavigationRows = useCallback(() => {
    const rows: (HTMLElement | null)[][] = [];
    
    // Title row (just title input)
    rows.push([titleInputRef.current]);
    
    // Description row - textarea when editing, rendered preview otherwise.
    // Only one of the two refs is mounted at a time; nulls are filtered below.
    if (expandedFields.description) {
      rows.push([descriptionRef.current, descriptionPreviewRef.current]);
    }
    
    // Cover image row (input or clear button for base64)
    if (expandedFields.coverImage) {
      if (coverImageUrl.startsWith('data:')) {
        rows.push([coverImageClearRef.current]);
      } else {
        rows.push([coverImageRef.current]);
      }
    }
    
    // Due date row (button + optional clear)
    if (expandedFields.dueDate) {
      const dueDateRow: (HTMLElement | null)[] = [dueDateButtonRef.current];
      if (dueDate) dueDateRow.push(dueDateClearRef.current);
      rows.push(dueDateRow);
    }
    
    // Link row (input + optional open button)
    if (expandedFields.link) {
      const linkRow: (HTMLElement | null)[] = [linkInputRef.current];
      if (link && getSafeHref(link)) linkRow.push(linkOpenRef.current);
      rows.push(linkRow);
    }
    
    // Collapsed "Add" buttons row
    const addButtonsRow: (HTMLElement | null)[] = [];
    if (!expandedFields.description) addButtonsRow.push(addDescriptionRef.current);
    if (!expandedFields.coverImage) addButtonsRow.push(addCoverImageRef.current);
    if (!expandedFields.dueDate) addButtonsRow.push(addDueDateRef.current);
    if (!expandedFields.link) addButtonsRow.push(addLinkRef.current);
    if (addButtonsRow.length > 0) rows.push(addButtonsRow);
    
    // Filter out null elements from each row
    return rows.map(row => row.filter((el): el is HTMLElement => el !== null)).filter(row => row.length > 0);
  }, [expandedFields, coverImageUrl, dueDate, link]);

  // Find current position in navigation grid
  const findCurrentPosition = useCallback((target: Element) => {
    const rows = getNavigationRows();
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const colIndex = rows[rowIndex].findIndex(el => el === target || el === document.activeElement);
      if (colIndex !== -1) {
        return { rowIndex, colIndex, rows };
      }
    }
    return { rowIndex: -1, colIndex: -1, rows };
  }, [getNavigationRows]);

  // Focus title input on mount (only for new cards) and clear board focus
  useEffect(() => {
    // Clear board focus so keyboard shortcuts don't interfere
    clearFocus();
    
    // Only focus and select title for new cards
    if (isNew) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Check if there are unsaved changes
  const hasChanges = useCallback(() => {
    if (isNew) {
      // For new cards, check if user has entered any content
      return title.trim() !== '' || description.trim() !== '' || link.trim() !== '' || coverImageUrl.trim() !== '' || dueDate !== '';
    }
    return (
      title !== card.title ||
      description !== card.description ||
      (link || '') !== (card.link || '') ||
      (coverImageUrl || '') !== (card.coverImageUrl || '') ||
      (dueDate || '') !== (card.dueDate || '')
    );
  }, [title, description, link, coverImageUrl, dueDate, card, isNew]);

  const handleSave = useCallback(() => {
    if (!title.trim()) return; // Don't save without a title
    
    updateCard(card.id, {
      title: title.trim(),
      description,
      link: link.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      dueDate: dueDate || undefined,
    });
    onClose();
  }, [updateCard, card.id, title, description, link, coverImageUrl, dueDate, onClose]);

  const handleDiscard = useCallback(() => {
    if (isNew) {
      // Delete the card if it's new and being discarded
      deleteCard(card.id);
    }
    onClose();
  }, [isNew, deleteCard, card.id, onClose]);

  const handleClose = useCallback(() => {
    if (hasChanges()) {
      setShowUnsavedWarning(true);
    } else if (isNew) {
      // For new cards with no changes, just delete and close
      deleteCard(card.id);
      onClose();
    } else {
      onClose();
    }
  }, [hasChanges, isNew, deleteCard, card.id, onClose]);

  const handleDelete = () => {
    deleteCard(card.id);
    onClose();
  };

  const handleDeleteWithConfirm = useCallback(() => {
    if (!isNew) {
      setShowDeleteConfirm(true);
    }
  }, [isNew]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+Backspace to delete (with confirmation)
      if (e.key === 'Backspace' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleDeleteWithConfirm();
        return;
      }

      // Shift+Enter to save
      if (e.key === 'Enter' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleSave();
        return;
      }
      
      // Escape to close (with warning if changes)
      // Skip if calendar is open - let the calendar handle its own escape
      if (e.key === 'Escape' && !isCalendarOpen) {
        e.preventDefault();
        handleClose();
        return;
      }

      // Arrow navigation between fields
      // Don't navigate with arrows in textarea (allow multiline editing)
      const target = e.target as HTMLElement;
      const isTextarea = target.tagName === 'TEXTAREA';
      const isInput = target.tagName === 'INPUT';
      
      // Horizontal navigation (Left/Right) - within a row
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // For inputs, check cursor position
        if (isInput) {
          const input = target as HTMLInputElement;
          if (e.key === 'ArrowLeft') {
            const isAtStart = input.selectionStart === null || input.selectionStart === 0;
            if (!isAtStart) return; // Let cursor move within input
          } else {
            const isAtEnd = input.selectionStart === null || input.selectionStart === input.value.length;
            if (!isAtEnd) return; // Let cursor move within input
          }
        }
        // Don't interfere with textarea at all for horizontal
        if (isTextarea) return;
        
        const { rowIndex, colIndex, rows } = findCurrentPosition(target);
        if (rowIndex === -1) return;
        
        e.preventDefault();
        const currentRow = rows[rowIndex];
        
        if (e.key === 'ArrowLeft' && colIndex > 0) {
          currentRow[colIndex - 1]?.focus();
        } else if (e.key === 'ArrowRight' && colIndex < currentRow.length - 1) {
          currentRow[colIndex + 1]?.focus();
        }
        return;
      }
      
      // Vertical navigation (Up/Down) - between rows
      if (e.key === 'ArrowDown' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // In textarea, only navigate out if on the last line
        if (isTextarea) {
          const textarea = target as HTMLTextAreaElement;
          const textAfterCursor = textarea.value.substring(textarea.selectionStart);
          const isOnLastLine = !textAfterCursor.includes('\n');
          if (!isOnLastLine) return;
        }
        // In input, only navigate out if at the end (or empty)
        if (isInput) {
          const input = target as HTMLInputElement;
          const isAtEnd = input.selectionStart === null || input.selectionStart === input.value.length;
          if (!isAtEnd) return;
        }
        
        e.preventDefault();
        const { rowIndex, colIndex, rows } = findCurrentPosition(target);
        
        if (rowIndex !== -1 && rowIndex < rows.length - 1) {
          // Move to next row, try to keep same column index
          const nextRow = rows[rowIndex + 1];
          const nextColIndex = Math.min(colIndex, nextRow.length - 1);
          nextRow[nextColIndex]?.focus();
        } else if (rowIndex === -1 && rows.length > 0) {
          // Not found, focus first element
          rows[0][0]?.focus();
        }
        return;
      }
      
      if (e.key === 'ArrowUp' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // In textarea, only navigate out if on the first line
        if (isTextarea) {
          const textarea = target as HTMLTextAreaElement;
          const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
          const isOnFirstLine = !textBeforeCursor.includes('\n');
          if (!isOnFirstLine) return;
        }
        // In input, only navigate out if at the beginning (or empty)
        if (isInput) {
          const input = target as HTMLInputElement;
          const isAtStart = input.selectionStart === null || input.selectionStart === 0;
          if (!isAtStart) return;
        }
        
        e.preventDefault();
        const { rowIndex, colIndex, rows } = findCurrentPosition(target);
        
        if (rowIndex > 0) {
          // Move to previous row, try to keep same column index
          const prevRow = rows[rowIndex - 1];
          const prevColIndex = Math.min(colIndex, prevRow.length - 1);
          prevRow[prevColIndex]?.focus();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleClose, handleDeleteWithConfirm, isCalendarOpen, expandedFields, coverImageUrl, dueDate, link, findCurrentPosition]);

  return (
    <>
      <Dialog as="div" className="relative z-50" onClose={handleClose} open={true}>
        {/* Backdrop - clicking this dismisses the modal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60"
          aria-hidden="true"
        />

        <div className="fixed inset-0 overflow-y-auto">
          <div 
            className="flex min-h-full items-center justify-center p-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] pl-[max(env(safe-area-inset-left),1.5rem)] pr-[max(env(safe-area-inset-right),1.5rem)]"
            onClick={(e) => {
              // Only close if clicking directly on the backdrop area, not the modal
              if (e.target === e.currentTarget) {
                handleClose();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-bg-secondary border border-border shadow-2xl focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cover Image - only render if URL is safe */}
              {coverImageUrl && getSafeImageUrl(coverImageUrl) && (
                <div className="h-36 w-full overflow-hidden bg-bg-tertiary">
                  <img
                    src={getSafeImageUrl(coverImageUrl)}
                    alt="Cover"
                    className="w-full h-full object-cover opacity-70"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="p-6">
                {/* Title */}
                <Field className="mb-6">
                  <div className="relative">
                    <PencilSquareIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <Input
                      ref={titleInputRef}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onPaste={(e) => {
                        const pastedText = e.clipboardData.getData('text').trim();
                        // Only treat as URL if it looks like one (has protocol or www prefix)
                        const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(pastedText);
                        if (looksLikeUrl) {
                          const validUrl = getSafeHref(pastedText);
                          if (validUrl) {
                            setLink(validUrl);
                            setExpandedFields(prev => ({ ...prev, link: true }));
                          }
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-tertiary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent data-focus:border-accent text-sm"
                      placeholder="Card title"
                    />
                  </div>
                </Field>

                {/* Description - shown when expanded.
                    Trello-style: rendered markdown preview until clicked to edit. */}
                {expandedFields.description && (
                  <Field className="mb-5">
                    <Label className="block text-sm font-medium text-text-secondary mb-2">
                      Description
                    </Label>
                    {showDescriptionEditor ? (
                      <Textarea
                        ref={descriptionRef}
                        value={description}
                        onKeyDown={(e) => {
                          // Auto-continue markdown lists on Enter (Shift+Enter saves the card).
                          if (
                            e.key !== 'Enter' ||
                            e.shiftKey ||
                            e.metaKey ||
                            e.ctrlKey ||
                            e.altKey ||
                            e.nativeEvent.isComposing
                          ) {
                            return;
                          }
                          const ta = e.currentTarget;
                          const edit = continueMarkdownList(
                            ta.value,
                            ta.selectionStart,
                            ta.selectionEnd
                          );
                          if (!edit) return;
                          e.preventDefault();
                          // Apply synchronously so the caret is set without a
                          // frame delay, then sync React state to the new value.
                          ta.setRangeText(edit.text, edit.start, edit.end, 'end');
                          ta.selectionStart = ta.selectionEnd = edit.cursor;
                          setDescription(ta.value);
                          ta.style.height = 'auto';
                          ta.style.height = `${ta.scrollHeight}px`;
                        }}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          // Auto-resize textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onFocus={(e) => {
                          // Ensure proper height on focus
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onBlur={() => {
                          // Return to the rendered preview once there's content to show.
                          if (description.trim() !== '') {
                            setIsEditingDescription(false);
                          }
                        }}
                        placeholder="Add a description (markdown supported)"
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-tertiary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent data-focus:border-accent text-sm resize-none min-h-[5rem] max-h-[20rem] overflow-y-auto scrollbar-hide"
                      />
                    ) : (
                      <div
                        ref={descriptionPreviewRef}
                        role="button"
                        tabIndex={0}
                        aria-label="Description, click to edit"
                        onClick={startEditingDescription}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            startEditingDescription();
                          }
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-tertiary border border-border text-text-primary text-sm min-h-[5rem] max-h-[20rem] overflow-y-auto scrollbar-hide cursor-text hover:border-border-light focus:outline-none focus:border-accent transition-colors"
                      >
                        <Markdown content={description} />
                      </div>
                    )}
                  </Field>
                )}

                {/* Optional Fields - shown when expanded */}
                {expandedFields.coverImage && (
                  <Field className="mb-5">
                    <Label className="block text-sm font-medium text-text-secondary mb-2">
                      Cover Image URL
                    </Label>
                    {coverImageUrl.startsWith('data:') ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-4 py-2.5 rounded-xl bg-bg-tertiary border border-border text-text-muted text-sm">
                          Base64 image data
                        </div>
                        <button
                          ref={coverImageClearRef}
                          onClick={() => {
                            setCoverImageUrl('');
                            // Move focus to cover image input after clear (it will appear after state update)
                            setTimeout(() => coverImageRef.current?.focus(), 0);
                          }}
                          
                          className="px-3 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-hover border border-border text-text-muted hover:text-text-primary text-sm transition-colors focus:outline-none focus:border-accent"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <PhotoIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                        <Input
                          ref={coverImageRef}
                          type="url"
                          value={coverImageUrl}
                          onChange={(e) => setCoverImageUrl(e.target.value)}
                          
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-tertiary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent data-focus:border-accent text-sm"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    )}
                  </Field>
                )}

                {expandedFields.dueDate && (
                  <div className="mb-5">
                    <DatePicker
                      ref={dueDateButtonRef}
                      value={dueDate}
                      onChange={setDueDate}
                      label="Due Date"
                      
                      onCalendarOpenChange={setIsCalendarOpen}
                      autoOpen={autoOpenCalendar}
                      clearButtonRef={dueDateClearRef}
                      onClear={() => {
                        // Move focus to due date button after clear
                        setTimeout(() => dueDateButtonRef.current?.focus(), 0);
                      }}
                    />
                  </div>
                )}

                {expandedFields.link && (
                  <Field className="mb-5">
                    <Label className="block text-sm font-medium text-text-secondary mb-2">
                      Link
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                        <Input
                          ref={linkInputRef}
                          type="url"
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                          
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-tertiary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent data-focus:border-accent text-sm"
                          placeholder="Add a link (Jira, GitHub, etc.)"
                        />
                      </div>
                      {link && getSafeHref(link) && (
                        <a
                          ref={linkOpenRef}
                          href={getSafeHref(link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-hover border border-border text-text-muted hover:text-text-primary text-sm transition-colors focus:outline-none focus:border-accent flex items-center gap-1.5"
                        >
                          <LinkIcon className="w-4 h-4" />
                          Open
                        </a>
                      )}
                    </div>
                  </Field>
                )}

                {/* Collapsed "Add" buttons for optional fields */}
                {(!expandedFields.description || !expandedFields.coverImage || !expandedFields.dueDate || !expandedFields.link) && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {!expandedFields.description && (
                      <button
                        ref={addDescriptionRef}
                        onClick={() => {
                          expandField('description');
                          setTimeout(() => descriptionRef.current?.focus(), 50);
                        }}
                        
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            expandField('description');
                            setTimeout(() => descriptionRef.current?.focus(), 50);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-hover border border-border text-text-muted hover:text-text-primary text-xs transition-colors focus:outline-none focus:border-accent select-none"
                      >
                        <Bars3BottomLeftIcon className="w-3.5 h-3.5" />
                        Add description
                      </button>
                    )}
                    {!expandedFields.coverImage && (
                      <button
                        ref={addCoverImageRef}
                        onClick={() => {
                          expandField('coverImage');
                          setTimeout(() => coverImageRef.current?.focus(), 50);
                        }}
                        
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            expandField('coverImage');
                            setTimeout(() => coverImageRef.current?.focus(), 50);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-hover border border-border text-text-muted hover:text-text-primary text-xs transition-colors focus:outline-none focus:border-accent select-none"
                      >
                        <PhotoIcon className="w-3.5 h-3.5" />
                        Add cover image
                      </button>
                    )}
                    {!expandedFields.dueDate && (
                      <button
                        ref={addDueDateRef}
                        onClick={() => {
                          setAutoOpenCalendar(true);
                          expandField('dueDate');
                        }}
                        
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setAutoOpenCalendar(true);
                            expandField('dueDate');
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-hover border border-border text-text-muted hover:text-text-primary text-xs transition-colors focus:outline-none focus:border-accent select-none"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Add due date
                      </button>
                    )}
                    {!expandedFields.link && (
                      <button
                        ref={addLinkRef}
                        onClick={() => {
                          expandField('link');
                          setTimeout(() => linkInputRef.current?.focus(), 50);
                        }}
                        
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            expandField('link');
                            setTimeout(() => linkInputRef.current?.focus(), 50);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-hover border border-border text-text-muted hover:text-text-primary text-xs transition-colors focus:outline-none focus:border-accent select-none"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Add link
                      </button>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between pt-5 border-t border-border">
                  {!isNew ? (
                    <Button
                      onClick={handleDeleteWithConfirm}
                      className="px-4 py-2.5 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-danger/50"
                    >
                      Delete
                      <span className="ml-2 text-danger/60 text-xs">Shift+Backspace</span>
                    </Button>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleClose}
                      className="px-4 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-glow/50"
                    >
                      Close
                      <span className="ml-2 text-text-muted text-xs">Esc</span>
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={!title.trim()}
                      className="px-5 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-hover border border-border text-text-primary text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-glow/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bg-tertiary"
                    >
                      Save
                      <span className="ml-2 text-text-muted text-xs">Shift+Enter</span>
                    </Button>
                  </div>
                </div>

                {/* Metadata - only show for existing cards */}
                {!isNew && (
                  <div className="flex justify-end items-center gap-3 text-[9px] text-text-muted/60 pt-3">
                    <span className="flex items-center gap-0.5" title="Created">
                      <ClockIcon className="w-2.5 h-2.5" />
                      {new Date(card.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-0.5" title="Last updated">
                      <ArrowPathIcon className="w-2.5 h-2.5" />
                      {new Date(card.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </Dialog>

      {/* Unsaved changes warning */}
      {showUnsavedWarning && (
        <ConfirmDialog
          title="Unsaved Changes"
          message="You have unsaved changes. Are you sure you want to discard them?"
          confirmLabel="Discard"
          danger={true}
          onConfirm={handleDiscard}
          onCancel={() => setShowUnsavedWarning(false)}
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Card"
          message={`Are you sure you want to delete "${card.title}"?\nThis action cannot be undone.`}
          confirmLabel="Delete"
          danger={true}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
