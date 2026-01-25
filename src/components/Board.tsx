import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Field, Input } from '@headlessui/react';
import { PlusIcon } from '@heroicons/react/16/solid';
import { useBoardStore } from '../store';
import { useCardFocusStore, useIsAddListFocused } from '../store/cardFocus';
import { useThemeStore } from '../store/theme';
import { scrollIntoViewHorizontal } from '../utils/scroll';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { List } from './List';
import { CardPreview } from './Card';
import { CardModal } from './CardModal';
import { ConfirmDialog } from './ConfirmDialog';
import { Tooltip } from './Tooltip';
import type { Card as CardType, List as ListType } from '../types';

interface BoardProps {
  keyboardShortcutsEnabled?: boolean;
}

export function Board({ keyboardShortcutsEnabled = true }: BoardProps) {
  const activeProjectId = useBoardStore((s) => s.activeProjectId);
  const projects = useBoardStore((s) => s.projects);
  const lists = useBoardStore((s) => s.lists);
  const cards = useBoardStore((s) => s.cards);
  const createList = useBoardStore((s) => s.createList);
  const createCard = useBoardStore((s) => s.createCard);
  const deleteCard = useBoardStore((s) => s.deleteCard);
  const deleteList = useBoardStore((s) => s.deleteList);
  const moveCard = useBoardStore((s) => s.moveCard);
  const moveList = useBoardStore((s) => s.moveList);

  // Update document title based on current project
  const currentProject = projects.find((p) => p.id === activeProjectId);
  useEffect(() => {
    document.title = currentProject ? currentProject.name : 'Board';
  }, [currentProject]);
  
  const clearFocus = useCardFocusStore((s) => s.clearFocus);
  const isAddListFocused = useIsAddListFocused();
  const dueDateWarningDays = useThemeStore((s) => s.dueDateWarningDays);
  const showFavicons = useThemeStore((s) => s.showFavicons);

  const addListButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll add list button into view when focused
  useEffect(() => {
    if (isAddListFocused && addListButtonRef.current) {
      scrollIntoViewHorizontal(addListButtonRef.current);
    }
  }, [isAddListFocused]);

  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [activeList, setActiveList] = useState<ListType | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newCardId, setNewCardId] = useState<string | null>(null);
  const [keyboardOpenCardId, setKeyboardOpenCardId] = useState<string | null>(null);
  const [deleteConfirmCardId, setDeleteConfirmCardId] = useState<string | null>(null);
  const [deleteConfirmListId, setDeleteConfirmListId] = useState<string | null>(null);

  const projectLists = useMemo(
    () =>
      lists
        .filter((l) => l.projectId === activeProjectId)
        .sort((a, b) => a.position - b.position),
    [lists, activeProjectId]
  );

  // Keyboard shortcuts
  const handleNewCard = useCallback(() => {
    if (projectLists.length > 0) {
      const cardId = createCard(projectLists[0].id, '', '');
      setNewCardId(cardId);
    }
  }, [projectLists, createCard]);

  const handleNewCardInList = useCallback((listId: string, position?: number) => {
    const cardId = createCard(listId, '', '', position);
    setNewCardId(cardId);
  }, [createCard]);

  const handleOpenCard = useCallback((cardId: string) => {
    setKeyboardOpenCardId(cardId);
  }, []);

  const handleDeleteCard = useCallback((cardId: string) => {
    setDeleteConfirmCardId(cardId);
  }, []);

  const handleDeleteList = useCallback((listId: string) => {
    setDeleteConfirmListId(listId);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmCardId) {
      deleteCard(deleteConfirmCardId);
      clearFocus();
      setDeleteConfirmCardId(null);
    }
  }, [deleteConfirmCardId, deleteCard, clearFocus]);

  const handleConfirmDeleteList = useCallback(() => {
    if (deleteConfirmListId) {
      deleteList(deleteConfirmListId);
      clearFocus();
      setDeleteConfirmListId(null);
    }
  }, [deleteConfirmListId, deleteList, clearFocus]);

  useKeyboardShortcuts({
    enabled: keyboardShortcutsEnabled,
    onNewCard: handleNewCard,
    onNewCardInList: handleNewCardInList,
    onOpenCard: handleOpenCard,
    onDeleteCard: handleDeleteCard,
    onDeleteList: handleDeleteList,
  });

  const handleKeyboardModalClose = useCallback(() => {
    setKeyboardOpenCardId(null);
  }, []);

  // Get the newly created card from the store
  const newCard = newCardId ? cards.find((c) => c.id === newCardId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'card') {
      const card = active.data.current.card as CardType;
      setActiveCard(card);
      setActiveList(null);
    } else if (active.data.current?.type === 'list') {
      setActiveList(active.data.current.list);
      setActiveCard(null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'card') {
      const activeCardId = active.id as string;
      // Get current card state from store, not from stale drag data
      const currentCard = cards.find((c) => c.id === activeCardId);
      if (!currentCard) return;

      let targetListId: string | null = null;
      let targetIndex = 0;

      if (overType === 'list') {
        // Dropping on empty area of list - extract list id from droppable id
        const overId = over.id as string;
        targetListId = overId.startsWith('droppable-') ? overId.replace('droppable-', '') : overId;
        const listCards = cards
          .filter((c) => c.listId === targetListId && c.id !== activeCardId)
          .sort((a, b) => a.position - b.position);
        targetIndex = listCards.length; // End of list
      } else if (overType === 'card') {
        const overCard = over.data.current?.card as CardType;
        targetListId = overCard.listId;
        const listCards = cards
          .filter((c) => c.listId === targetListId && c.id !== activeCardId)
          .sort((a, b) => a.position - b.position);
        const overIndex = listCards.findIndex((c) => c.id === overCard.id);
        targetIndex = overIndex >= 0 ? overIndex : listCards.length;
      }

      if (targetListId) {
        // Move card immediately when crossing lists
        if (currentCard.listId !== targetListId) {
          moveCard(activeCardId, targetListId, targetIndex);
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Clear drag state
    setActiveCard(null);
    setActiveList(null);

    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    // Handle list reordering
    if (activeType === 'list') {
      const activeListId = active.id as string;
      let targetPosition = 0;

      if (overType === 'list') {
        const overList = over.data.current?.list as ListType;
        targetPosition = projectLists.findIndex((l) => l.id === overList.id);
      }

      if (activeListId !== over.id) {
        moveList(activeListId, targetPosition);
      }
      return;
    }

    // Handle card reordering within same list
    if (activeType === 'card' && overType === 'card') {
      const activeCardId = active.id as string;
      const overCardId = over.id as string;

      if (activeCardId !== overCardId) {
        // Get fresh card data from store to avoid stale listId
        const currentOverCard = cards.find((c) => c.id === overCardId);
        if (!currentOverCard) return;
        
        const listCards = cards
          .filter((c) => c.listId === currentOverCard.listId)
          .sort((a, b) => a.position - b.position);
        const newPosition = listCards.findIndex((c) => c.id === overCardId);
        moveCard(activeCardId, currentOverCard.listId, newPosition);
      }
    }
  };

  const handleCreateList = () => {
    if (newListName.trim() && activeProjectId) {
      createList(activeProjectId, newListName.trim());
      setNewListName('');
      setShowNewList(false);
    }
  };

  if (!activeProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted">No project selected</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="min-w-fit min-h-full p-8 pl-[max(env(safe-area-inset-left),2rem)] pr-[max(env(safe-area-inset-right),2rem)] flex items-center justify-center">
            {/* Container that grows horizontally */}
            <div className="flex gap-6 items-start">
              <SortableContext
                items={projectLists.map((l) => l.id)}
                strategy={horizontalListSortingStrategy}
              >
                {projectLists.map((list) => {
                  const listCards = cards
                    .filter((c) => c.listId === list.id)
                    .sort((a, b) => a.position - b.position);
                  return (
                    <List
                      key={list.id}
                      list={list}
                      cards={listCards}
                      keyboardOpenCardId={keyboardOpenCardId}
                      onKeyboardModalClose={handleKeyboardModalClose}
                    />
                  );
                })}
              </SortableContext>

              {/* Add list button */}
              {showNewList ? (
                <div className="flex-shrink-0 w-80">
                  <div className="bg-bg-secondary rounded-xl border border-border p-4">
                    <Field>
                      <Input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateList();
                          if (e.key === 'Escape') {
                            setShowNewList(false);
                            setNewListName('');
                          }
                        }}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent data-focus:border-accent"
                        placeholder="List name"
                        autoFocus
                      />
                    </Field>
                    <div className="flex gap-2 mt-3">
                      <Tooltip content="Create the list" shortcut="Enter" position="bottom">
                        <button
                          onClick={handleCreateList}
                          disabled={!newListName.trim()}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-bg-tertiary hover:bg-bg-hover border border-border disabled:opacity-50 disabled:cursor-not-allowed text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-glow/50 focus:border-glow/50"
                        >
                          Add List
                        </button>
                      </Tooltip>
                      <Tooltip content="Cancel" shortcut="Esc" position="bottom">
                        <button
                          onClick={() => {
                            setShowNewList(false);
                            setNewListName('');
                          }}
                          className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors focus:outline-none focus:ring-1 focus:ring-glow/50"
                        >
                          Cancel
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-shrink-0 flex flex-col items-center gap-3">
                  <Tooltip content="Add list" position="bottom">
                    <button
                      ref={addListButtonRef}
                      onClick={() => setShowNewList(true)}
                      aria-label="Add list"
                      className={`w-12 h-12 flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary transition-all border bg-bg-secondary/50 hover:bg-bg-secondary ${
                        isAddListFocused 
                          ? 'border-glow ring-1 ring-glow/50 text-text-primary' 
                          : 'border-transparent'
                      }`}
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </Tooltip>
                  {projectLists.length === 0 && (
                    <p className="text-text-muted text-sm text-center max-w-48">
                      Add your first list to get started. See shortcuts below.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeCard && <CardPreview card={activeCard} dueDateWarningDays={dueDateWarningDays} showFavicons={showFavicons} />}
          {activeList && (
            <div className="bg-bg-secondary rounded-xl border border-accent p-4 w-80 opacity-95 rotate-1 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-text-primary">{activeList.name}</h3>
                <span className="text-xs text-text-muted px-2 py-0.5 bg-bg-tertiary rounded-full">
                  {cards.filter((c) => c.listId === activeList.id).length}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>

        {/* New card modal (from keyboard shortcut) */}
        {newCard && (
          <CardModal card={newCard} onClose={() => setNewCardId(null)} isNew={true} />
        )}

        {/* Delete card confirmation */}
        {deleteConfirmCardId && (
          <ConfirmDialog
            title="Delete Card"
            message={`Are you sure you want to delete "${cards.find(c => c.id === deleteConfirmCardId)?.title ?? 'this card'}"?\nThis action cannot be undone.`}
            confirmLabel="Delete"
            danger={true}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteConfirmCardId(null)}
          />
        )}

        {/* Delete list confirmation */}
        {deleteConfirmListId && (
          <ConfirmDialog
            title="Delete List"
            message={`Are you sure you want to delete "${lists.find(l => l.id === deleteConfirmListId)?.name ?? 'this list'}" and all its cards?\nThis action cannot be undone.`}
            confirmLabel="Delete"
            danger={true}
            onConfirm={handleConfirmDeleteList}
            onCancel={() => setDeleteConfirmListId(null)}
          />
        )}
      </DndContext>
  );
}
