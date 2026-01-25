/**
 * Server-side validation functions.
 * 
 * SECURITY: These validation functions are critical for preventing
 * malicious data injection via API calls.
 */

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
function isString(value) {
  return typeof value === 'string';
}

/**
 * Check if value is a number (not NaN)
 */
function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a valid string with length constraints
 */
function isValidString(value, maxLength) {
  return isString(value) && value.length <= maxLength;
}

/**
 * Validate a project object
 */
function validateProject(p, index) {
  if (!p || typeof p !== 'object') {
    throw new Error(`Invalid project at index ${index}: not an object`);
  }
  if (!isValidString(p.id, MAX_ID_LENGTH)) {
    throw new Error(`Invalid project at index ${index}: missing or invalid id`);
  }
  if (!isValidString(p.name, MAX_NAME_LENGTH)) {
    throw new Error(`Invalid project at index ${index}: missing or invalid name`);
  }
  if (!isValidString(p.createdAt, MAX_DATE_LENGTH)) {
    throw new Error(`Invalid project at index ${index}: missing or invalid createdAt`);
  }
  if (!isValidString(p.updatedAt, MAX_DATE_LENGTH)) {
    throw new Error(`Invalid project at index ${index}: missing or invalid updatedAt`);
  }
}

/**
 * Validate a list object
 */
function validateList(l, index) {
  if (!l || typeof l !== 'object') {
    throw new Error(`Invalid list at index ${index}: not an object`);
  }
  if (!isValidString(l.id, MAX_ID_LENGTH)) {
    throw new Error(`Invalid list at index ${index}: missing or invalid id`);
  }
  if (!isValidString(l.projectId, MAX_ID_LENGTH)) {
    throw new Error(`Invalid list at index ${index}: missing or invalid projectId`);
  }
  if (!isValidString(l.name, MAX_NAME_LENGTH)) {
    throw new Error(`Invalid list at index ${index}: missing or invalid name`);
  }
  if (!isNumber(l.position)) {
    throw new Error(`Invalid list at index ${index}: missing or invalid position`);
  }
}

/**
 * Validate a card object
 */
function validateCard(c, index) {
  if (!c || typeof c !== 'object') {
    throw new Error(`Invalid card at index ${index}: not an object`);
  }
  if (!isValidString(c.id, MAX_ID_LENGTH)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid id`);
  }
  if (!isValidString(c.listId, MAX_ID_LENGTH)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid listId`);
  }
  if (!isValidString(c.title, MAX_TITLE_LENGTH)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid title`);
  }
  if (!isString(c.description)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid description`);
  }
  if (c.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Invalid card at index ${index}: description too long`);
  }
  if (!isNumber(c.position)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid position`);
  }
  if (!isValidString(c.createdAt, MAX_DATE_LENGTH)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid createdAt`);
  }
  if (!isValidString(c.updatedAt, MAX_DATE_LENGTH)) {
    throw new Error(`Invalid card at index ${index}: missing or invalid updatedAt`);
  }
  
  // Optional fields - validate type and length only if present
  if (c.link !== undefined && c.link !== null) {
    if (!isValidString(c.link, MAX_URL_LENGTH)) {
      throw new Error(`Invalid card at index ${index}: invalid link`);
    }
  }
  if (c.coverImageUrl !== undefined && c.coverImageUrl !== null) {
    if (!isValidString(c.coverImageUrl, MAX_URL_LENGTH)) {
      throw new Error(`Invalid card at index ${index}: invalid coverImageUrl`);
    }
  }
  if (c.dueDate !== undefined && c.dueDate !== null) {
    if (!isValidString(c.dueDate, MAX_DATE_LENGTH)) {
      throw new Error(`Invalid card at index ${index}: invalid dueDate`);
    }
  }
}

/**
 * Validate the schema of board data (projects, lists, cards)
 */
export function validateBoardData(data) {
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
  const projectIds = new Set();
  for (const p of data.projects) {
    if (projectIds.has(p.id)) {
      throw new Error(`Duplicate project id: ${p.id}`);
    }
    projectIds.add(p.id);
  }
  
  const listIds = new Set();
  for (const l of data.lists) {
    if (listIds.has(l.id)) {
      throw new Error(`Duplicate list id: ${l.id}`);
    }
    listIds.add(l.id);
  }
  
  const cardIds = new Set();
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
