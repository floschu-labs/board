import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBoardStore } from './index';

// Mock localStorage
vi.mock('../storage/localStorage', () => ({
  loadFromStorage: vi.fn(() => ({ projects: [], lists: [], cards: [] })),
  saveToStorage: vi.fn(),
}));

describe('Board Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useBoardStore.setState({
      projects: [],
      lists: [],
      cards: [],
      activeProjectId: null,
      isInitialized: true, // Set to true to skip initialize() side effects
    });
  });

  describe('Project CRUD operations', () => {
    it('should create a project', () => {
      const { createProject } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      
      const state = useBoardStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].name).toBe('Test Project');
      expect(state.projects[0].id).toBe(projectId);
      expect(state.activeProjectId).toBe(projectId);
    });

    it('should set first project as active when creating first project', () => {
      const { createProject } = useBoardStore.getState();
      
      const projectId = createProject('First Project');
      
      expect(useBoardStore.getState().activeProjectId).toBe(projectId);
    });

    it('should not change activeProjectId when creating additional projects', () => {
      const { createProject } = useBoardStore.getState();
      
      const firstId = createProject('First Project');
      createProject('Second Project');
      
      expect(useBoardStore.getState().activeProjectId).toBe(firstId);
    });

    it('should update a project', () => {
      const { createProject, updateProject } = useBoardStore.getState();
      
      const projectId = createProject('Original Name');
      
      updateProject(projectId, { name: 'Updated Name' });
      
      const state = useBoardStore.getState();
      expect(state.projects[0].name).toBe('Updated Name');
      // updatedAt should be set (may or may not differ if test runs fast)
      expect(state.projects[0].updatedAt).toBeDefined();
    });

    it('should delete a project', () => {
      const { createProject, deleteProject } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      deleteProject(projectId);
      
      expect(useBoardStore.getState().projects).toHaveLength(0);
    });

    it('should cascade delete lists and cards when deleting a project', () => {
      const { createProject, createList, createCard, deleteProject } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Test List');
      createCard(listId, 'Test Card', 'Description');
      
      expect(useBoardStore.getState().lists).toHaveLength(1);
      expect(useBoardStore.getState().cards).toHaveLength(1);
      
      deleteProject(projectId);
      
      const state = useBoardStore.getState();
      expect(state.projects).toHaveLength(0);
      expect(state.lists).toHaveLength(0);
      expect(state.cards).toHaveLength(0);
    });

    it('should update activeProjectId when deleting active project', () => {
      const { createProject, deleteProject } = useBoardStore.getState();
      
      const firstId = createProject('First');
      createProject('Second');
      
      expect(useBoardStore.getState().activeProjectId).toBe(firstId);
      
      deleteProject(firstId);
      
      const state = useBoardStore.getState();
      expect(state.activeProjectId).not.toBe(firstId);
      expect(state.activeProjectId).toBe(state.projects[0].id);
    });

    it('should set activeProjectId to null when deleting last project', () => {
      const { createProject, deleteProject } = useBoardStore.getState();
      
      const projectId = createProject('Only Project');
      deleteProject(projectId);
      
      expect(useBoardStore.getState().activeProjectId).toBeNull();
    });
  });

  describe('List CRUD operations', () => {
    it('should create a list', () => {
      const { createProject, createList } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Test List');
      
      const state = useBoardStore.getState();
      expect(state.lists).toHaveLength(1);
      expect(state.lists[0].name).toBe('Test List');
      expect(state.lists[0].id).toBe(listId);
      expect(state.lists[0].projectId).toBe(projectId);
    });

    it('should assign incrementing positions to lists', () => {
      const { createProject, createList } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      createList(projectId, 'List 1');
      createList(projectId, 'List 2');
      createList(projectId, 'List 3');
      
      const state = useBoardStore.getState();
      expect(state.lists[0].position).toBe(0);
      expect(state.lists[1].position).toBe(1);
      expect(state.lists[2].position).toBe(2);
    });

    it('should update a list', () => {
      const { createProject, createList, updateList } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Original');
      updateList(listId, { name: 'Updated' });
      
      expect(useBoardStore.getState().lists[0].name).toBe('Updated');
    });

    it('should delete a list', () => {
      const { createProject, createList, deleteList } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Test List');
      deleteList(listId);
      
      expect(useBoardStore.getState().lists).toHaveLength(0);
    });

    it('should cascade delete cards when deleting a list', () => {
      const { createProject, createList, createCard, deleteList } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Test List');
      createCard(listId, 'Card 1', '');
      createCard(listId, 'Card 2', '');
      
      expect(useBoardStore.getState().cards).toHaveLength(2);
      
      deleteList(listId);
      
      expect(useBoardStore.getState().cards).toHaveLength(0);
    });
  });

  describe('Card CRUD operations', () => {
    it('should create a card', () => {
      const { createProject, createList, createCard } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Test List');
      const cardId = createCard(listId, 'Test Card', 'Description');
      
      const state = useBoardStore.getState();
      expect(state.cards).toHaveLength(1);
      expect(state.cards[0].title).toBe('Test Card');
      expect(state.cards[0].description).toBe('Description');
      expect(state.cards[0].id).toBe(cardId);
    });

    it('should assign incrementing positions to cards', () => {
      const { createProject, createList, createCard } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Test List');
      createCard(listId, 'Card 1', '');
      createCard(listId, 'Card 2', '');
      createCard(listId, 'Card 3', '');
      
      const cards = useBoardStore.getState().cards.sort((a, b) => a.position - b.position);
      expect(cards[0].position).toBe(0);
      expect(cards[1].position).toBe(1);
      expect(cards[2].position).toBe(2);
    });

    it('should insert card at specific position', () => {
      const { createProject, createList, createCard } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Test List');
      createCard(listId, 'Card 1', '');
      createCard(listId, 'Card 2', '');
      const insertedId = createCard(listId, 'Inserted Card', '', 1);
      
      const cards = useBoardStore.getState().cards
        .filter(c => c.listId === listId)
        .sort((a, b) => a.position - b.position);
      
      expect(cards[1].id).toBe(insertedId);
      expect(cards[1].title).toBe('Inserted Card');
    });

    it('should update a card', () => {
      const { createProject, createList, createCard, updateCard } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Test List');
      const cardId = createCard(listId, 'Original', '');
      
      updateCard(cardId, { title: 'Updated', description: 'New description' });
      
      const card = useBoardStore.getState().cards[0];
      expect(card.title).toBe('Updated');
      expect(card.description).toBe('New description');
    });

    it('should delete a card', () => {
      const { createProject, createList, createCard, deleteCard } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Test List');
      const cardId = createCard(listId, 'Test Card', '');
      
      deleteCard(cardId);
      
      expect(useBoardStore.getState().cards).toHaveLength(0);
    });
  });

  describe('moveCard', () => {
    it('should move card within the same list', () => {
      const { createProject, createList, createCard, moveCard } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Test List');
      const card1Id = createCard(listId, 'Card 1', '');
      createCard(listId, 'Card 2', '');
      createCard(listId, 'Card 3', '');
      
      // Move Card 1 to position 2 (after Card 2)
      moveCard(card1Id, listId, 2);
      
      const cards = useBoardStore.getState().cards
        .filter(c => c.listId === listId)
        .sort((a, b) => a.position - b.position);
      
      expect(cards[0].title).toBe('Card 2');
      expect(cards[1].title).toBe('Card 3');
      expect(cards[2].title).toBe('Card 1');
    });

    it('should move card to a different list', () => {
      const { createProject, createList, createCard, moveCard } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const list1Id = createList(projectId, 'List 1');
      const list2Id = createList(projectId, 'List 2');
      const cardId = createCard(list1Id, 'Card 1', '');
      
      moveCard(cardId, list2Id, 0);
      
      const card = useBoardStore.getState().cards.find(c => c.id === cardId);
      expect(card?.listId).toBe(list2Id);
      expect(card?.position).toBe(0);
    });

    it('should re-index source list cards when moving to different list', () => {
      const { createProject, createList, createCard, moveCard } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const list1Id = createList(projectId, 'List 1');
      const list2Id = createList(projectId, 'List 2');
      createCard(list1Id, 'Card 1', '');
      createCard(list1Id, 'Card 2', '');
      const card3Id = createCard(list1Id, 'Card 3', '');
      
      // Move Card 3 (position 2) to list 2
      moveCard(card3Id, list2Id, 0);
      
      // Source list should have re-indexed positions
      const list1Cards = useBoardStore.getState().cards
        .filter(c => c.listId === list1Id)
        .sort((a, b) => a.position - b.position);
      
      expect(list1Cards).toHaveLength(2);
      expect(list1Cards[0].position).toBe(0);
      expect(list1Cards[1].position).toBe(1);
    });
  });

  describe('moveList', () => {
    it('should reorder lists within a project', () => {
      const { createProject, createList, moveList } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const list1Id = createList(projectId, 'List 1');
      createList(projectId, 'List 2');
      createList(projectId, 'List 3');
      
      // Move List 1 to position 2
      moveList(list1Id, 2);
      
      const lists = useBoardStore.getState().lists
        .filter(l => l.projectId === projectId)
        .sort((a, b) => a.position - b.position);
      
      expect(lists[0].name).toBe('List 2');
      expect(lists[1].name).toBe('List 3');
      expect(lists[2].name).toBe('List 1');
    });
  });

  describe('moveProject', () => {
    it('should reorder projects', () => {
      const { createProject, moveProject } = useBoardStore.getState();
      
      const project1Id = createProject('Project 1');
      createProject('Project 2');
      createProject('Project 3');
      
      // Move Project 1 to position 2
      moveProject(project1Id, 2);
      
      const projects = useBoardStore.getState().projects;
      expect(projects[0].name).toBe('Project 2');
      expect(projects[1].name).toBe('Project 3');
      expect(projects[2].name).toBe('Project 1');
    });
  });

  describe('importData', () => {
    it('should import projects, lists, and cards', () => {
      const { importData } = useBoardStore.getState();
      
      importData({
        projects: [{ id: 'p1', name: 'Imported Project', createdAt: '', updatedAt: '' }],
        lists: [{ id: 'l1', projectId: 'p1', name: 'Imported List', position: 0 }],
        cards: [{ id: 'c1', listId: 'l1', title: 'Imported Card', description: '', position: 0, createdAt: '', updatedAt: '' }],
      });
      
      const state = useBoardStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.lists).toHaveLength(1);
      expect(state.cards).toHaveLength(1);
    });

    it('should merge with existing data', () => {
      const { createProject, importData } = useBoardStore.getState();
      
      createProject('Existing Project');
      
      importData({
        projects: [{ id: 'p2', name: 'Imported Project', createdAt: '', updatedAt: '' }],
        lists: [],
        cards: [],
      });
      
      expect(useBoardStore.getState().projects).toHaveLength(2);
    });

    it('should set activeProjectId if none is set', () => {
      const { importData } = useBoardStore.getState();

      importData({
        projects: [{ id: 'p1', name: 'Imported Project', createdAt: '', updatedAt: '' }],
        lists: [],
        cards: [],
      });

      expect(useBoardStore.getState().activeProjectId).toBe('p1');
    });

    it('should focus the imported project even when one is already active', () => {
      const { createProject, importData } = useBoardStore.getState();

      const existingId = createProject('Existing Project');
      expect(useBoardStore.getState().activeProjectId).toBe(existingId);

      importData({
        projects: [{ id: 'p2', name: 'Imported Project', createdAt: '', updatedAt: '' }],
        lists: [],
        cards: [],
      });

      expect(useBoardStore.getState().activeProjectId).toBe('p2');
    });

    it('should keep the current active project when importing no projects', () => {
      const { createProject, importData } = useBoardStore.getState();

      const existingId = createProject('Existing Project');

      importData({ projects: [], lists: [], cards: [] });

      expect(useBoardStore.getState().activeProjectId).toBe(existingId);
    });
  });

  describe('clearAllData', () => {
    it('should clear all data', () => {
      const { createProject, createList, createCard, clearAllData } = useBoardStore.getState();
      
      const projectId = createProject('Test Project');
      const listId = createList(projectId, 'Test List');
      createCard(listId, 'Test Card', '');
      
      clearAllData();
      
      const state = useBoardStore.getState();
      expect(state.projects).toHaveLength(0);
      expect(state.lists).toHaveLength(0);
      expect(state.cards).toHaveLength(0);
      expect(state.activeProjectId).toBeNull();
    });
  });

  describe('setActiveProject', () => {
    it('should set active project', () => {
      const { createProject, setActiveProject } = useBoardStore.getState();
      
      createProject('Project 1');
      const project2Id = createProject('Project 2');
      
      setActiveProject(project2Id);
      
      expect(useBoardStore.getState().activeProjectId).toBe(project2Id);
    });

    it('should allow setting to null', () => {
      const { createProject, setActiveProject } = useBoardStore.getState();
      
      createProject('Project 1');
      setActiveProject(null);
      
      expect(useBoardStore.getState().activeProjectId).toBeNull();
    });
  });
});
