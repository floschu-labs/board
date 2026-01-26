import { useEffect, useCallback } from 'react';
import { useBoardStore } from '../store';
import { useCardFocusStore } from '../store/cardFocus';
import type { Card } from '../types';

interface KeyboardShortcutsOptions {
  enabled?: boolean;
  onNewCard?: () => void;
  onNewCardInList?: (listId: string, position?: number) => void;
  onNewList?: () => void;
  onOpenCard?: (cardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  onDeleteList?: (listId: string) => void;
}

/**
 * Find the card in the target list that is visually closest to the focused card's Y position.
 * Returns the matched card and its index (for insertion position).
 * If equidistant between two cards, prefers the lower one (higher index).
 */
function findCardAtVisualPosition(
  focusedCardId: string,
  targetListId: string,
  targetListCards: Card[]
): { card: Card; index: number } | null {
  if (targetListCards.length === 0) return null;

  // Get focused card's DOM element and its center Y position
  const focusedEl = document.querySelector(`[data-card-id="${focusedCardId}"]`);
  if (!focusedEl) return null;

  const focusedRect = focusedEl.getBoundingClientRect();
  const focusedCenterY = focusedRect.top + focusedRect.height / 2;

  // Get target list's cards container
  const targetContainer = document.querySelector(`[data-list-id="${targetListId}"]`);
  if (!targetContainer) return null;

  // Find the card with the closest center Y position
  let closestCard = targetListCards[0];
  let closestIndex = 0;
  let closestDistance = Infinity;

  targetListCards.forEach((card, index) => {
    const cardEl = targetContainer.querySelector(`[data-card-id="${card.id}"]`);
    if (!cardEl) return;

    const rect = cardEl.getBoundingClientRect();
    const cardCenterY = rect.top + rect.height / 2;
    const distance = Math.abs(cardCenterY - focusedCenterY);

    // If equal distance, prefer the lower card (higher index) - use < instead of <=
    if (distance < closestDistance) {
      closestDistance = distance;
      closestCard = card;
      closestIndex = index;
    }
  });

  return { card: closestCard, index: closestIndex };
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const activeProjectId = useBoardStore((s) => s.activeProjectId);
  const lists = useBoardStore((s) => s.lists);
  const cards = useBoardStore((s) => s.cards);
  const projects = useBoardStore((s) => s.projects);
  const setActiveProject = useBoardStore((s) => s.setActiveProject);
  const moveCard = useBoardStore((s) => s.moveCard);
  const moveList = useBoardStore((s) => s.moveList);
  
  const {
    focusedId,
    focusType,
    setFocusedCard,
    setFocusedList,
    setFocusedAddList,
    clearFocus,
  } = useCardFocusStore();

  // Get project lists sorted by position
  const getProjectLists = useCallback(() => {
    return lists
      .filter((l) => l.projectId === activeProjectId)
      .sort((a, b) => a.position - b.position);
  }, [lists, activeProjectId]);

  // Get sorted cards for the current project organized by lists
  const getNavigableCards = useCallback(() => {
    const projectLists = getProjectLists();
    
    const cardsByList: { listId: string; cards: typeof cards }[] = [];
    
    for (const list of projectLists) {
      const listCards = cards
        .filter((c) => c.listId === list.id)
        .sort((a, b) => a.position - b.position);
      // Include empty lists too for navigation
      cardsByList.push({ listId: list.id, cards: listCards });
    }
    
    return cardsByList;
  }, [getProjectLists, cards]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip all keyboard handling when disabled (e.g., during onboarding)
      if (options.enabled === false) {
        return;
      }

      // Ignore shortcuts when typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement | null;
      const isInputField = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest?.('[role="dialog"]') // Also ignore when inside a modal dialog
      );
        
      if (isInputField) {
        return;
      }

      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      const projectLists = getProjectLists();
      const cardsByList = getNavigableCards();

      // Log arrow key presses with current focus state (dev only)
      if (import.meta.env.DEV && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        console.log('[Keyboard]', e.key, '| focusType:', focusType, '| focusedId:', focusedId, '| shift:', e.shiftKey);
      }

      // === GLOBAL SHORTCUTS (work regardless of focus state) ===

      // Shift+N - New list
      if (e.key === 'N' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        options.onNewList?.();
        return;
      }

      // n - New card (context-aware: based on current focus)
      if (e.key === 'n' && !hasModifier && !e.shiftKey) {
        e.preventDefault();
        
        // If a list is focused, create card at the start of that list
        if (focusType === 'list' && focusedId) {
          options.onNewCardInList?.(focusedId, 0);
          return;
        }
        
        // If a card is focused, create card below it in the same list
        if (focusType === 'card' && focusedId) {
          const focusedCard = cards.find((c) => c.id === focusedId);
          if (focusedCard) {
            const listCards = cards
              .filter((c) => c.listId === focusedCard.listId)
              .sort((a, b) => a.position - b.position);
            const currentIndex = listCards.findIndex((c) => c.id === focusedId);
            options.onNewCardInList?.(focusedCard.listId, currentIndex + 1);
            return;
          }
        }
        
        // Default: create in first list
        options.onNewCard?.();
        return;
      }

      // 1-9 - Switch to project by number
      if (!hasModifier && /^[1-9]$/.test(e.key)) {
        const projectIndex = parseInt(e.key) - 1;
        if (projectIndex < projects.length) {
          e.preventDefault();
          setActiveProject(projects[projectIndex].id);
        }
        return;
      }

      // === ADD LIST BUTTON FOCUS MODE ===
      if (focusType === 'addList') {
        // Arrow Left - Go back to last list
        if (e.key === 'ArrowLeft' && !hasModifier) {
          e.preventDefault();
          if (projectLists.length > 0) {
            setFocusedList(projectLists[projectLists.length - 1].id);
          } else {
            clearFocus();
          }
          return;
        }

        // Arrow Right - Wrap to first list
        if (e.key === 'ArrowRight' && !hasModifier) {
          e.preventDefault();
          if (projectLists.length > 0) {
            setFocusedList(projectLists[0].id);
          }
          return;
        }

        // Escape - Clear focus
        if (e.key === 'Escape' && !hasModifier) {
          e.preventDefault();
          clearFocus();
          return;
        }

        return;
      }

      // === LIST FOCUS MODE ===
      if (focusType === 'list' && focusedId) {
        const currentListIndex = projectLists.findIndex((l) => l.id === focusedId);
        if (currentListIndex === -1) {
          clearFocus();
          return;
        }

        // Shift+Backspace - Delete focused list (with confirmation)
        if (e.key === 'Backspace' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          options.onDeleteList?.(focusedId);
          return;
        }

        // Enter - Create new card in this list
        if (e.key === 'Enter' && !hasModifier) {
          e.preventDefault();
          options.onNewCardInList?.(focusedId);
          return;
        }

        // Shift + Arrow Left/Right - Move list
        if (['ArrowLeft', 'ArrowRight'].includes(e.key) && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          let targetPosition = currentListIndex;
          if (e.key === 'ArrowLeft' && currentListIndex > 0) {
            targetPosition = currentListIndex - 1;
          } else if (e.key === 'ArrowRight' && currentListIndex < projectLists.length - 1) {
            targetPosition = currentListIndex + 1;
          }
          if (targetPosition !== currentListIndex) {
            moveList(focusedId, targetPosition);
          }
          return;
        }

        // Arrow Left/Right - Navigate between lists
        if (['ArrowLeft', 'ArrowRight'].includes(e.key) && !hasModifier) {
          e.preventDefault();
          if (e.key === 'ArrowLeft') {
            if (currentListIndex > 0) {
              setFocusedList(projectLists[currentListIndex - 1].id);
            } else {
              // At first list, wrap to add list button
              setFocusedAddList();
            }
          } else if (e.key === 'ArrowRight') {
            if (currentListIndex < projectLists.length - 1) {
              setFocusedList(projectLists[currentListIndex + 1].id);
            } else {
              // At last list, go to add list button
              setFocusedAddList();
            }
          }
          return;
        }

        // Arrow Down - Focus first card in list
        if (e.key === 'ArrowDown' && !hasModifier) {
          e.preventDefault();
          const listData = cardsByList.find((l) => l.listId === focusedId);
          if (listData && listData.cards.length > 0) {
            setFocusedCard(listData.cards[0].id);
          }
          return;
        }

        // Escape - Clear focus
        if (e.key === 'Escape' && !hasModifier) {
          e.preventDefault();
          clearFocus();
          return;
        }

        return;
      }

      // === CARD FOCUS MODE ===
      
      // Shift + Arrow keys - Move focused card
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && focusType === 'card' && focusedId) {
        e.preventDefault();
        
        const focusedCard = cards.find((c) => c.id === focusedId);
        if (!focusedCard) return;
        
        const currentListIndex = projectLists.findIndex((l) => l.id === focusedCard.listId);
        if (currentListIndex === -1) return;

        const listCards = cards
          .filter((c) => c.listId === focusedCard.listId)
          .sort((a, b) => a.position - b.position);
        const currentCardIndex = listCards.findIndex((c) => c.id === focusedId);

        // Move card up/down within list
        if (e.key === 'ArrowUp' && currentCardIndex > 0) {
          moveCard(focusedId, focusedCard.listId, currentCardIndex - 1);
          return;
        }
        if (e.key === 'ArrowDown' && currentCardIndex < listCards.length - 1) {
          moveCard(focusedId, focusedCard.listId, currentCardIndex + 1);
          return;
        }

        // Move card left/right between lists using visual position matching
        if (e.key === 'ArrowLeft' && currentListIndex > 0) {
          const targetList = projectLists[currentListIndex - 1];
          const targetListCards = cards
            .filter((c) => c.listId === targetList.id)
            .sort((a, b) => a.position - b.position);
          
          let insertPosition = 0; // Default: top of list if empty
          if (targetListCards.length > 0) {
            const result = findCardAtVisualPosition(focusedId, targetList.id, targetListCards);
            if (result) {
              insertPosition = result.index;
            }
          }
          
          moveCard(focusedId, targetList.id, insertPosition);
          return;
        }
        if (e.key === 'ArrowRight' && currentListIndex < projectLists.length - 1) {
          const targetList = projectLists[currentListIndex + 1];
          const targetListCards = cards
            .filter((c) => c.listId === targetList.id)
            .sort((a, b) => a.position - b.position);
          
          let insertPosition = 0; // Default: top of list if empty
          if (targetListCards.length > 0) {
            const result = findCardAtVisualPosition(focusedId, targetList.id, targetListCards);
            if (result) {
              insertPosition = result.index;
            }
          }
          
          moveCard(focusedId, targetList.id, insertPosition);
          return;
        }
        return;
      }

