import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadFromStorage, saveToStorage, clearStorage } from './localStorage';

describe('localStorage', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    };
  })();

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('loadFromStorage', () => {
    it('should return empty arrays when localStorage is empty', () => {
      const result = loadFromStorage();
      expect(result).toEqual({
        projects: [],
        lists: [],
        cards: [],
      });
    });

    it('should load valid data from localStorage', () => {
      const validData = {
        projects: [
          { id: '1', name: 'Project 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        ],
        lists: [
          { id: 'l1', projectId: '1', name: 'List 1', position: 0 },
        ],
        cards: [
          { id: 'c1', listId: 'l1', title: 'Card 1', description: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        ],
      };
      localStorageMock.setItem('board-data', JSON.stringify(validData));

      const result = loadFromStorage();
      expect(result).toEqual(validData);
    });

    describe('should handle corrupted data gracefully', () => {
      it('handles invalid JSON', () => {
        localStorageMock.setItem('board-data', 'not valid json {{{');
        
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = loadFromStorage();
        
        expect(result).toEqual({ projects: [], lists: [], cards: [] });
        expect(consoleError).toHaveBeenCalled();
        consoleError.mockRestore();
      });

      it('handles null data', () => {
        localStorageMock.setItem('board-data', 'null');
        
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = loadFromStorage();
        
        expect(result).toEqual({ projects: [], lists: [], cards: [] });
        consoleError.mockRestore();
      });

      it('handles data that is not an object', () => {
        localStorageMock.setItem('board-data', '"just a string"');
        
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = loadFromStorage();
        
        expect(result).toEqual({ projects: [], lists: [], cards: [] });
        consoleError.mockRestore();
      });

      it('handles projects that are not an array', () => {
        localStorageMock.setItem('board-data', JSON.stringify({
          projects: 'not an array',
          lists: [],
          cards: [],
        }));
        
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = loadFromStorage();
        
        expect(result).toEqual({ projects: [], lists: [], cards: [] });
        consoleError.mockRestore();
      });

      it('handles projects with missing required fields', () => {
        localStorageMock.setItem('board-data', JSON.stringify({
          projects: [{ id: '1' }], // Missing name, createdAt, updatedAt
          lists: [],
          cards: [],
        }));
        
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = loadFromStorage();
        
        expect(result).toEqual({ projects: [], lists: [], cards: [] });
        consoleError.mockRestore();
      });

      it('handles lists with missing required fields', () => {
        localStorageMock.setItem('board-data', JSON.stringify({
          projects: [{ id: '1', name: 'P', createdAt: '2024-01-01', updatedAt: '2024-01-01' }],
          lists: [{ id: 'l1' }], // Missing projectId, name, position
          cards: [],
        }));
        
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = loadFromStorage();
        
        expect(result).toEqual({ projects: [], lists: [], cards: [] });
        consoleError.mockRestore();
      });

      it('handles cards with missing required fields', () => {
        localStorageMock.setItem('board-data', JSON.stringify({
          projects: [{ id: '1', name: 'P', createdAt: '2024-01-01', updatedAt: '2024-01-01' }],
          lists: [{ id: 'l1', projectId: '1', name: 'L', position: 0 }],
          cards: [{ id: 'c1' }], // Missing most fields
        }));
        
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = loadFromStorage();
        
        expect(result).toEqual({ projects: [], lists: [], cards: [] });
        consoleError.mockRestore();
      });

      it('handles array items that are not objects', () => {
        localStorageMock.setItem('board-data', JSON.stringify({
          projects: ['string', 123, null],
          lists: [],
          cards: [],
        }));
        
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = loadFromStorage();
        
        expect(result).toEqual({ projects: [], lists: [], cards: [] });
        consoleError.mockRestore();
      });
    });
  });

  describe('saveToStorage', () => {
    it('should save data to localStorage', () => {
      const data = {
        projects: [{ id: '1', name: 'Test', createdAt: '2024-01-01', updatedAt: '2024-01-01' }],
        lists: [],
        cards: [],
      };

      saveToStorage(data);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'board-data',
        JSON.stringify(data)
      );
    });

    it('should handle localStorage quota exceeded error', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      const data = {
        projects: [],
        lists: [],
        cards: [],
      };

      // Should not throw, just log error
      expect(() => saveToStorage(data)).not.toThrow();
      expect(consoleError).toHaveBeenCalled();
      
      consoleError.mockRestore();
    });
  });

  describe('clearStorage', () => {
    it('should remove data from localStorage', () => {
      localStorageMock.setItem('board-data', JSON.stringify({ projects: [], lists: [], cards: [] }));
      
      clearStorage();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('board-data');
    });
  });
});
