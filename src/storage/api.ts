/**
 * API Storage Backend
 * 
 * This module provides functions for persisting board data to a backend API
 * when running in self-hosted/server mode (e.g., via Docker).
 * 
 * Currently unused - the app uses localStorage by default.
 * This is intended for future implementation of server-side persistence
 * when the backend Express server is enabled.
 * 
 * @see /server/index.js for the backend implementation
 */

import type { Project, List, Card } from '../types';

const API_URL = '/api';

interface StorageData {
  projects: Project[];
  lists: List[];
  cards: Card[];
}

export async function loadFromApi(): Promise<StorageData> {
  try {
    const response = await fetch(`${API_URL}/data`);
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    const data = await response.json();
    return {
      projects: data.projects ?? [],
      lists: data.lists ?? [],
      cards: data.cards ?? [],
    };
  } catch (error) {
    console.error('Failed to load data from API:', error);
    return { projects: [], lists: [], cards: [] };
  }
}

export async function saveToApi(data: StorageData): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to save data');
    }
  } catch (error) {
    console.error('Failed to save data to API:', error);
  }
}

export async function clearApi(): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/data`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('Failed to clear data');
    }
  } catch (error) {
    console.error('Failed to clear data from API:', error);
  }
}
