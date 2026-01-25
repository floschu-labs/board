/**
 * Shared validation functions for both client and server.
 * 
 * SECURITY: These validation functions are critical for preventing
 * malicious data injection via import or API calls.
 */

import type { Project, List, Card, BoardExport } from '../types';

// Maximum lengths for string fields to prevent DoS via huge payloads
const MAX_ID_LENGTH = 100;
const MAX_NAME_LENGTH = 500;
const MAX_TITLE_LENGTH = 1000;
const MAX_DESCRIPTION_LENGTH = 50000;
const MAX_URL_LENGTH = 2000;
const MAX_DATE_LENGTH = 50;

/**
 * Check if value is a string
 */
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a number (not NaN)
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a valid string with length constraints
 */
function isValidString(value: unknown, maxLength: number): value is string {
  return isString(value) && value.length <= maxLength;
}

/**
 * Validate a project object
 * @throws {Error} if validation fails
 */
export function validateProject(p: unknown, index: number): asserts p is Project {
  if (!p || typeof p !== 'object') {
    throw new Error(`Invalid project at index ${index}: not an object`);
  }
  const project = p as Record<string, unknown>;
  if (!isValidString(project.id, MAX_ID_LENGTH)) {
    throw new Error(`Invalid project at index ${index}: missing or invalid id`);
  }
  if (!isValidString(project.name, MAX_NAME_LENGTH)) {
    throw new Error(`Invalid project at index ${index}: missing or invalid name`);
  }
  if (!isValidString(project.createdAt, MAX_DATE_LENGTH)) {
    throw new Error(`Invalid project at index ${index}: missing or invalid createdAt`);
  }
  if (!isValidString(project.updatedAt, MAX_DATE_LENGTH)) {
    throw new Error(`Invalid project at index ${index}: missing or invalid updatedAt`);
  }
}

/**
 * Validate a list object
 * @throws {Error} if validation fails
 */
export function validateList(l: unknown, index: number): asserts l is List {
  if (!l || typeof l !== 'object') {
    throw new Error(`Invalid list at index ${index}: not an object`);
  }
  const list = l as Record<string, unknown>;
  if (!isValidString(list.id, MAX_ID_LENGTH)) {
    throw new Error(`Invalid list at index ${index}: missing or invalid id`);
  }
  if (!isValidString(list.projectId, MAX_ID_LENGTH)) {
    throw new Error(`Invalid list at index ${index}: missing or invalid projectId`);
  }
  if (!isValidString(list.name, MAX_NAME_LENGTH)) {
    throw new Error(`Invalid list at index ${index}: missing or invalid name`);
  }
  if (!isNumber(list.position)) {
    throw new Error(`Invalid list at index ${index}: missing or invalid position`);
  }
}

/**
 * Validate a card object
 * @throws {Error} if validation fails
 */
export function validateCard(c: unknown, index: number): asserts c is Card {
  if (!c || typeof c !== 'object') {
    throw new Error(`Invalid card at index ${index}: not an object`);
  }
  const card = c as Record<string, unknown>;
  if (!isValidString(card.id, MAX_ID_LENGTH)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid id`);
  }
  if (!isValidString(card.listId, MAX_ID_LENGTH)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid listId`);
  }
  if (!isValidString(card.title, MAX_TITLE_LENGTH)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid title`);
  }
  if (!isString(card.description)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid description`);
  }
  if ((card.description as string).length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Invalid card at index ${index}: description too long`);
  }
  if (!isNumber(card.position)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid position`);
  }
  if (!isValidString(card.createdAt, MAX_DATE_LENGTH)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid createdAt`);
  }
  if (!isValidString(card.updatedAt, MAX_DATE_LENGTH)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid updatedAt`);
  }
  
  // Optional fields - validate type and length only if present
  if (card.link !== undefined && card.link !== null) {
    if (!isValidString(card.link, MAX_URL_LENGTH)) {
      throw new Error(`Invalid card at index ${index}: invalid link`);
    }
  }
  if (card.coverImageUrl !== undefined && card.coverImageUrl !== null) {
    if (!isValidString(card.coverImageUrl, MAX_URL_LENGTH)) {
      throw new Error(`Invalid card at index ${index}: invalid coverImageUrl`);
    }
  }
  if (card.dueDate !== undefined && card.dueDate !== null) {
    if (!isValidString(card.dueDate, MAX_DATE_LENGTH)) {
      throw new Error(`Invalid card at index ${index}: invalid dueDate`);
    }
  }
}

/**
 * Validate the schema of board data (projects, lists, cards)
 * @throws {Error} if validation fails
 */
export function validateSchema(data: BoardExport): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data: not an object');
  }
  
  if (!Array.isArray(data.projects)) {
    throw new Error('Invalid data: projects must be an array');
  }
  if (!Array.isArray(data.lists)) {
    throw new Error('Invalid data: lists must be an array');
  }
  if (!Array.isArray(data.cards)) {
    throw new Error('Invalid data: cards must be an array');
  }
  
  // Validate all projects
  data.projects.forEach((p, i) => validateProject(p, i));
  
  // Validate all lists
  data.lists.forEach((l, i) => validateList(l, i));
  
  // Validate all cards
  data.cards.forEach((c, i) => validateCard(c, i));
  
  // Check for duplicate IDs
  const projectIds = new Set<string>();
  for (const p of data.projects) {
    if (projectIds.has(p.id)) {
      throw new Error(`Duplicate project id: ${p.id}`);
    }
    projectIds.add(p.id);
  }
  
  const listIds = new Set<string>();
  for (const l of data.lists) {
    if (listIds.has(l.id)) {
      throw new Error(`Duplicate list id: ${l.id}`);
    }
    listIds.add(l.id);
  }
  
  const cardIds = new Set<string>();
  for (const c of data.cards) {
    if (cardIds.has(c.id)) {
      throw new Error(`Duplicate card id: ${c.id}`);
    }
    cardIds.add(c.id);
  }
  
  // Check referential integrity
  for (const l of data.lists) {
    if (!projectIds.has(l.projectId)) {
      throw new Error(`List '${l.id}' references non-existent project '${l.projectId}'`);
    }
  }
  
  for (const c of data.cards) {
    if (!listIds.has(c.listId)) {
      throw new Error(`Card '${c.id}' references non-existent list '${c.listId}'`);
    }
  }
}
