import { describe, it, expect, beforeEach } from 'vitest';
import { useBoardStore } from '../store';
import { 
  exportAllData, 
  parseImportFile, 
  validateAndPrepareImport,
  validateSchema 
} from './importExport';
import type { BoardExport, Project, List, Card } from '../types';

// Test fixtures
const now = '2024-01-01T00:00:00.000Z';

const createProject = (id: string, name: string): Project => ({
  id,
  name,
  createdAt: now,
  updatedAt: now,
});

const createList = (id: string, projectId: string, name: string, position: number): List => ({
  id,
  projectId,
  name,
  position,
});

const createCard = (
  id: string, 
  listId: string, 
  title: string, 
  position: number,
  options?: { link?: string; coverImageUrl?: string; dueDate?: string }
): Card => ({
  id,
  listId,
  title,
  description: '',
  position,
  createdAt: now,
  updatedAt: now,
  ...options,
});

const createValidExport = (overrides?: Partial<BoardExport>): BoardExport => ({
  version: 1,
  exportedAt: now,
  projects: [createProject('proj-1', 'Project 1')],
  lists: [createList('list-1', 'proj-1', 'List 1', 0)],
  cards: [createCard('card-1', 'list-1', 'Card 1', 0)],
  ...overrides,
});

// Helper to create a mock File
const createMockFile = (content: string, name = 'test.json'): File => {
  return new File([content], name, { type: 'application/json' });
};

