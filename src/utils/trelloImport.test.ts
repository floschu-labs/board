import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isTrelloExport, convertTrelloExport } from './trelloImport';

// Mock crypto.randomUUID to return predictable IDs for testing
let uuidCounter = 0;
beforeEach(() => {
  uuidCounter = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    uuidCounter++;
    return `uuid-${uuidCounter}-0000-0000-0000-000000000000` as `${string}-${string}-${string}-${string}-${string}`;
  });
});

// Helper to create a minimal valid Trello export
function createTrelloExport(overrides: Partial<{
  id: string;
  name: string;
  lists: Array<{
    id: string;
    name: string;
    closed: boolean;
    pos: number;
  }>;
  cards: Array<{
    id: string;
    name: string;
    desc: string;
    closed: boolean;
    idList: string;
    pos: number;
    due: string | null;
    dateLastActivity: string;
    attachments?: Array<{ id: string; url: string; name: string }>;
    cover?: {
      idAttachment?: string;
      color?: string;
      scaled?: Array<{ url: string; width: number; height: number }>;
    };
  }>;
}> = {}) {
  return {
    id: 'trello-board-123',
    name: 'My Trello Board',
    lists: [],
    cards: [],
    ...overrides,
  };
}

describe('isTrelloExport', () => {
  it('should return true for valid Trello export', () => {
    const data = createTrelloExport();
    expect(isTrelloExport(data)).toBe(true);
  });

  it('should return true for Trello export with lists and cards', () => {
    const data = createTrelloExport({
      lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 1 }],
      cards: [{ id: 'card-1', name: 'Task', desc: '', closed: false, idList: 'list-1', pos: 1, due: null, dateLastActivity: '2024-01-01' }],
    });
    expect(isTrelloExport(data)).toBe(true);
  });

  it('should return false for Board export (has version field)', () => {
    const data = {
      version: 1,
      exportedAt: '2024-01-01',
      projects: [],
      lists: [],
      cards: [],
    };
    expect(isTrelloExport(data)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isTrelloExport(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isTrelloExport(undefined)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isTrelloExport('string')).toBe(false);
    expect(isTrelloExport(123)).toBe(false);
    expect(isTrelloExport(true)).toBe(false);
  });

  it('should return false for object without name', () => {
    const data = { lists: [], cards: [] };
    expect(isTrelloExport(data)).toBe(false);
  });

  it('should return false for object without lists', () => {
    const data = { name: 'Board', cards: [] };
    expect(isTrelloExport(data)).toBe(false);
  });

  it('should return false for object without cards', () => {
    const data = { name: 'Board', lists: [] };
    expect(isTrelloExport(data)).toBe(false);
  });

  it('should return false when lists is not an array', () => {
    const data = { name: 'Board', lists: 'not-array', cards: [] };
    expect(isTrelloExport(data)).toBe(false);
  });

  it('should return false when cards is not an array', () => {
    const data = { name: 'Board', lists: [], cards: 'not-array' };
    expect(isTrelloExport(data)).toBe(false);
  });

  it('should return false for empty board name', () => {
    const data = { name: '', lists: [], cards: [] };
    expect(isTrelloExport(data)).toBe(false);
  });

  it('should return false for whitespace-only board name', () => {
    const data = { name: '   ', lists: [], cards: [] };
    expect(isTrelloExport(data)).toBe(false);
  });

  it('should return false when list elements have wrong shape', () => {
    const data = { name: 'Board', lists: [42], cards: [] };
    expect(isTrelloExport(data)).toBe(false);
  });

  it('should return false when list elements are null', () => {
    const data = { name: 'Board', lists: [null], cards: [] };
    expect(isTrelloExport(data)).toBe(false);
  });

  it('should return false when card elements have wrong shape', () => {
    const data = { name: 'Board', lists: [], cards: [{ foo: 'bar' }] };
    expect(isTrelloExport(data)).toBe(false);
  });
});

