/**
 * Storage Abstraction Layer
 * 
 * Provides a unified interface for data persistence.
 * The storage backend is selected at build time via the VITE_STORAGE_MODE env var:
 * 
 * - 'api'   - Server-side persistence via Express API + SQLite (self-hosted/Docker)
 * - 'local' - Browser localStorage (default, used for GitHub Pages)
 * 
 * @see /src/storage/localStorage.ts for the localStorage backend
 * @see /src/storage/api.ts for the API backend
 */

import type { Project, List, Card } from '../types';

export interface StorageData {
  projects: Project[];
  lists: List[];
  cards: Card[];
}

const isApiMode = import.meta.env.VITE_STORAGE_MODE === 'api';

/**
 * Load board data from the configured storage backend.
 * @returns Promise resolving to the stored data (or empty arrays if none)
 */
export async function loadData(): Promise<StorageData> {
  if (isApiMode) {
    const { loadFromApi } = await import('./api');
    return loadFromApi();
  }
  const { loadFromStorage } = await import('./localStorage');
  return loadFromStorage();
}

/**
 * Save board data to the configured storage backend.
 * @param data - The board data to persist
 */
export async function saveData(data: StorageData): Promise<void> {
  if (isApiMode) {
    const { saveToApi } = await import('./api');
    return saveToApi(data);
  }
  const { saveToStorage } = await import('./localStorage');
  saveToStorage(data);
}

/**
 * Clear all board data from the configured storage backend.
 */
export async function clearData(): Promise<void> {
  if (isApiMode) {
    const { clearApi } = await import('./api');
    return clearApi();
  }
  const { clearStorage } = await import('./localStorage');
  clearStorage();
}