describe('importExport', () => {
  beforeEach(() => {
    // Reset store to empty state
    useBoardStore.setState({
      projects: [],
      lists: [],
      cards: [],
      activeProjectId: null,
      isInitialized: true,
    });
  });

  describe('exportAllData', () => {
    it('exports correct structure with version 1', () => {
      const result = exportAllData();
      
      expect(result).toHaveProperty('version', 1);
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('lists');
      expect(result).toHaveProperty('cards');
    });

    it('includes all store data', () => {
      const project = createProject('proj-1', 'Test Project');
      const list = createList('list-1', 'proj-1', 'Test List', 0);
      const card = createCard('card-1', 'list-1', 'Test Card', 0);
      
      useBoardStore.setState({
        projects: [project],
        lists: [list],
        cards: [card],
      });
      
      const result = exportAllData();
      
      expect(result.projects).toEqual([project]);
      expect(result.lists).toEqual([list]);
      expect(result.cards).toEqual([card]);
    });

    it('exportedAt is valid ISO timestamp', () => {
      const before = new Date().toISOString();
      const result = exportAllData();
      const after = new Date().toISOString();
      
      expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.exportedAt >= before).toBe(true);
      expect(result.exportedAt <= after).toBe(true);
    });
  });

  describe('JSON output format', () => {
    it('produces correctly formatted JSON matching expected structure', () => {
      const project = createProject('proj-1', 'Test Project');
      const list = createList('list-1', 'proj-1', 'Test List', 0);
      const card = createCard('card-1', 'list-1', 'Test Card', 0);
      
      useBoardStore.setState({
        projects: [project],
        lists: [list],
        cards: [card],
      });
      
      const result = exportAllData();
      const json = JSON.stringify(result, null, 2);
      const parsed = JSON.parse(json);
      
      // Verify structure is preserved after stringify/parse
      expect(parsed.version).toBe(1);
      expect(parsed.projects).toHaveLength(1);
      expect(parsed.lists).toHaveLength(1);
      expect(parsed.cards).toHaveLength(1);
      
      // Verify all fields are present
      expect(parsed.projects[0]).toEqual(project);
      expect(parsed.lists[0]).toEqual(list);
      expect(parsed.cards[0]).toEqual(card);
    });
  });

  describe('parseImportFile', () => {
    it('parses valid JSON file', async () => {
      const exportData = createValidExport();
      const file = createMockFile(JSON.stringify(exportData));
      
      const result = await parseImportFile(file);
      
      expect(result.version).toBe(1);
      expect(result.projects).toEqual(exportData.projects);
      expect(result.lists).toEqual(exportData.lists);
      expect(result.cards).toEqual(exportData.cards);
    });

    it('rejects invalid JSON', async () => {
      const file = createMockFile('{ invalid json }');
      
      await expect(parseImportFile(file)).rejects.toThrow();
    });

    it('rejects wrong version', async () => {
      const exportData = { ...createValidExport(), version: 2 };
      const file = createMockFile(JSON.stringify(exportData));
      
      await expect(parseImportFile(file)).rejects.toThrow('Unsupported export version');
    });

    it('rejects missing projects array', async () => {
      const exportData = { version: 1, exportedAt: now, lists: [], cards: [] };
      const file = createMockFile(JSON.stringify(exportData));
      
      await expect(parseImportFile(file)).rejects.toThrow('Invalid export format');
    });

    it('rejects missing lists array', async () => {
      const exportData = { version: 1, exportedAt: now, projects: [], cards: [] };
      const file = createMockFile(JSON.stringify(exportData));
      
      await expect(parseImportFile(file)).rejects.toThrow('Invalid export format');
    });

    it('rejects missing cards array', async () => {
      const exportData = { version: 1, exportedAt: now, projects: [], lists: [] };
      const file = createMockFile(JSON.stringify(exportData));
      
      await expect(parseImportFile(file)).rejects.toThrow('Invalid export format');
    });

    it('rejects non-array projects', async () => {
      const exportData = { version: 1, exportedAt: now, projects: {}, lists: [], cards: [] };
      const file = createMockFile(JSON.stringify(exportData));
      
      await expect(parseImportFile(file)).rejects.toThrow('Invalid export format');
    });
  });

  describe('validateSchema', () => {
    describe('project validation', () => {
      it('rejects project missing id', () => {
        const data = createValidExport({
          projects: [{ name: 'Test', createdAt: now, updatedAt: now } as Project],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid project at index 0: missing or invalid id');
      });

      it('rejects project missing name', () => {
        const data = createValidExport({
          projects: [{ id: 'proj-1', createdAt: now, updatedAt: now } as Project],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid project at index 0: missing or invalid name');
      });

      it('rejects project missing createdAt', () => {
        const data = createValidExport({
          projects: [{ id: 'proj-1', name: 'Test', updatedAt: now } as Project],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid project at index 0: missing or invalid createdAt');
      });

      it('rejects project missing updatedAt', () => {
        const data = createValidExport({
          projects: [{ id: 'proj-1', name: 'Test', createdAt: now } as Project],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid project at index 0: missing or invalid updatedAt');
      });

      it('rejects project with non-string id', () => {
        const data = createValidExport({
          projects: [{ id: 123, name: 'Test', createdAt: now, updatedAt: now } as unknown as Project],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid project at index 0: missing or invalid id');
      });
    });

    describe('list validation', () => {
      it('rejects list missing id', () => {
        const data = createValidExport({
          lists: [{ projectId: 'proj-1', name: 'Test', position: 0 } as List],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid list at index 0: missing or invalid id');
      });

      it('rejects list missing projectId', () => {
        const data = createValidExport({
          lists: [{ id: 'list-1', name: 'Test', position: 0 } as List],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid list at index 0: missing or invalid projectId');
      });

      it('rejects list missing name', () => {
        const data = createValidExport({
          lists: [{ id: 'list-1', projectId: 'proj-1', position: 0 } as List],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid list at index 0: missing or invalid name');
      });

      it('rejects list missing position', () => {
        const data = createValidExport({
          lists: [{ id: 'list-1', projectId: 'proj-1', name: 'Test' } as List],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid list at index 0: missing or invalid position');
      });

      it('rejects list with non-number position', () => {
        const data = createValidExport({
          lists: [{ id: 'list-1', projectId: 'proj-1', name: 'Test', position: '0' } as unknown as List],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid list at index 0: missing or invalid position');
      });
    });

    describe('card validation', () => {
      it('rejects card missing id', () => {
        const data = createValidExport({
          cards: [{ listId: 'list-1', title: 'Test', description: '', position: 0, createdAt: now, updatedAt: now } as Card],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid card at index 0: missing or invalid id');
      });

      it('rejects card missing listId', () => {
        const data = createValidExport({
          cards: [{ id: 'card-1', title: 'Test', description: '', position: 0, createdAt: now, updatedAt: now } as Card],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid card at index 0: missing or invalid listId');
      });

      it('rejects card missing title', () => {
        const data = createValidExport({
          cards: [{ id: 'card-1', listId: 'list-1', description: '', position: 0, createdAt: now, updatedAt: now } as Card],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid card at index 0: missing or invalid title');
      });

      it('rejects card missing description', () => {
        const data = createValidExport({
          cards: [{ id: 'card-1', listId: 'list-1', title: 'Test', position: 0, createdAt: now, updatedAt: now } as Card],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid card at index 0: missing or invalid description');
      });

      it('rejects card missing position', () => {
        const data = createValidExport({
          cards: [{ id: 'card-1', listId: 'list-1', title: 'Test', description: '', createdAt: now, updatedAt: now } as Card],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid card at index 0: missing or invalid position');
      });

      it('rejects card with non-number position', () => {
        const data = createValidExport({
          cards: [{ id: 'card-1', listId: 'list-1', title: 'Test', description: '', position: 'zero', createdAt: now, updatedAt: now } as unknown as Card],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid card at index 0: missing or invalid position');
      });

      it('rejects card missing createdAt', () => {
        const data = createValidExport({
          cards: [{ id: 'card-1', listId: 'list-1', title: 'Test', description: '', position: 0, updatedAt: now } as Card],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid card at index 0: missing or invalid createdAt');
      });

      it('rejects card missing updatedAt', () => {
        const data = createValidExport({
          cards: [{ id: 'card-1', listId: 'list-1', title: 'Test', description: '', position: 0, createdAt: now } as Card],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid card at index 0: missing or invalid updatedAt');
      });

      it('accepts card with optional fields', () => {
        const data = createValidExport({
          cards: [createCard('card-1', 'list-1', 'Test', 0, {
            link: 'https://example.com',
            coverImageUrl: 'https://example.com/image.png',
            dueDate: '2024-12-31',
          })],
        });
        
        expect(() => validateSchema(data)).not.toThrow();
      });

      it('accepts card without optional fields', () => {
        const data = createValidExport({
          cards: [createCard('card-1', 'list-1', 'Test', 0)],
        });
        
        expect(() => validateSchema(data)).not.toThrow();
      });

      it('rejects card with invalid optional link', () => {
        const data = createValidExport({
          cards: [{ 
            id: 'card-1', 
            listId: 'list-1', 
            title: 'Test', 
            description: '', 
            position: 0, 
            createdAt: now, 
            updatedAt: now,
            link: 123,
          } as unknown as Card],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid card at index 0: invalid link');
      });

      it('rejects card with invalid optional coverImageUrl', () => {
        const data = createValidExport({
          cards: [{ 
            id: 'card-1', 
            listId: 'list-1', 
            title: 'Test', 
            description: '', 
            position: 0, 
            createdAt: now, 
            updatedAt: now,
            coverImageUrl: 123,
          } as unknown as Card],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid card at index 0: invalid coverImageUrl');
      });

      it('rejects card with invalid optional dueDate', () => {
        const data = createValidExport({
          cards: [{ 
            id: 'card-1', 
            listId: 'list-1', 
            title: 'Test', 
            description: '', 
            position: 0, 
            createdAt: now, 
            updatedAt: now,
            dueDate: 123,
          } as unknown as Card],
        });
        
        expect(() => validateSchema(data)).toThrow('Invalid card at index 0: invalid dueDate');
      });
    });

    describe('duplicate ID validation', () => {
      it('rejects duplicate project IDs', () => {
        const data = createValidExport({
          projects: [
            createProject('proj-1', 'Project 1'),
            createProject('proj-1', 'Project 2'),
          ],
          lists: [],
          cards: [],
        });
        
        expect(() => validateSchema(data)).toThrow('Duplicate project id: proj-1');
      });

      it('rejects duplicate list IDs', () => {
        const data = createValidExport({
          lists: [
            createList('list-1', 'proj-1', 'List 1', 0),
            createList('list-1', 'proj-1', 'List 2', 1),
          ],
          cards: [],
        });
        
        expect(() => validateSchema(data)).toThrow('Duplicate list id: list-1');
      });

      it('rejects duplicate card IDs', () => {
        const data = createValidExport({
          cards: [
            createCard('card-1', 'list-1', 'Card 1', 0),
            createCard('card-1', 'list-1', 'Card 2', 1),
          ],
        });
        
        expect(() => validateSchema(data)).toThrow('Duplicate card id: card-1');
      });
    });

    describe('referential integrity', () => {
      it('rejects list referencing non-existent project', () => {
        const data = createValidExport({
          projects: [createProject('proj-1', 'Project 1')],
          lists: [createList('list-1', 'proj-999', 'List 1', 0)],
          cards: [],
        });
        
        expect(() => validateSchema(data)).toThrow("List 'list-1' references non-existent project 'proj-999'");
      });

      it('rejects card referencing non-existent list', () => {
        const data = createValidExport({
          cards: [createCard('card-1', 'list-999', 'Card 1', 0)],
        });
        
        expect(() => validateSchema(data)).toThrow("Card 'card-1' references non-existent list 'list-999'");
      });
    });
  });

  describe('validateAndPrepareImport - ID conflict resolution', () => {
    it('returns data unchanged when no conflicts', () => {
      const data = createValidExport();
      
      const result = validateAndPrepareImport(data, [], [], []);
      
      expect(result.projects).toEqual(data.projects);
      expect(result.lists).toEqual(data.lists);
      expect(result.cards).toEqual(data.cards);
    });

    it('regenerates project ID on conflict', () => {
      const existingProject = createProject('proj-1', 'Existing');
      const data = createValidExport();
      
      const result = validateAndPrepareImport(data, [existingProject], [], []);
      
      expect(result.projects[0].id).not.toBe('proj-1');
      expect(result.projects[0].name).toBe('Project 1');
    });

    it('regenerates list ID on conflict', () => {
      const existingList = createList('list-1', 'other-proj', 'Existing', 0);
      const data = createValidExport();
      
      const result = validateAndPrepareImport(data, [], [existingList], []);
      
      expect(result.lists[0].id).not.toBe('list-1');
      expect(result.lists[0].name).toBe('List 1');
    });

    it('regenerates card ID on conflict', () => {
      const existingCard = createCard('card-1', 'other-list', 'Existing', 0);
      const data = createValidExport();
      
      const result = validateAndPrepareImport(data, [], [], [existingCard]);
      
      expect(result.cards[0].id).not.toBe('card-1');
      expect(result.cards[0].title).toBe('Card 1');
    });

    it('updates list.projectId when project ID regenerated', () => {
      const existingProject = createProject('proj-1', 'Existing');
      const data = createValidExport();
      
      const result = validateAndPrepareImport(data, [existingProject], [], []);
      
      const newProjectId = result.projects[0].id;
      expect(result.lists[0].projectId).toBe(newProjectId);
    });

    it('updates card.listId when list ID regenerated', () => {
      const existingList = createList('list-1', 'other-proj', 'Existing', 0);
      const data = createValidExport();
      
      const result = validateAndPrepareImport(data, [], [existingList], []);
      
      const newListId = result.lists[0].id;
      expect(result.cards[0].listId).toBe(newListId);
    });

    it('handles cascading ID changes (project → list → card)', () => {
      const existingProject = createProject('proj-1', 'Existing Project');
      const data = createValidExport();
      
      const result = validateAndPrepareImport(data, [existingProject], [], []);
      
      // All IDs should be regenerated due to cascade
      expect(result.projects[0].id).not.toBe('proj-1');
      expect(result.lists[0].id).not.toBe('list-1');
      expect(result.cards[0].id).not.toBe('card-1');
      
      // References should be updated correctly
      expect(result.lists[0].projectId).toBe(result.projects[0].id);
      expect(result.cards[0].listId).toBe(result.lists[0].id);
    });

    it('handles mixed conflicts - some IDs conflict, some do not', () => {
      const data: BoardExport = {
        version: 1,
        exportedAt: now,
        projects: [
          createProject('proj-1', 'Project 1'),
          createProject('proj-2', 'Project 2'),
        ],
        lists: [
          createList('list-1', 'proj-1', 'List 1', 0),
          createList('list-2', 'proj-2', 'List 2', 0),
        ],
        cards: [
          createCard('card-1', 'list-1', 'Card 1', 0),
          createCard('card-2', 'list-2', 'Card 2', 0),
        ],
      };
      
      // Only proj-1 conflicts
      const existingProject = createProject('proj-1', 'Existing');
      
      const result = validateAndPrepareImport(data, [existingProject], [], []);
      
      // proj-1 gets new ID, proj-2 keeps original
      expect(result.projects[0].id).not.toBe('proj-1');
      expect(result.projects[1].id).toBe('proj-2');
      
      // list-1 gets new ID (due to project cascade), list-2 keeps original
      expect(result.lists[0].id).not.toBe('list-1');
      expect(result.lists[1].id).toBe('list-2');
      
      // card-1 gets new ID (due to list cascade), card-2 keeps original
      expect(result.cards[0].id).not.toBe('card-1');
      expect(result.cards[1].id).toBe('card-2');
    });
  });

  describe('round-trip', () => {
    it('export and re-import produces equivalent data', () => {
      const project = createProject('proj-1', 'Test Project');
      const list = createList('list-1', 'proj-1', 'Test List', 0);
      const card = createCard('card-1', 'list-1', 'Test Card', 0, {
        link: 'https://example.com',
        dueDate: '2024-12-31',
      });
      
      useBoardStore.setState({
        projects: [project],
        lists: [list],
        cards: [card],
      });
      
      const exported = exportAllData();
      
      // Reset store
      useBoardStore.setState({
        projects: [],
        lists: [],
        cards: [],
      });
      
      const prepared = validateAndPrepareImport(exported, [], [], []);
      
      // Data should be equivalent (excluding exportedAt)
      expect(prepared.projects).toEqual([project]);
      expect(prepared.lists).toEqual([list]);
      expect(prepared.cards).toEqual([card]);
    });

    it('double import creates duplicates with new IDs', () => {
      const data = createValidExport();
      
      // First import
      const first = validateAndPrepareImport(data, [], [], []);
      
      // Simulate first import was added to store
      // Second import with first import's data as existing
      const second = validateAndPrepareImport(data, first.projects, first.lists, first.cards);
      
      // All IDs should be different
      expect(second.projects[0].id).not.toBe(first.projects[0].id);
      expect(second.lists[0].id).not.toBe(first.lists[0].id);
      expect(second.cards[0].id).not.toBe(first.cards[0].id);
      
      // But content should be the same
      expect(second.projects[0].name).toBe(first.projects[0].name);
      expect(second.lists[0].name).toBe(first.lists[0].name);
      expect(second.cards[0].title).toBe(first.cards[0].title);
    });
  });

  describe('edge cases', () => {
    it('handles empty data', () => {
      const data: BoardExport = {
        version: 1,
        exportedAt: now,
        projects: [],
        lists: [],
        cards: [],
      };
      
      const result = validateAndPrepareImport(data, [], [], []);
      
      expect(result.projects).toEqual([]);
      expect(result.lists).toEqual([]);
      expect(result.cards).toEqual([]);
    });

    it('handles special characters in content', () => {
      const data: BoardExport = {
        version: 1,
        exportedAt: now,
        projects: [createProject('proj-1', '日本語プロジェクト 🎉')],
        lists: [createList('list-1', 'proj-1', 'List with "quotes" & <tags>', 0)],
        cards: [createCard('card-1', 'list-1', 'Card with\nnewlines\tand\ttabs', 0)],
      };
      
      // Should not throw
      const result = validateAndPrepareImport(data, [], [], []);
      
      expect(result.projects[0].name).toBe('日本語プロジェクト 🎉');
      expect(result.lists[0].name).toBe('List with "quotes" & <tags>');
      expect(result.cards[0].title).toBe('Card with\nnewlines\tand\ttabs');
    });

    it('handles cards with all optional fields', () => {
      const card = createCard('card-1', 'list-1', 'Test', 0, {
        link: 'https://example.com',
        coverImageUrl: 'https://example.com/cover.jpg',
        dueDate: '2024-12-31T23:59:59.000Z',
      });
      
      const data = createValidExport({ cards: [card] });
      
      const result = validateAndPrepareImport(data, [], [], []);
      
      expect(result.cards[0].link).toBe('https://example.com');
      expect(result.cards[0].coverImageUrl).toBe('https://example.com/cover.jpg');
      expect(result.cards[0].dueDate).toBe('2024-12-31T23:59:59.000Z');
    });

    it('handles multiple projects with multiple lists and cards', () => {
      const data: BoardExport = {
        version: 1,
        exportedAt: now,
        projects: [
          createProject('proj-1', 'Project 1'),
          createProject('proj-2', 'Project 2'),
        ],
        lists: [
          createList('list-1', 'proj-1', 'List 1-1', 0),
          createList('list-2', 'proj-1', 'List 1-2', 1),
          createList('list-3', 'proj-2', 'List 2-1', 0),
        ],
        cards: [
          createCard('card-1', 'list-1', 'Card 1', 0),
          createCard('card-2', 'list-1', 'Card 2', 1),
          createCard('card-3', 'list-2', 'Card 3', 0),
          createCard('card-4', 'list-3', 'Card 4', 0),
        ],
      };
      
      const result = validateAndPrepareImport(data, [], [], []);
      
      expect(result.projects).toHaveLength(2);
      expect(result.lists).toHaveLength(3);
      expect(result.cards).toHaveLength(4);
      
      // Verify relationships preserved
      expect(result.lists.filter(l => l.projectId === 'proj-1')).toHaveLength(2);
      expect(result.lists.filter(l => l.projectId === 'proj-2')).toHaveLength(1);
      expect(result.cards.filter(c => c.listId === 'list-1')).toHaveLength(2);
    });
  });
});
