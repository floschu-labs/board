import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { v4 as uuidv4 } from 'uuid';
import type { Project, List, Card } from '../types';
import { loadData, saveData } from '../storage';

interface BoardState {
  // Data
  projects: Project[];
  lists: List[];
  cards: Card[];
  
  // UI State
  activeProjectId: string | null;
  isInitialized: boolean;
  
  // Project actions
  createProject: (name: string) => string;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  moveProject: (id: string, newPosition: number) => void;
  
  // List actions
  createList: (projectId: string, name: string) => string;
  updateList: (id: string, updates: Partial<Omit<List, 'id' | 'projectId'>>) => void;
  deleteList: (id: string) => void;
  moveList: (id: string, newPosition: number) => void;
  
  // Card actions
  createCard: (listId: string, title: string, description: string, position?: number) => string;
  updateCard: (id: string, updates: Partial<Omit<Card, 'id' | 'createdAt'>>) => void;
  deleteCard: (id: string) => void;
  moveCard: (cardId: string, targetListId: string, newPosition: number) => void;
  
  // Data management
  initialize: () => Promise<void>;
  importData: (data: { projects: Project[]; lists: List[]; cards: Card[] }) => void;
  clearAllData: () => void;
}

export const useBoardStore = create<BoardState>()(
  subscribeWithSelector((set, get) => ({
    projects: [],
    lists: [],
    cards: [],
    activeProjectId: null,
    isInitialized: false,

    initialize: async () => {
      const data = await loadData();
      set({
        projects: data.projects,
        lists: data.lists,
        cards: data.cards,
        activeProjectId: data.projects.length > 0 ? data.projects[0].id : null,
        isInitialized: true,
      });
    },

    createProject: (name) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      const project: Project = {
        id,
        name,
        createdAt: now,
        updatedAt: now,
      };
      set((state) => ({
        projects: [...state.projects, project],
        activeProjectId: state.activeProjectId ?? id,
      }));
      return id;
    },

    updateProject: (id, updates) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      }));
    },

    deleteProject: (id) => {
      const state = get();
      const listIds = state.lists.filter((l) => l.projectId === id).map((l) => l.id);
      
      set((state) => {
        const remainingProjects = state.projects.filter((p) => p.id !== id);
        return {
          projects: remainingProjects,
          lists: state.lists.filter((l) => l.projectId !== id),
          cards: state.cards.filter((c) => !listIds.includes(c.listId)),
          activeProjectId:
            state.activeProjectId === id
              ? remainingProjects.length > 0
                ? remainingProjects[0].id
                : null
              : state.activeProjectId,
        };
      });
    },

    setActiveProject: (id) => {
      set({ activeProjectId: id });
    },

    moveProject: (id, newPosition) => {
      const state = get();
      const oldIndex = state.projects.findIndex((p) => p.id === id);
      if (oldIndex === -1) return;

      const reordered = [...state.projects];
      const [removed] = reordered.splice(oldIndex, 1);
      reordered.splice(newPosition, 0, removed);

      set({ projects: reordered });
    },

    createList: (projectId, name) => {
      const id = uuidv4();
      const state = get();
      const projectLists = state.lists.filter((l) => l.projectId === projectId);
      const maxPosition = projectLists.reduce((max, l) => Math.max(max, l.position), -1);
      
      const list: List = {
        id,
        projectId,
        name,
        position: maxPosition + 1,
      };
      set((state) => ({
        lists: [...state.lists, list],
      }));
      return id;
    },

    updateList: (id, updates) => {
      set((state) => ({
        lists: state.lists.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      }));
    },

    deleteList: (id) => {
      set((state) => ({
        lists: state.lists.filter((l) => l.id !== id),
        cards: state.cards.filter((c) => c.listId !== id),
      }));
    },

    moveList: (id, newPosition) => {
      const state = get();
      const list = state.lists.find((l) => l.id === id);
      if (!list) return;

      const projectLists = state.lists
        .filter((l) => l.projectId === list.projectId)
        .sort((a, b) => a.position - b.position);

      const oldIndex = projectLists.findIndex((l) => l.id === id);
      if (oldIndex === -1) return;

      const reordered = [...projectLists];
      const [removed] = reordered.splice(oldIndex, 1);
      reordered.splice(newPosition, 0, removed);

      const updatedLists = reordered.map((l, i) => ({ ...l, position: i }));
      
      set((state) => ({
        lists: state.lists.map((l) => {
          const updated = updatedLists.find((u) => u.id === l.id);
          return updated ?? l;
        }),
      }));
    },

    createCard: (listId, title, description, position) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      const state = get();
      const listCards = state.cards
        .filter((c) => c.listId === listId)
        .sort((a, b) => a.position - b.position);
      
      // If position is specified, insert at that position; otherwise append at the end
      const insertPosition = position !== undefined ? position : listCards.length;

      const card: Card = {
        id,
        listId,
        title,
        description,
        position: insertPosition,
        createdAt: now,
        updatedAt: now,
      };
      
      // Shift positions of cards at or after the insert position
      const updatedCards = listCards.map((c) => 
        c.position >= insertPosition ? { ...c, position: c.position + 1 } : c
      );
      
      set((state) => ({
        cards: [
          ...state.cards.filter((c) => c.listId !== listId),
          ...updatedCards,
          card,
        ],
      }));
      return id;
    },

    updateCard: (id, updates) => {
      set((state) => ({
        cards: state.cards.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        ),
      }));
    },

    deleteCard: (id) => {
      set((state) => ({
        cards: state.cards.filter((c) => c.id !== id),
      }));
    },

    moveCard: (cardId, targetListId, newPosition) => {
      const state = get();
      const card = state.cards.find((c) => c.id === cardId);
      if (!card) return;

      const targetCards = state.cards
        .filter((c) => c.listId === targetListId && c.id !== cardId)
        .sort((a, b) => a.position - b.position);

      targetCards.splice(newPosition, 0, { ...card, listId: targetListId });
      const updatedTargetCards = targetCards.map((c, i) => ({ ...c, position: i }));

      // Re-index cards in the source list if different
      let updatedSourceCards: Card[] = [];
      if (card.listId !== targetListId) {
        const sourceCards = state.cards
          .filter((c) => c.listId === card.listId && c.id !== cardId)
          .sort((a, b) => a.position - b.position);
        updatedSourceCards = sourceCards.map((c, i) => ({ ...c, position: i }));
      }

      set((state) => ({
        cards: state.cards.map((c) => {
          const updatedTarget = updatedTargetCards.find((u) => u.id === c.id);
          if (updatedTarget) return updatedTarget;
          const updatedSource = updatedSourceCards.find((u) => u.id === c.id);
          if (updatedSource) return updatedSource;
          return c;
        }),
      }));
    },

    importData: (data) => {
      set((state) => ({
        projects: [...state.projects, ...data.projects],
        lists: [...state.lists, ...data.lists],
        cards: [...state.cards, ...data.cards],
        activeProjectId: state.activeProjectId ?? (data.projects.length > 0 ? data.projects[0].id : null),
      }));
    },

    clearAllData: () => {
      set({
        projects: [],
        lists: [],
        cards: [],
        activeProjectId: null,
      });
    },
  }))
);

// Auto-save to storage backend on state changes
useBoardStore.subscribe(
  (state) => ({ projects: state.projects, lists: state.lists, cards: state.cards }),
  (data) => {
    const state = useBoardStore.getState();
    if (state.isInitialized) {
      saveData(data);
    }
  },
  { equalityFn: shallow }
);
