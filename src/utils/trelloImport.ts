import type { Project, List, Card, BoardExport } from '../types';
import { getSafeHref, getSafeImageUrl } from './url';

// Length limits matching validation.ts to prevent downstream errors
const MAX_NAME_LENGTH = 500;
const MAX_TITLE_LENGTH = 1000;
const MAX_DESCRIPTION_LENGTH = 50000;

/**
 * Truncate a string to a maximum length, appending '...' if truncated.
 */
function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 3) + '...';
}

// Trello export type definitions
interface TrelloAttachment {
  id: string;
  url: string;
  name: string;
}

interface TrelloCoverScaled {
  url: string;
  width: number;
  height: number;
}

interface TrelloCover {
  idAttachment?: string;
  color?: string;
  scaled?: TrelloCoverScaled[];
}

interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  pos: number;
}

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  idList: string;
  pos: number;
  due: string | null;
  dateLastActivity: string;
  attachments?: TrelloAttachment[];
  cover?: TrelloCover;
}

interface TrelloExport {
  id: string;
  name: string;
  lists: TrelloList[];
  cards: TrelloCard[];
}

/**
 * Type guard to check if data looks like a Trello export.
 * Trello exports have: name, lists[], cards[] and NO version field.
 * @param data - Unknown data to check
 * @returns true if data appears to be a Trello export
 */
export function isTrelloExport(data: unknown): data is TrelloExport {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Trello exports have 'name' (board name), 'lists', and 'cards'
  // They do NOT have a 'version' field (which Board exports have)
  if ('version' in obj) {
    return false;
  }

  if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
    return false;
  }

  if (!Array.isArray(obj.lists) || !Array.isArray(obj.cards)) {
    return false;
  }

  // Validate that array elements have expected shapes (check first element if present)
  if (obj.lists.length > 0) {
    const first = obj.lists[0] as Record<string, unknown>;
    if (!first || typeof first !== 'object' || typeof first.id !== 'string' || typeof first.name !== 'string') {
      return false;
    }
  }
  if (obj.cards.length > 0) {
    const first = obj.cards[0] as Record<string, unknown>;
    if (!first || typeof first !== 'object' || typeof first.id !== 'string' || typeof first.name !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Extracts the cover image URL from a Trello card's cover object.
 * Prefers the largest scaled image if available.
 * @param card - Trello card object
 * @returns Cover image URL or undefined
 */
function extractCoverImageUrl(card: TrelloCard): string | undefined {
  if (!card.cover?.scaled || card.cover.scaled.length === 0) {
    return undefined;
  }

  // Get the largest scaled image (last in array is typically largest)
  const scaled = card.cover.scaled;
  const largest = scaled[scaled.length - 1];
  return largest?.url;
}

/**
 * Extracts the first URL attachment from a Trello card.
 * @param card - Trello card object
 * @returns First attachment URL or undefined
 */
function extractFirstAttachmentUrl(card: TrelloCard): string | undefined {
  if (!card.attachments || card.attachments.length === 0) {
    return undefined;
  }

  // Return the first attachment's URL
  return card.attachments[0]?.url;
}

/**
 * Converts a Trello board export to Board app's export format.
 * 
 * Conversion rules:
 * - One Trello board becomes one Board project
 * - Archived lists and cards (closed: true) are filtered out
 * - Cards referencing non-existent lists are filtered out
 * - Positions are normalized to sequential integers (0, 1, 2...)
 * - card.name → card.title
 * - card.desc → card.description
 * - First URL attachment → card.link
 * - Cover image → card.coverImageUrl
 * 
 * @param data - Raw Trello export data (unknown type for safety)
 * @returns BoardExport object ready for import
 * @throws Error if data is not a valid Trello export
 */
export function convertTrelloExport(data: unknown): BoardExport {
  // Validate it's a Trello export
  if (!isTrelloExport(data)) {
    // Check if it's a Board export instead
    if (typeof data === 'object' && data !== null && 'version' in data) {
      throw new Error(
        'This appears to be a Board backup file, not a Trello export. Use "Import Backup" instead.'
      );
    }
    throw new Error(
      'Invalid Trello export format. Expected a JSON file with board name, lists, and cards.'
    );
  }

  const now = new Date().toISOString();

  // Create a new project from the board
  const projectId = crypto.randomUUID();
  const project: Project = {
    id: projectId,
    name: truncate(data.name, MAX_NAME_LENGTH),
    createdAt: now,
    updatedAt: now,
  };

  // Filter out archived lists and sort by position
  const activeLists = data.lists
    .filter((list) => !list.closed)
    .sort((a, b) => a.pos - b.pos);

  // Create a mapping from Trello list IDs to new list IDs
  const listIdMap = new Map<string, string>();

  // Convert lists with sequential positions
  const lists: List[] = activeLists.map((trelloList, index) => {
    const newListId = crypto.randomUUID();
    listIdMap.set(trelloList.id, newListId);

    return {
      id: newListId,
      projectId,
      name: truncate(trelloList.name, MAX_NAME_LENGTH),
      position: index,
    };
  });

  // Filter out archived cards and cards referencing non-existent/archived lists
  const activeCards = data.cards.filter(
    (card) => !card.closed && listIdMap.has(card.idList)
  );

  // Group cards by list and sort by position within each list
  const cardsByList = new Map<string, TrelloCard[]>();
  for (const card of activeCards) {
    const listCards = cardsByList.get(card.idList) || [];
    listCards.push(card);
    cardsByList.set(card.idList, listCards);
  }

  // Sort cards within each list by position
  for (const listCards of cardsByList.values()) {
    listCards.sort((a, b) => a.pos - b.pos);
  }

  // Convert cards with sequential positions within each list
  const cards: Card[] = [];
  for (const [trelloListId, listCards] of cardsByList.entries()) {
    const newListId = listIdMap.get(trelloListId);
    if (!newListId) continue;

    listCards.forEach((trelloCard, index) => {
      const card: Card = {
        id: crypto.randomUUID(),
        listId: newListId,
        title: truncate(trelloCard.name, MAX_TITLE_LENGTH),
        description: truncate(trelloCard.desc || '', MAX_DESCRIPTION_LENGTH),
        position: index,
        createdAt: now,
        updatedAt: trelloCard.dateLastActivity || now,
      };

      // SECURITY: Sanitize URLs to prevent XSS via javascript:, data:, etc.
      const link = extractFirstAttachmentUrl(trelloCard);
      const safeLink = link ? getSafeHref(link) : undefined;
      if (safeLink) {
        card.link = safeLink;
      }

      const coverImageUrl = extractCoverImageUrl(trelloCard);
      const safeCoverUrl = coverImageUrl ? getSafeImageUrl(coverImageUrl) : undefined;
      if (safeCoverUrl) {
        card.coverImageUrl = safeCoverUrl;
      }

      if (trelloCard.due) {
        card.dueDate = trelloCard.due;
      }

      cards.push(card);
    });
  }

  return {
    version: 1,
    exportedAt: now,
    projects: [project],
    lists,
    cards,
  };
}