describe('convertTrelloExport', () => {
  describe('basic conversion', () => {
    it('should convert a valid Trello export to BoardExport', () => {
      const trelloData = createTrelloExport({
        name: 'My Project',
        lists: [
          { id: 'list-1', name: 'To Do', closed: false, pos: 100 },
        ],
        cards: [
          { id: 'card-1', name: 'Task 1', desc: 'Description', closed: false, idList: 'list-1', pos: 100, due: null, dateLastActivity: '2024-01-15T10:00:00.000Z' },
        ],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.version).toBe(1);
      expect(result.exportedAt).toBeDefined();
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].name).toBe('My Project');
      expect(result.lists).toHaveLength(1);
      expect(result.lists[0].name).toBe('To Do');
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].title).toBe('Task 1');
      expect(result.cards[0].description).toBe('Description');
    });

    it('should create project with correct fields', () => {
      const trelloData = createTrelloExport({ name: 'Test Board' });
      const result = convertTrelloExport(trelloData);

      expect(result.projects[0]).toMatchObject({
        id: 'uuid-1-0000-0000-0000-000000000000',
        name: 'Test Board',
      });
      expect(result.projects[0].createdAt).toBeDefined();
      expect(result.projects[0].updatedAt).toBeDefined();
    });

    it('should handle empty board (no lists, no cards)', () => {
      const trelloData = createTrelloExport({ name: 'Empty Board' });
      const result = convertTrelloExport(trelloData);

      expect(result.projects).toHaveLength(1);
      expect(result.lists).toHaveLength(0);
      expect(result.cards).toHaveLength(0);
    });
  });

  describe('list conversion', () => {
    it('should convert lists with correct projectId reference', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.lists[0].projectId).toBe(result.projects[0].id);
    });

    it('should filter out archived (closed) lists', () => {
      const trelloData = createTrelloExport({
        lists: [
          { id: 'list-1', name: 'Active', closed: false, pos: 100 },
          { id: 'list-2', name: 'Archived', closed: true, pos: 200 },
          { id: 'list-3', name: 'Also Active', closed: false, pos: 300 },
        ],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.lists).toHaveLength(2);
      expect(result.lists.map(l => l.name)).toEqual(['Active', 'Also Active']);
    });

    it('should normalize list positions to sequential integers', () => {
      const trelloData = createTrelloExport({
        lists: [
          { id: 'list-1', name: 'First', closed: false, pos: 16384 },
          { id: 'list-2', name: 'Second', closed: false, pos: 32768 },
          { id: 'list-3', name: 'Third', closed: false, pos: 65536 },
        ],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.lists[0].position).toBe(0);
      expect(result.lists[1].position).toBe(1);
      expect(result.lists[2].position).toBe(2);
    });

    it('should sort lists by pos before assigning positions', () => {
      const trelloData = createTrelloExport({
        lists: [
          { id: 'list-3', name: 'Third', closed: false, pos: 300 },
          { id: 'list-1', name: 'First', closed: false, pos: 100 },
          { id: 'list-2', name: 'Second', closed: false, pos: 200 },
        ],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.lists[0].name).toBe('First');
      expect(result.lists[1].name).toBe('Second');
      expect(result.lists[2].name).toBe('Third');
    });
  });

  describe('card conversion', () => {
    it('should convert card name to title and desc to description', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Card Title',
          desc: 'Card Description',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].title).toBe('Card Title');
      expect(result.cards[0].description).toBe('Card Description');
    });

    it('should use empty string for missing description', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Card',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].description).toBe('');
    });

    it('should filter out archived (closed) cards', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [
          { id: 'card-1', name: 'Active', desc: '', closed: false, idList: 'list-1', pos: 100, due: null, dateLastActivity: '2024-01-01' },
          { id: 'card-2', name: 'Archived', desc: '', closed: true, idList: 'list-1', pos: 200, due: null, dateLastActivity: '2024-01-01' },
        ],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].title).toBe('Active');
    });

    it('should filter out cards referencing non-existent lists', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [
          { id: 'card-1', name: 'Valid', desc: '', closed: false, idList: 'list-1', pos: 100, due: null, dateLastActivity: '2024-01-01' },
          { id: 'card-2', name: 'Orphan', desc: '', closed: false, idList: 'non-existent', pos: 200, due: null, dateLastActivity: '2024-01-01' },
        ],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].title).toBe('Valid');
    });

    it('should filter out cards referencing archived lists', () => {
      const trelloData = createTrelloExport({
        lists: [
          { id: 'list-1', name: 'Active', closed: false, pos: 100 },
          { id: 'list-2', name: 'Archived', closed: true, pos: 200 },
        ],
        cards: [
          { id: 'card-1', name: 'In Active', desc: '', closed: false, idList: 'list-1', pos: 100, due: null, dateLastActivity: '2024-01-01' },
          { id: 'card-2', name: 'In Archived', desc: '', closed: false, idList: 'list-2', pos: 200, due: null, dateLastActivity: '2024-01-01' },
        ],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].title).toBe('In Active');
    });

    it('should correctly map cards to converted list IDs', () => {
      const trelloData = createTrelloExport({
        lists: [
          { id: 'trello-list-1', name: 'To Do', closed: false, pos: 100 },
          { id: 'trello-list-2', name: 'Done', closed: false, pos: 200 },
        ],
        cards: [
          { id: 'card-1', name: 'Task 1', desc: '', closed: false, idList: 'trello-list-1', pos: 100, due: null, dateLastActivity: '2024-01-01' },
          { id: 'card-2', name: 'Task 2', desc: '', closed: false, idList: 'trello-list-2', pos: 100, due: null, dateLastActivity: '2024-01-01' },
        ],
      });

      const result = convertTrelloExport(trelloData);

      const todoList = result.lists.find(l => l.name === 'To Do');
      const doneList = result.lists.find(l => l.name === 'Done');
      const task1 = result.cards.find(c => c.title === 'Task 1');
      const task2 = result.cards.find(c => c.title === 'Task 2');

      expect(task1?.listId).toBe(todoList?.id);
      expect(task2?.listId).toBe(doneList?.id);
    });

    it('should normalize card positions within each list', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [
          { id: 'card-3', name: 'Third', desc: '', closed: false, idList: 'list-1', pos: 65536, due: null, dateLastActivity: '2024-01-01' },
          { id: 'card-1', name: 'First', desc: '', closed: false, idList: 'list-1', pos: 16384, due: null, dateLastActivity: '2024-01-01' },
          { id: 'card-2', name: 'Second', desc: '', closed: false, idList: 'list-1', pos: 32768, due: null, dateLastActivity: '2024-01-01' },
        ],
      });

      const result = convertTrelloExport(trelloData);

      const sortedCards = result.cards.sort((a, b) => a.position - b.position);
      expect(sortedCards[0].title).toBe('First');
      expect(sortedCards[0].position).toBe(0);
      expect(sortedCards[1].title).toBe('Second');
      expect(sortedCards[1].position).toBe(1);
      expect(sortedCards[2].title).toBe('Third');
      expect(sortedCards[2].position).toBe(2);
    });

    it('should preserve due date', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: '2024-03-15T12:00:00.000Z',
          dateLastActivity: '2024-01-01',
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].dueDate).toBe('2024-03-15T12:00:00.000Z');
    });

    it('should not set dueDate when due is null', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].dueDate).toBeUndefined();
    });

    it('should use dateLastActivity for updatedAt', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-06-20T15:30:00.000Z',
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].updatedAt).toBe('2024-06-20T15:30:00.000Z');
    });
  });

  describe('attachments', () => {
    it('should extract first attachment URL as link', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
          attachments: [
            { id: 'att-1', url: 'https://example.com/doc.pdf', name: 'Document' },
            { id: 'att-2', url: 'https://example.com/image.png', name: 'Image' },
          ],
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].link).toBe('https://example.com/doc.pdf');
    });

    it('should not set link when no attachments', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].link).toBeUndefined();
    });

    it('should not set link when attachments array is empty', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
          attachments: [],
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].link).toBeUndefined();
    });

    it('should drop javascript: attachment URLs', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
          attachments: [
            { id: 'att-1', url: 'javascript:alert(1)', name: 'XSS' },
          ],
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].link).toBeUndefined();
    });

    it('should drop data: attachment URLs', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
          attachments: [
            { id: 'att-1', url: 'data:text/html,<script>alert(1)</script>', name: 'XSS' },
          ],
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].link).toBeUndefined();
    });
  });

  describe('cover images', () => {
    it('should extract cover image URL from scaled array', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
          cover: {
            scaled: [
              { url: 'https://example.com/small.jpg', width: 150, height: 100 },
              { url: 'https://example.com/medium.jpg', width: 300, height: 200 },
              { url: 'https://example.com/large.jpg', width: 600, height: 400 },
            ],
          },
        }],
      });

      const result = convertTrelloExport(trelloData);

      // Should use the largest (last) image
      expect(result.cards[0].coverImageUrl).toBe('https://example.com/large.jpg');
    });

    it('should not set coverImageUrl when cover has no scaled images', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
          cover: {
            color: 'yellow',
          },
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].coverImageUrl).toBeUndefined();
    });

    it('should not set coverImageUrl when cover scaled array is empty', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
          cover: {
            scaled: [],
          },
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].coverImageUrl).toBeUndefined();
    });

    it('should not set coverImageUrl when no cover', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].coverImageUrl).toBeUndefined();
    });

    it('should drop javascript: cover image URLs', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
          cover: {
            scaled: [
              { url: 'javascript:alert(1)', width: 600, height: 400 },
            ],
          },
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].coverImageUrl).toBeUndefined();
    });

    it('should drop data: cover image URLs', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Task',
          desc: '',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: null,
          dateLastActivity: '2024-01-01',
          cover: {
            scaled: [
              { url: 'data:text/html,<script>alert(1)</script>', width: 600, height: 400 },
            ],
          },
        }],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.cards[0].coverImageUrl).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw error for non-Trello format', () => {
      const data = { foo: 'bar' };

      expect(() => convertTrelloExport(data)).toThrow(
        'Invalid Trello export format'
      );
    });

    it('should throw helpful error for Board export format', () => {
      const boardExport = {
        version: 1,
        exportedAt: '2024-01-01',
        projects: [],
        lists: [],
        cards: [],
      };

      expect(() => convertTrelloExport(boardExport)).toThrow(
        'This appears to be a Board backup file, not a Trello export'
      );
    });

    it('should throw error for null', () => {
      expect(() => convertTrelloExport(null)).toThrow(
        'Invalid Trello export format'
      );
    });

    it('should throw error for undefined', () => {
      expect(() => convertTrelloExport(undefined)).toThrow(
        'Invalid Trello export format'
      );
    });

    it('should throw error for non-object', () => {
      expect(() => convertTrelloExport('string')).toThrow(
        'Invalid Trello export format'
      );
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple lists with multiple cards each', () => {
      const trelloData = createTrelloExport({
        name: 'Complex Board',
        lists: [
          { id: 'list-1', name: 'To Do', closed: false, pos: 100 },
          { id: 'list-2', name: 'In Progress', closed: false, pos: 200 },
          { id: 'list-3', name: 'Done', closed: false, pos: 300 },
        ],
        cards: [
          { id: 'card-1', name: 'Task 1', desc: '', closed: false, idList: 'list-1', pos: 100, due: null, dateLastActivity: '2024-01-01' },
          { id: 'card-2', name: 'Task 2', desc: '', closed: false, idList: 'list-1', pos: 200, due: null, dateLastActivity: '2024-01-01' },
          { id: 'card-3', name: 'Task 3', desc: '', closed: false, idList: 'list-2', pos: 100, due: null, dateLastActivity: '2024-01-01' },
          { id: 'card-4', name: 'Task 4', desc: '', closed: false, idList: 'list-3', pos: 100, due: null, dateLastActivity: '2024-01-01' },
          { id: 'card-5', name: 'Task 5', desc: '', closed: false, idList: 'list-3', pos: 200, due: null, dateLastActivity: '2024-01-01' },
        ],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.projects).toHaveLength(1);
      expect(result.lists).toHaveLength(3);
      expect(result.cards).toHaveLength(5);

      // Verify cards are in correct lists
      const todoList = result.lists.find(l => l.name === 'To Do');
      const todoCards = result.cards.filter(c => c.listId === todoList?.id);
      expect(todoCards).toHaveLength(2);
    });

    it('should handle board with all items archived', () => {
      const trelloData = createTrelloExport({
        name: 'All Archived',
        lists: [
          { id: 'list-1', name: 'Archived List', closed: true, pos: 100 },
        ],
        cards: [
          { id: 'card-1', name: 'Archived Card', desc: '', closed: true, idList: 'list-1', pos: 100, due: null, dateLastActivity: '2024-01-01' },
        ],
      });

      const result = convertTrelloExport(trelloData);

      expect(result.projects).toHaveLength(1);
      expect(result.lists).toHaveLength(0);
      expect(result.cards).toHaveLength(0);
    });

    it('should handle card with all optional fields', () => {
      const trelloData = createTrelloExport({
        lists: [{ id: 'list-1', name: 'To Do', closed: false, pos: 100 }],
        cards: [{
          id: 'card-1',
          name: 'Full Card',
          desc: 'Full description with **markdown**',
          closed: false,
          idList: 'list-1',
          pos: 100,
          due: '2024-12-31T23:59:59.000Z',
          dateLastActivity: '2024-06-15T10:30:00.000Z',
          attachments: [
            { id: 'att-1', url: 'https://example.com/link', name: 'Link' },
          ],
          cover: {
            scaled: [
              { url: 'https://example.com/cover.jpg', width: 600, height: 400 },
            ],
          },
        }],
      });

      const result = convertTrelloExport(trelloData);
      const card = result.cards[0];

      expect(card.title).toBe('Full Card');
      expect(card.description).toBe('Full description with **markdown**');
      expect(card.dueDate).toBe('2024-12-31T23:59:59.000Z');
      expect(card.updatedAt).toBe('2024-06-15T10:30:00.000Z');
      expect(card.link).toBe('https://example.com/link');
      expect(card.coverImageUrl).toBe('https://example.com/cover.jpg');
    });
  });
});