      // Arrow key navigation (without shift)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !hasModifier) {
        e.preventDefault();
        
        // If nothing focused, focus first card or first list
        if (!focusedId && !focusType) {
          // Find first list with cards
          for (const listData of cardsByList) {
            if (listData.cards.length > 0) {
              setFocusedCard(listData.cards[0].id);
              return;
            }
          }
          // No cards, focus first list if available
          if (projectLists.length > 0) {
            setFocusedList(projectLists[0].id);
          }
          return;
        }

        // Card is focused
        if (focusType === 'card' && focusedId) {
          // Find current card position
          let currentListIndex = -1;
          let currentCardIndex = -1;
          
          for (let listIdx = 0; listIdx < cardsByList.length; listIdx++) {
            const cardIdx = cardsByList[listIdx].cards.findIndex((c) => c.id === focusedId);
            if (cardIdx !== -1) {
              currentListIndex = listIdx;
              currentCardIndex = cardIdx;
              break;
            }
          }
          
          if (currentListIndex === -1) {
            // Focused card not found, focus first card
            for (const listData of cardsByList) {
              if (listData.cards.length > 0) {
                setFocusedCard(listData.cards[0].id);
                return;
              }
            }
            return;
          }
          
          if (e.key === 'ArrowUp') {
            if (currentCardIndex > 0) {
              // Move to previous card in list
              setFocusedCard(cardsByList[currentListIndex].cards[currentCardIndex - 1].id);
            } else {
              // At top of list, focus the list itself
              setFocusedList(cardsByList[currentListIndex].listId);
            }
            return;
          }
          
          if (e.key === 'ArrowDown') {
            if (currentCardIndex < cardsByList[currentListIndex].cards.length - 1) {
              setFocusedCard(cardsByList[currentListIndex].cards[currentCardIndex + 1].id);
            }
            return;
          }
          
          if (e.key === 'ArrowLeft') {
            // Move to previous list - focus the list if empty, otherwise find card at visual position
            if (currentListIndex > 0) {
              const prevListData = cardsByList[currentListIndex - 1];
              if (prevListData.cards.length > 0) {
                const result = findCardAtVisualPosition(
                  focusedId,
                  prevListData.listId,
                  prevListData.cards
                );
                if (result) {
                  setFocusedCard(result.card.id);
                } else {
                  // Fallback to first card if DOM query fails
                  setFocusedCard(prevListData.cards[0].id);
                }
              } else {
                // Empty list - focus the list itself
                setFocusedList(prevListData.listId);
              }
            } else {
              // At first list, wrap to add list button
              setFocusedAddList();
            }
            return;
          }
          
          if (e.key === 'ArrowRight') {
            // Move to next list - focus the list if empty, otherwise find card at visual position
            if (currentListIndex < cardsByList.length - 1) {
              const nextListData = cardsByList[currentListIndex + 1];
              if (nextListData.cards.length > 0) {
                const result = findCardAtVisualPosition(
                  focusedId,
                  nextListData.listId,
                  nextListData.cards
                );
                if (result) {
                  setFocusedCard(result.card.id);
                } else {
                  // Fallback to first card if DOM query fails
                  setFocusedCard(nextListData.cards[0].id);
                }
              } else {
                // Empty list - focus the list itself
                setFocusedList(nextListData.listId);
              }
            } else {
              // At last list, go to add list button
              setFocusedAddList();
            }
            return;
          }
        }
        return;
      }

      // Shift+Enter - Open card's link (if it has one)
      if (e.key === 'Enter' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && focusType === 'card' && focusedId) {
        const focusedCard = cards.find((c) => c.id === focusedId);
        if (focusedCard?.link) {
          e.preventDefault();
          const url = focusedCard.link.startsWith('http') ? focusedCard.link : `https://${focusedCard.link}`;
          // Use anchor click to open in new tab (same as clicking link button)
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.click();
        }
        return;
      }

      // Enter - Open focused card
      if (e.key === 'Enter' && !hasModifier && !e.shiftKey && focusType === 'card' && focusedId) {
        e.preventDefault();
        options.onOpenCard?.(focusedId);
        return;
      }

      // Shift+Backspace - Delete focused card (with confirmation)
      if (e.key === 'Backspace' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && focusType === 'card' && focusedId) {
        e.preventDefault();
        options.onDeleteCard?.(focusedId);
        return;
      }

      // Escape - Clear focus (for card focus or any other state with focusedId)
      if (e.key === 'Escape' && !hasModifier && focusedId) {
        e.preventDefault();
        clearFocus();
        return;
      }
    },
    [cards, projects, setActiveProject, moveCard, moveList, options, focusedId, focusType, setFocusedCard, setFocusedList, setFocusedAddList, clearFocus, getProjectLists, getNavigableCards]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
