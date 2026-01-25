import { describe, it, expect, beforeEach } from 'vitest';
import { useCardFocusStore } from './cardFocus';

describe('cardFocus store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCardFocusStore.setState({ focusedId: null, focusType: null });
  });

  describe('initial state', () => {
    it('should start with null focusedId and focusType', () => {
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBeNull();
      expect(state.focusType).toBeNull();
    });
  });

  describe('setFocusedCard', () => {
    it('should set focusedId and focusType to card', () => {
      const { setFocusedCard } = useCardFocusStore.getState();
      
      setFocusedCard('card-123');
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe('card-123');
      expect(state.focusType).toBe('card');
    });

    it('should clear focus when called with null', () => {
      const { setFocusedCard } = useCardFocusStore.getState();
      
      setFocusedCard('card-123');
      setFocusedCard(null);
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBeNull();
      expect(state.focusType).toBeNull();
    });

    it('should overwrite previous card focus', () => {
      const { setFocusedCard } = useCardFocusStore.getState();
      
      setFocusedCard('card-1');
      setFocusedCard('card-2');
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe('card-2');
      expect(state.focusType).toBe('card');
    });

    it('should overwrite list focus with card focus', () => {
      const { setFocusedCard, setFocusedList } = useCardFocusStore.getState();
      
      setFocusedList('list-1');
      setFocusedCard('card-1');
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe('card-1');
      expect(state.focusType).toBe('card');
    });
  });

  describe('setFocusedList', () => {
    it('should set focusedId and focusType to list', () => {
      const { setFocusedList } = useCardFocusStore.getState();
      
      setFocusedList('list-456');
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe('list-456');
      expect(state.focusType).toBe('list');
    });

    it('should clear focus when called with null', () => {
      const { setFocusedList } = useCardFocusStore.getState();
      
      setFocusedList('list-456');
      setFocusedList(null);
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBeNull();
      expect(state.focusType).toBeNull();
    });

    it('should overwrite card focus with list focus', () => {
      const { setFocusedCard, setFocusedList } = useCardFocusStore.getState();
      
      setFocusedCard('card-1');
      setFocusedList('list-1');
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe('list-1');
      expect(state.focusType).toBe('list');
    });
  });

  describe('setFocusedAddList', () => {
    it('should set focusType to addList with null focusedId', () => {
      const { setFocusedAddList } = useCardFocusStore.getState();
      
      setFocusedAddList();
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBeNull();
      expect(state.focusType).toBe('addList');
    });

    it('should overwrite card focus', () => {
      const { setFocusedCard, setFocusedAddList } = useCardFocusStore.getState();
      
      setFocusedCard('card-1');
      setFocusedAddList();
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBeNull();
      expect(state.focusType).toBe('addList');
    });

    it('should overwrite list focus', () => {
      const { setFocusedList, setFocusedAddList } = useCardFocusStore.getState();
      
      setFocusedList('list-1');
      setFocusedAddList();
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBeNull();
      expect(state.focusType).toBe('addList');
    });
  });

  describe('clearFocus', () => {
    it('should clear card focus', () => {
      const { setFocusedCard, clearFocus } = useCardFocusStore.getState();
      
      setFocusedCard('card-1');
      clearFocus();
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBeNull();
      expect(state.focusType).toBeNull();
    });

    it('should clear list focus', () => {
      const { setFocusedList, clearFocus } = useCardFocusStore.getState();
      
      setFocusedList('list-1');
      clearFocus();
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBeNull();
      expect(state.focusType).toBeNull();
    });

    it('should clear addList focus', () => {
      const { setFocusedAddList, clearFocus } = useCardFocusStore.getState();
      
      setFocusedAddList();
      clearFocus();
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBeNull();
      expect(state.focusType).toBeNull();
    });

    it('should be idempotent when already cleared', () => {
      const { clearFocus } = useCardFocusStore.getState();
      
      clearFocus();
      clearFocus();
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBeNull();
      expect(state.focusType).toBeNull();
    });
  });

  describe('focus type transitions', () => {
    it('should transition from card to list to addList', () => {
      const { setFocusedCard, setFocusedList, setFocusedAddList } = useCardFocusStore.getState();
      
      setFocusedCard('card-1');
      expect(useCardFocusStore.getState().focusType).toBe('card');
      
      setFocusedList('list-1');
      expect(useCardFocusStore.getState().focusType).toBe('list');
      
      setFocusedAddList();
      expect(useCardFocusStore.getState().focusType).toBe('addList');
    });

    it('should transition from addList back to card', () => {
      const { setFocusedCard, setFocusedAddList } = useCardFocusStore.getState();
      
      setFocusedAddList();
      setFocusedCard('card-1');
      
      const state = useCardFocusStore.getState();
      expect(state.focusedId).toBe('card-1');
      expect(state.focusType).toBe('card');
    });
  });
});
