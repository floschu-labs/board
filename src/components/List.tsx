import { useState, useRef, useEffect, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PlusIcon } from '@heroicons/react/16/solid';
import type { List as ListType, Card as CardType } from '../types';
import { useBoardStore } from '../store';
import { useFocusedListId } from '../store/cardFocus';
import { scrollIntoViewHorizontal } from '../utils/scroll';
import { Card } from './Card';
import { CardModal } from './CardModal';
import { ContextMenu, useContextMenu } from './ContextMenu';
import { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';
import { RenameDialog, useRenameDialog } from './RenameDialog';
import { Tooltip } from './Tooltip';

interface ListProps {
  list: ListType;
  cards: CardType[];
  keyboardOpenCardId?: string | null;
  onKeyboardModalClose?: () => void;
}

export function List({ 
  list, 
  cards, 
  keyboardOpenCardId, 
  onKeyboardModalClose,
}: ListProps) {
  const updateList = useBoardStore((s) => s.updateList);
  const deleteList = useBoardStore((s) => s.deleteList);
  const createCard = useBoardStore((s) => s.createCard);
  const storeCards = useBoardStore((s) => s.cards);
  
  const focusedListId = useFocusedListId();
  const isFocused = focusedListId === list.id;

  const [newCardId, setNewCardId] = useState<string | null>(null);
  const [showGradient, setShowGradient] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll list into view horizontally when focused
  useEffect(() => {
    if (isFocused && listRef.current) {
      scrollIntoViewHorizontal(listRef.current);
    }
  }, [isFocused]);

  const checkScrollGradient = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isScrollable = scrollHeight > clientHeight;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
    
    setShowGradient(isScrollable && !isAtBottom);
  }, []);

  // Check scroll gradient on cards change
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Use requestAnimationFrame to defer state update and avoid cascading renders
    const rafId = requestAnimationFrame(() => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isScrollable = scrollHeight > clientHeight;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      setShowGradient(isScrollable && !isAtBottom);
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [cards.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver(checkScrollGradient);
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, [checkScrollGradient]);

  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const { dialog, showConfirm, hideConfirm, handleConfirm } = useConfirmDialog();
  const { dialog: renameDialog, showRename, hideRename, handleConfirm: handleRenameConfirm } = useRenameDialog();

  // Make list sortable (for drag-and-drop reordering)
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: { type: 'list', list },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Make list a drop target for cards
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${list.id}`,
    data: { type: 'list', list },
  });

  const handleAddCard = () => {
    // Create a new card with default title and immediately open modal
    const cardId = createCard(list.id, '', '');
    setNewCardId(cardId);
  };

  const handleCloseNewCardModal = () => {
    setNewCardId(null);
  };

  // Get the newly created card from the store
  const newCard = newCardId ? storeCards.find((c) => c.id === newCardId) : null;

  const handleHeaderRightClick = (e: React.MouseEvent) => {
    showContextMenu(e, [
      {
        label: 'Rename',
        description: 'Change the list name',
        onClick: () => {
          showRename({
            title: 'Rename List',
            currentName: list.name,
            onConfirm: (newName) => updateList(list.id, { name: newName }),
          });
        },
      },
      {
        label: 'Delete',
        description: 'Remove list and all its cards',
        danger: true,
        onClick: () => {
          showConfirm({
            title: 'Delete List',
            message: `Are you sure you want to delete "${list.name}" and all its cards?\nThis action cannot be undone.`,
            confirmLabel: 'Delete',
            danger: true,
            onConfirm: () => deleteList(list.id),
          });
        },
      },
    ]);
  };

  // Show cards container if there are cards
  const showCardsContainer = cards.length > 0;

  return (
    <>
      <div
        ref={(node) => {
          setSortableRef(node);
          (listRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        style={style}
        className={`flex-shrink-0 w-80 ${isDragging ? 'opacity-50' : ''}`}
      >
        <div
          className={`bg-bg-secondary rounded-xl border flex flex-col max-h-[calc(100vh-10rem)] transition-colors relative ${
            isFocused 
              ? 'ring-1 ring-glow/50 border-glow/50' 
              : isOver 
                ? 'border-accent' 
                : 'border-border'
          }`}
        >
          {/* Header - draggable handle */}
          <div
            {...attributes}
            {...listeners}
            className={`flex items-center justify-between px-3 py-2.5 cursor-grab active:cursor-grabbing rounded-t-xl ${
              showCardsContainer ? 'border-b border-border' : ''
            }`}
            onContextMenu={handleHeaderRightClick}
          >
            <span
              className="flex-1 text-text-primary font-semibold text-base truncate"
              onDoubleClick={(e) => {
                e.stopPropagation();
                showRename({
                  title: 'Rename List',
                  currentName: list.name,
                  onConfirm: (newName) => updateList(list.id, { name: newName }),
                });
              }}
            >
              {list.name}
            </span>

            <div className="flex items-center gap-1">
              <span className="text-xs text-text-muted px-2 py-0.5 bg-bg-tertiary rounded-full cursor-default">
                {cards.length}
              </span>
              <Tooltip content="Add card" shortcut="n" position="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddCard();
                  }}
                  aria-label="Add card"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Cards container */}
          {showCardsContainer && (
            <div
              ref={(node) => {
                setDroppableRef(node);
                (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
              }}
              data-list-id={list.id}
              onScroll={checkScrollGradient}
              className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3"
            >
              <div className="flex flex-col gap-3">
                <SortableContext
                  items={cards.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {cards.map((card) => (
                    <Card
                      key={card.id}
                      card={card}
                      isOpenedByKeyboard={keyboardOpenCardId === card.id}
                      onModalClose={onKeyboardModalClose}
                    />
                  ))}
                </SortableContext>
              </div>
            </div>
          )}
          {/* Hidden drop target for empty lists */}
          {!showCardsContainer && (
            <div ref={setDroppableRef} className="h-0" />
          )}
          
          {/* Gradient fade overlay at bottom */}
          {showGradient && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-bg-secondary via-bg-secondary/80 to-transparent pointer-events-none rounded-b-xl" />
          )}
        </div>
      </div>

      {/* New card modal */}
      {newCard && (
        <CardModal card={newCard} onClose={handleCloseNewCardModal} isNew={true} />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={hideContextMenu}
        />
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

      {renameDialog && (
        <RenameDialog
          title={renameDialog.title}
          currentName={renameDialog.currentName}
          onConfirm={handleRenameConfirm}
          onCancel={hideRename}
        />
      )}
    </>
  );
}
