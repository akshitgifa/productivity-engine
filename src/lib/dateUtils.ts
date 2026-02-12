/**
 * dateUtils.ts - Standardized local-aware time handling for the Entropy Engine.
 * 
 * Ensures "Today" and "Deadlines" are treated relative to the user's local day
 * to avoid UTC offset shifts (e.g. tasks disappearing early or appearing late).
 */

/**
 * Returns a local date string in YYYY-MM-DD format.
 */
export function toLocalISOString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a date (Date object or string) is "Today" in the local context.
 */
export function isTodayLocal(dateInput: Date | string | null | undefined): boolean {
  if (!dateInput) return false;
  const today = toLocalISOString();
  const target = dateInput instanceof Date ? toLocalISOString(dateInput) : dateInput.split('T')[0];
  return today === target;
}

/**
 * Returns a Date object set to the very end of the local day (23:59:59.999).
 */
export function endOfLocalDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Standardizes a date for storage. 
 * If it's a date-only field (like planned_date), use YYYY-MM-DD.
 * If it's a timestamp (like updated_at), use full ISO.
 */
export function formatForStorage(date: Date, type: 'date' | 'timestamp'): string {
  if (type === 'date') return toLocalISOString(date);
  return date.toISOString();
}

/**
 * Safely compares two dates (can be strings or Date objects) in local context.
 * Returns -1 if a < b, 1 if a > b, 0 if equal.
 */
export function compareDates(a: string | Date | undefined, b: string | Date | undefined): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const dateA = a instanceof Date ? a : new Date(a);
  const dateB = b instanceof Date ? b : new Date(b);
  return dateA.getTime() - dateB.getTime();
}
