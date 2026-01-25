/**
 * Date Utility Functions
 *
 * Shared helpers for date formatting and due date color calculations.
 */

/**
 * Check if a due date is in the past
 * @param dueDate - ISO date string (YYYY-MM-DD)
 * @returns true if the date is before today
 */
export function isDueDatePast(dueDate: string): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return due.getTime() < now.getTime();
}

/**
 * Get due date display color based on warning days setting
 * @param dueDate - ISO date string (YYYY-MM-DD)
 * @param warningDays - Number of days before due date to show warning
 * @returns Tailwind CSS class for the date color
 */
export function getDueDateColor(dueDate: string, warningDays: number): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of day
  // Parse date string as local timezone by appending T00:00:00
  const due = new Date(dueDate + 'T00:00:00');
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 'text-text-muted'; // Past due - grayed out
  if (daysUntilDue <= warningDays) return 'text-danger'; // Warning period - red
  return 'text-text-muted'; // Future - regular
}

/**
 * Format a date for display in the UI
 * Uses T00:00:00 suffix to interpret date as local timezone (consistent with other functions)
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Localized date string
 */
export function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString();
}

/**
 * Format current date as YYYY-MM-DD (local timezone)
 * @param date - Date object (defaults to now)
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForInput(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
