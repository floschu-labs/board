import type { Project, List, Card } from '../types';

const STORAGE_KEY = 'board-data';

interface StorageData {
  projects: Project[];
  lists: List[];
  cards: Card[];
}

/**
 * Safely validate that an array contains valid objects with expected properties.
 * This provides basic type checking without full schema validation to avoid
 * circular dependencies with the validation module.
 */
function isValidArray(arr: unknown, requiredProps: string[]): boolean {
  if (!Array.isArray(arr)) return false;
  return arr.every(item => {
    if (!item || typeof item !== 'object') return false;
    return requiredProps.every(prop => prop in item);
  });
}

/**
 * Load data from localStorage with validation.
 * If data is corrupted or invalid, returns empty arrays to prevent crashes.
 * 
 * SECURITY: This function validates the structure of localStorage data
 * to prevent crashes from corrupted or tampered data.
 */
export function loadFromStorage(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { projects: [], lists: [], cards: [] };
    }
    
    const data = JSON.parse(raw);
    
    // Validate basic structure
    if (!data || typeof data !== 'object') {
      console.error('localStorage data is not an object, resetting');
      return { projects: [], lists: [], cards: [] };
    }
    
    // Validate projects array
    const projectProps = ['id', 'name', 'createdAt', 'updatedAt'];
    if (!isValidArray(data.projects, projectProps)) {
      console.error('localStorage projects array is invalid, resetting');
      return { projects: [], lists: [], cards: [] };
    }
    
    // Validate lists array
    const listProps = ['id', 'projectId', 'name', 'position'];
    if (!isValidArray(data.lists, listProps)) {
      console.error('localStorage lists array is invalid, resetting');
      return { projects: [], lists: [], cards: [] };
    }
    
    // Validate cards array
    const cardProps = ['id', 'listId', 'title', 'description', 'position', 'createdAt', 'updatedAt'];
    if (!isValidArray(data.cards, cardProps)) {
      console.error('localStorage cards array is invalid, resetting');
      return { projects: [], lists: [], cards: [] };
    }
    
    return {
      projects: data.projects as Project[],
      lists: data.lists as List[],
      cards: data.cards as Card[],
    };
  } catch (error) {
    console.error('Failed to load data from localStorage:', error);
    return { projects: [], lists: [], cards: [] };
  }
}

export function saveToStorage(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data to localStorage:', error);
  }
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
