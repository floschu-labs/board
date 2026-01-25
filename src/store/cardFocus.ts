import { create } from 'zustand';

// Specific focus types for board navigation
export type FocusType = 
  | 'card'           // Board: focused on a card
  | 'list'           // Board: focused on a list header
  | 'addList'        // Board: focused on add list button
  | null;

interface FocusState {
  focusedId: string | null;
  focusType: FocusType;
  
  // Board focus
  setFocusedCard: (cardId: string | null) => void;
  setFocusedList: (listId: string | null) => void;
  setFocusedAddList: () => void;
  
  clearFocus: () => void;
}

const initialState: Pick<FocusState, 'focusedId' | 'focusType'> = {
  focusedId: null,
  focusType: null,
};

export const useCardFocusStore = create<FocusState>()((set, get) => ({
  ...initialState,
  
  // Board focus
  setFocusedCard: (cardId) => {
    const prev = get();
    if (import.meta.env.DEV) {
      console.log('[Focus] setFocusedCard:', cardId, '| prev:', prev.focusType, prev.focusedId);
    }
    set({ focusedId: cardId, focusType: cardId ? 'card' : null });
  },
  setFocusedList: (listId) => {
    const prev = get();
    if (import.meta.env.DEV) {
      console.log('[Focus] setFocusedList:', listId, '| prev:', prev.focusType, prev.focusedId);
    }
    set({ focusedId: listId, focusType: listId ? 'list' : null });
  },
  setFocusedAddList: () => {
    const prev = get();
    if (import.meta.env.DEV) {
      console.log('[Focus] setFocusedAddList | prev:', prev.focusType, prev.focusedId);
    }
    set({ focusedId: null, focusType: 'addList' });
  },
  
  clearFocus: () => {
    const prev = get();
    if (import.meta.env.DEV && (prev.focusedId || prev.focusType)) {
      console.log('[Focus] clearFocus | prev:', prev.focusType, prev.focusedId);
    }
    set({ focusedId: null, focusType: null });
  },
}));

// Convenience selectors - Board
export const useFocusedCardId = () => {
  return useCardFocusStore((state) => 
    state.focusType === 'card' ? state.focusedId : null
  );
};

export const useFocusedListId = () => {
  return useCardFocusStore((state) => 
    state.focusType === 'list' ? state.focusedId : null
  );
};

export const useIsAddListFocused = () => {
  return useCardFocusStore((s) => s.focusType === 'addList');
};
