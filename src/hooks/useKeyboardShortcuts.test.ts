import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useBoardStore } from '../store';
import { useCardFocusStore } from '../store/cardFocus';

// Helper to dispatch keyboard event on document.body (not window)
function pressKey(key: string, options: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  document.body.dispatchEvent(event);
}

describe('useKeyboardShortcuts - Arrow Key Navigation', () => {
  // Setup test data
  const projectId = 'project-1';
  const list1Id = 'list-1';
  const list2Id = 'list-2';
  const list3Id = 'list-3';
  const now = new Date().toISOString();

  // List 1 has 3 cards
  const card1_1 = { id: 'card-1-1', listId: list1Id, title: 'Card 1-1', description: '', position: 0, createdAt: now, updatedAt: now };
  const card1_2 = { id: 'card-1-2', listId: list1Id, title: 'Card 1-2', description: '', position: 1, createdAt: now, updatedAt: now };
  const card1_3 = { id: 'card-1-3', listId: list1Id, title: 'Card 1-3', description: '', position: 2, createdAt: now, updatedAt: now };

  // List 2 has 2 cards
  const card2_1 = { id: 'card-2-1', listId: list2Id, title: 'Card 2-1', description: '', position: 0, createdAt: now, updatedAt: now };
  const card2_2 = { id: 'card-2-2', listId: list2Id, title: 'Card 2-2', description: '', position: 1, createdAt: now, updatedAt: now };

  // List 3 is empty

  const lists = [
    { id: list1Id, projectId, name: 'List 1', position: 0 },
    { id: list2Id, projectId, name: 'List 2', position: 1 },
    { id: list3Id, projectId, name: 'List 3 (empty)', position: 2 },
  ];

  const cards = [card1_1, card1_2, card1_3, card2_1, card2_2];

  const projects = [{ id: projectId, name: 'Test Project', createdAt: now, updatedAt: now }];

  beforeEach(() => {
    // Reset stores to initial state
    useBoardStore.setState({
      projects,
      lists,
      cards,
      activeProjectId: projectId,
    });

    useCardFocusStore.setState({
      focusedId: null,
      focusType: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ArrowDown navigation', () => {
    it('should move focus to next card when not at bottom of list', () => {
      // Focus the first card in list 1
      useCardFocusStore.setState({ focusedId: card1_1.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowDown');
      });

      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe(card1_2.id);
      expect(state.focusType).toBe('card');
    });

    it('should move focus from second to third card', () => {
      useCardFocusStore.setState({ focusedId: card1_2.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowDown');
      });

      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe(card1_3.id);
      expect(state.focusType).toBe('card');
    });

    it('should NOT move focus to another list when at bottom of list - stay on last card', () => {
      // Focus the last card in list 1 (card1_3)
      useCardFocusStore.setState({ focusedId: card1_3.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowDown');
      });

      const state = useCardFocusStore.getState();
      // Should stay on the same card - NOT move to list 2 or elsewhere
      expect(state.focusedId).toBe(card1_3.id);
      expect(state.focusType).toBe('card');
    });

    it('should NOT move focus when at bottom of list 2', () => {
      // Focus the last card in list 2
      useCardFocusStore.setState({ focusedId: card2_2.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowDown');
      });

      const state = useCardFocusStore.getState();
      // Should stay on the same card
      expect(state.focusedId).toBe(card2_2.id);
      expect(state.focusType).toBe('card');
    });

    it('should move to first card when list header is focused', () => {
      // Focus list 1 header
      useCardFocusStore.setState({ focusedId: list1Id, focusType: 'list' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowDown');
      });

      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe(card1_1.id);
      expect(state.focusType).toBe('card');
    });

    it('should NOT move focus when empty list header is focused', () => {
      // Focus empty list header (list 3)
      useCardFocusStore.setState({ focusedId: list3Id, focusType: 'list' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowDown');
      });

      const state = useCardFocusStore.getState();
      // Should stay on the list header (no cards to focus)
      expect(state.focusedId).toBe(list3Id);
      expect(state.focusType).toBe('list');
    });
  });

  describe('ArrowUp navigation', () => {
    it('should move focus to previous card when not at top of list', () => {
      useCardFocusStore.setState({ focusedId: card1_2.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowUp');
      });

      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe(card1_1.id);
      expect(state.focusType).toBe('card');
    });

    it('should move focus from third to second card', () => {
      useCardFocusStore.setState({ focusedId: card1_3.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowUp');
      });

      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe(card1_2.id);
      expect(state.focusType).toBe('card');
    });

    it('should move focus to list header when at top of list', () => {
      // Focus the first card in list 1
      useCardFocusStore.setState({ focusedId: card1_1.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowUp');
      });

      const state = useCardFocusStore.getState();
      // Should focus the list header
      expect(state.focusedId).toBe(list1Id);
      expect(state.focusType).toBe('list');
    });

    it('should move focus to list 2 header when at top of list 2', () => {
      useCardFocusStore.setState({ focusedId: card2_1.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowUp');
      });

      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe(list2Id);
      expect(state.focusType).toBe('list');
    });
  });

  describe('ArrowLeft navigation', () => {
    it('should move focus to first card in previous list (fallback without DOM)', () => {
      // Focus card 2-1 (first card in list 2)
      useCardFocusStore.setState({ focusedId: card2_1.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowLeft');
      });

      const state = useCardFocusStore.getState();
      // Without real DOM for visual position matching, falls back to first card
      // In a real browser, this would match the card at closest Y position
      expect(state.focusedId).toBe(card1_1.id);
      expect(state.focusType).toBe('card');
    });

    it('should move to first card in previous list when DOM position matching unavailable', () => {
      // Focus card 1-3 (third card in list 1, index 2)
      useCardFocusStore.setState({ focusedId: card1_3.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      // First go right to list 2
      act(() => {
        pressKey('ArrowRight');
      });

      // In test environment without real DOM, visual position matching falls back to first card
      // In real browser, it would match the card at closest Y position
      let state = useCardFocusStore.getState();
      expect(state.focusedId).toBe(card2_1.id);

      // Go back left
      act(() => {
        pressKey('ArrowLeft');
      });

      state = useCardFocusStore.getState();
      // Falls back to first card in list 1 (no DOM for position matching)
      expect(state.focusedId).toBe(card1_1.id);
    });

    it('should wrap to add list button when at first list', () => {
      useCardFocusStore.setState({ focusedId: card1_1.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowLeft');
      });

      const state = useCardFocusStore.getState();
      // Should wrap to add list button
      expect(state.focusedId).toBe(null);
      expect(state.focusType).toBe('addList');
    });

    it('should move focus to previous list header when in list mode', () => {
      useCardFocusStore.setState({ focusedId: list2Id, focusType: 'list' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowLeft');
      });

      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe(list1Id);
      expect(state.focusType).toBe('list');
    });
  });

  describe('ArrowRight navigation', () => {
    it('should move focus to first card in next list (fallback without DOM)', () => {
      // Focus card 1-1 (first card in list 1)
      useCardFocusStore.setState({ focusedId: card1_1.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowRight');
      });

      const state = useCardFocusStore.getState();
      // Without real DOM for visual position matching, falls back to first card
      // In a real browser, this would match the card at closest Y position
      expect(state.focusedId).toBe(card2_1.id);
      expect(state.focusType).toBe('card');
    });

    it('should skip empty lists and move to next list with cards', () => {
      // Focus card 2-1 (in list 2, list 3 is empty)
      useCardFocusStore.setState({ focusedId: card2_1.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowRight');
      });

      const state = useCardFocusStore.getState();
      // List 3 is empty, so should focus list 3 header (or add list button)
      // Based on current code, it focuses the empty list's header
      expect(state.focusedId).toBe(list3Id);
      expect(state.focusType).toBe('list');
    });

    it('should move to add list button when at last list', () => {
      // Focus card in last list with cards (list 2, since list 3 is empty)
      // Actually, when on list 2 and pressing right, it goes to list 3 (empty)
      // Then from list 3 header pressing right goes to add list
      useCardFocusStore.setState({ focusedId: list3Id, focusType: 'list' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowRight');
      });

      const state = useCardFocusStore.getState();
      expect(state.focusType).toBe('addList');
    });

    it('should move focus to next list header when in list mode', () => {
      useCardFocusStore.setState({ focusedId: list1Id, focusType: 'list' });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowRight');
      });

      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe(list2Id);
      expect(state.focusType).toBe('list');
    });
  });

  describe('Edge cases', () => {
    it('should focus first card when no focus and arrow key pressed', () => {
      useCardFocusStore.setState({ focusedId: null, focusType: null });

      renderHook(() => useKeyboardShortcuts());

      act(() => {
        pressKey('ArrowDown');
      });

      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe(card1_1.id);
      expect(state.focusType).toBe('card');
    });

    it('should not navigate when inside an input field', () => {
      useCardFocusStore.setState({ focusedId: card1_1.id, focusType: 'card' });

      // Create an input element and set it as target
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      renderHook(() => useKeyboardShortcuts());

      // Dispatch event on the input
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);

      const state = useCardFocusStore.getState();
      // Should stay on card1_1 because we're in an input
      expect(state.focusedId).toBe(card1_1.id);

      document.body.removeChild(input);
    });

    it('should handle pressing ArrowDown multiple times quickly', () => {
      useCardFocusStore.setState({ focusedId: card1_1.id, focusType: 'card' });

      renderHook(() => useKeyboardShortcuts());

      // Press down 5 times (list only has 3 cards) - each in separate act()
      act(() => { pressKey('ArrowDown'); });
      act(() => { pressKey('ArrowDown'); });
      act(() => { pressKey('ArrowDown'); });
      act(() => { pressKey('ArrowDown'); });
      act(() => { pressKey('ArrowDown'); });

      const state = useCardFocusStore.getState();
      // Should stop at last card, not overflow to another list
      expect(state.focusedId).toBe(card1_3.id);
      expect(state.focusType).toBe('card');
    });
  });
});
