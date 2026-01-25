import { describe, it, expect, beforeEach } from 'vitest';
import { useBoardStore } from './index';

describe('Drag and Drop - Store Operations', () => {
  const projectId = 'project-1';
  const list1Id = 'list-1';
  const list2Id = 'list-2';
  const list3Id = 'list-3';
  const now = new Date().toISOString();

  beforeEach(() => {
    // Reset store to known state with test data
    useBoardStore.setState({
      projects: [{ id: projectId, name: 'Test Project', createdAt: now, updatedAt: now }],
      lists: [
        { id: list1Id, projectId, name: 'List 1', position: 0 },
        { id: list2Id, projectId, name: 'List 2', position: 1 },
        { id: list3Id, projectId, name: 'List 3', position: 2 },
      ],
      cards: [
        { id: 'card-1-1', listId: list1Id, title: 'Card 1-1', description: '', position: 0, createdAt: now, updatedAt: now },
        { id: 'card-1-2', listId: list1Id, title: 'Card 1-2', description: '', position: 1, createdAt: now, updatedAt: now },
        { id: 'card-1-3', listId: list1Id, title: 'Card 1-3', description: '', position: 2, createdAt: now, updatedAt: now },
        { id: 'card-2-1', listId: list2Id, title: 'Card 2-1', description: '', position: 0, createdAt: now, updatedAt: now },
        { id: 'card-2-2', listId: list2Id, title: 'Card 2-2', description: '', position: 1, createdAt: now, updatedAt: now },
      ],
      activeProjectId: projectId,
      isInitialized: true,
    });
  });

  describe('moveCard - within same list', () => {
    it('should move card from position 0 to position 2', () => {
      const { moveCard } = useBoardStore.getState();
      
      // Move first card to last position in list 1
      moveCard('card-1-1', list1Id, 2);
      
      const updatedCards = useBoardStore.getState().cards;
      const list1Cards = updatedCards
        .filter(c => c.listId === list1Id)
        .sort((a, b) => a.position - b.position);
      
      expect(list1Cards.map(c => c.id)).toEqual(['card-1-2', 'card-1-3', 'card-1-1']);
      expect(list1Cards.map(c => c.position)).toEqual([0, 1, 2]);
    });

    it('should move card from position 2 to position 0', () => {
      const { moveCard } = useBoardStore.getState();
      
      // Move last card to first position in list 1
      moveCard('card-1-3', list1Id, 0);
      
      const updatedCards = useBoardStore.getState().cards;
      const list1Cards = updatedCards
        .filter(c => c.listId === list1Id)
        .sort((a, b) => a.position - b.position);
      
      expect(list1Cards.map(c => c.id)).toEqual(['card-1-3', 'card-1-1', 'card-1-2']);
      expect(list1Cards.map(c => c.position)).toEqual([0, 1, 2]);
    });

    it('should move card from position 1 to position 0', () => {
      const { moveCard } = useBoardStore.getState();
      
      moveCard('card-1-2', list1Id, 0);
      
      const updatedCards = useBoardStore.getState().cards;
      const list1Cards = updatedCards
        .filter(c => c.listId === list1Id)
        .sort((a, b) => a.position - b.position);
      
      expect(list1Cards.map(c => c.id)).toEqual(['card-1-2', 'card-1-1', 'card-1-3']);
    });

    it('should not change positions if moving to same position', () => {
      const { moveCard } = useBoardStore.getState();
      const cardsBefore = useBoardStore.getState().cards
        .filter(c => c.listId === list1Id)
        .sort((a, b) => a.position - b.position);
      
      moveCard('card-1-2', list1Id, 1);
      
      const cardsAfter = useBoardStore.getState().cards
        .filter(c => c.listId === list1Id)
        .sort((a, b) => a.position - b.position);
      
      expect(cardsAfter.map(c => c.id)).toEqual(cardsBefore.map(c => c.id));
    });
  });

  describe('moveCard - between lists', () => {
    it('should move card from list 1 to list 2 at position 0', () => {
      const { moveCard } = useBoardStore.getState();
      
      moveCard('card-1-1', list2Id, 0);
      
      const updatedCards = useBoardStore.getState().cards;
      const list1Cards = updatedCards.filter(c => c.listId === list1Id).sort((a, b) => a.position - b.position);
      const list2Cards = updatedCards.filter(c => c.listId === list2Id).sort((a, b) => a.position - b.position);
      
      // Card should now be in list 2
      expect(list1Cards.map(c => c.id)).toEqual(['card-1-2', 'card-1-3']);
      expect(list2Cards.map(c => c.id)).toEqual(['card-1-1', 'card-2-1', 'card-2-2']);
      
      // Positions should be re-indexed
      expect(list1Cards.map(c => c.position)).toEqual([0, 1]);
      expect(list2Cards.map(c => c.position)).toEqual([0, 1, 2]);
    });

    it('should move card from list 1 to list 2 at end', () => {
      const { moveCard } = useBoardStore.getState();
      
      moveCard('card-1-1', list2Id, 2);
      
      const updatedCards = useBoardStore.getState().cards;
      const list2Cards = updatedCards.filter(c => c.listId === list2Id).sort((a, b) => a.position - b.position);
      
      expect(list2Cards.map(c => c.id)).toEqual(['card-2-1', 'card-2-2', 'card-1-1']);
    });

    it('should move card from list 2 to empty list 3', () => {
      const { moveCard } = useBoardStore.getState();
      
      moveCard('card-2-1', list3Id, 0);
      
      const updatedCards = useBoardStore.getState().cards;
      const list2Cards = updatedCards.filter(c => c.listId === list2Id).sort((a, b) => a.position - b.position);
      const list3Cards = updatedCards.filter(c => c.listId === list3Id).sort((a, b) => a.position - b.position);
      
      expect(list2Cards.map(c => c.id)).toEqual(['card-2-2']);
      expect(list3Cards.map(c => c.id)).toEqual(['card-2-1']);
      expect(list3Cards[0].position).toBe(0);
    });

    it('should update listId when moving between lists', () => {
      const { moveCard } = useBoardStore.getState();
      
      moveCard('card-1-1', list2Id, 0);
      
      const movedCard = useBoardStore.getState().cards.find(c => c.id === 'card-1-1');
      expect(movedCard?.listId).toBe(list2Id);
    });
  });

  describe('moveList', () => {
    it('should move list from position 0 to position 2', () => {
      const { moveList } = useBoardStore.getState();
      
      moveList(list1Id, 2);
      
      const updatedLists = useBoardStore.getState().lists
        .filter(l => l.projectId === projectId)
        .sort((a, b) => a.position - b.position);
      
      expect(updatedLists.map(l => l.id)).toEqual([list2Id, list3Id, list1Id]);
      expect(updatedLists.map(l => l.position)).toEqual([0, 1, 2]);
    });

    it('should move list from position 2 to position 0', () => {
      const { moveList } = useBoardStore.getState();
      
      moveList(list3Id, 0);
      
      const updatedLists = useBoardStore.getState().lists
        .filter(l => l.projectId === projectId)
        .sort((a, b) => a.position - b.position);
      
      expect(updatedLists.map(l => l.id)).toEqual([list3Id, list1Id, list2Id]);
    });

    it('should move list from position 1 to position 0', () => {
      const { moveList } = useBoardStore.getState();
      
      moveList(list2Id, 0);
      
      const updatedLists = useBoardStore.getState().lists
        .filter(l => l.projectId === projectId)
        .sort((a, b) => a.position - b.position);
      
      expect(updatedLists.map(l => l.id)).toEqual([list2Id, list1Id, list3Id]);
    });

    it('should not change order if moving to same position', () => {
      const { moveList } = useBoardStore.getState();
      const listsBefore = useBoardStore.getState().lists
        .filter(l => l.projectId === projectId)
        .sort((a, b) => a.position - b.position);
      
      moveList(list2Id, 1);
      
      const listsAfter = useBoardStore.getState().lists
        .filter(l => l.projectId === projectId)
        .sort((a, b) => a.position - b.position);
      
      expect(listsAfter.map(l => l.id)).toEqual(listsBefore.map(l => l.id));
    });
  });

  describe('edge cases', () => {
    it('should handle moving non-existent card gracefully', () => {
      const { moveCard } = useBoardStore.getState();
      const cardsBefore = [...useBoardStore.getState().cards];
      
      moveCard('non-existent-card', list1Id, 0);
      
      const cardsAfter = useBoardStore.getState().cards;
      expect(cardsAfter).toEqual(cardsBefore);
    });

    it('should handle moving non-existent list gracefully', () => {
      const { moveList } = useBoardStore.getState();
      const listsBefore = [...useBoardStore.getState().lists];
      
      moveList('non-existent-list', 0);
      
      const listsAfter = useBoardStore.getState().lists;
      expect(listsAfter).toEqual(listsBefore);
    });

    it('should handle moving card to non-existent list', () => {
      const { moveCard } = useBoardStore.getState();
      
      moveCard('card-1-1', 'non-existent-list', 0);
      
      // Card should be updated with new listId (the store doesn't validate list existence)
      const movedCard = useBoardStore.getState().cards.find(c => c.id === 'card-1-1');
      expect(movedCard?.listId).toBe('non-existent-list');
    });

    it('should handle rapid consecutive moves', () => {
      const { moveCard } = useBoardStore.getState();
      
      // Move card multiple times in succession
      moveCard('card-1-1', list2Id, 0);
      moveCard('card-1-1', list3Id, 0);
      moveCard('card-1-1', list1Id, 2);
      
      const updatedCards = useBoardStore.getState().cards;
      const card = updatedCards.find(c => c.id === 'card-1-1');
      
      expect(card?.listId).toBe(list1Id);
    });
  });
});
