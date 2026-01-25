import type { Project, List, Card, BoardExport } from '../types';
import { useBoardStore } from '../store';
import { validateSchema } from './validation';

// Re-export validateSchema for use elsewhere
export { validateSchema };

export function exportAllData(): BoardExport {
  const { projects, lists, cards } = useBoardStore.getState();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects,
    lists,
    cards,
  };
}

export function downloadJson(data: BoardExport, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportFile(file: File): Promise<BoardExport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as BoardExport;
        
        // Validate structure
        if (data.version !== 1) {
          throw new Error('Unsupported export version');
        }
        if (!Array.isArray(data.projects) || !Array.isArray(data.lists) || !Array.isArray(data.cards)) {
          throw new Error('Invalid export format');
        }
        
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function validateAndPrepareImport(
  data: BoardExport, 
  existingProjects: Project[],
  existingLists?: List[],
  existingCards?: Card[]
): {
  projects: Project[];
  lists: List[];
  cards: Card[];
} {
  // Validate schema before processing
  validateSchema(data);
  
  // Get existing IDs from store if not provided
  const storeState = useBoardStore.getState();
  const allExistingLists = existingLists ?? storeState.lists;
  const allExistingCards = existingCards ?? storeState.cards;
  
  // Build sets of all existing IDs
  const existingProjectIds = new Set(existingProjects.map((p) => p.id));
  const existingListIds = new Set(allExistingLists.map((l) => l.id));
  const existingCardIds = new Set(allExistingCards.map((c) => c.id));
  
  const projectIdMap = new Map<string, string>(); // old project id -> new project id
  const listIdMap = new Map<string, string>(); // old list id -> new list id
  const cardIdMap = new Map<string, string>(); // old card id -> new card id
  
  // Process projects - regenerate IDs if they conflict
  const projects = data.projects.map((p) => {
    if (existingProjectIds.has(p.id)) {
      const newId = crypto.randomUUID();
      projectIdMap.set(p.id, newId);
      return { ...p, id: newId };
    }
    return p;
  });

  // Process lists - regenerate IDs if they conflict OR if parent project ID was regenerated
  const lists = data.lists.map((l) => {
    const newProjectId = projectIdMap.get(l.projectId) ?? l.projectId;
    const needsNewId = projectIdMap.has(l.projectId) || existingListIds.has(l.id);
    
    if (needsNewId) {
      const newListId = crypto.randomUUID();
      listIdMap.set(l.id, newListId);
      return { ...l, id: newListId, projectId: newProjectId };
    }
    return { ...l, projectId: newProjectId };
  });

  // Process cards - regenerate IDs if they conflict OR if parent list ID was regenerated
  const cards = data.cards.map((c) => {
    const newListId = listIdMap.get(c.listId) ?? c.listId;
    const needsNewId = listIdMap.has(c.listId) || existingCardIds.has(c.id);
    
    if (needsNewId) {
      const newCardId = crypto.randomUUID();
      cardIdMap.set(c.id, newCardId);
      return { ...c, id: newCardId, listId: newListId };
    }
    return { ...c, listId: newListId };
  });

  return { projects, lists, cards };
}
