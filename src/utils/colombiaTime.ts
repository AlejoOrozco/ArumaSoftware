/**
 * Colombia timezone utilities (America/Bogota, UTC-5).
 * All app dates for display and "business day" logic use Colombia time for consistency.
 */

export const COLOMBIA_TIMEZONE = "America/Bogota";

/**
 * Returns the calendar date (YYYY-MM-DD) in Colombia for the given instant.
 * Use this whenever you need "today's date" or a date label in Colombia.
 */
export function getColombiaDateString(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: COLOMBIA_TIMEZONE });
}

/**
 * Returns the start and end of the given calendar day (YYYY-MM-DD) in Colombia,
 * as UTC Date instances suitable for Firestore range queries.
 * - start: 00:00:00.000 in Colombia
 * - end: 23:59:59.999 in Colombia
 */
export function getColombiaDayRange(dateString: string): { start: Date; end: Date } {
  const parts = dateString.split("-");
  const year = Number(parts[0] ?? 0);
  const month = Number(parts[1] ?? 1) - 1;
  const day = Number(parts[2] ?? 0);

  // 00:00:00.000 in Colombia = 05:00:00.000 UTC (Colombia is UTC-5)
  const start = new Date(Date.UTC(year, month, day, 5, 0, 0, 0));
  // 23:59:59.999 in Colombia = next day 04:59:59.999 UTC (23+5 hours)
  const end = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  end.setUTCHours(28, 59, 59, 999);

  return { start, end };
}

/**
 * Formats a Date for display in Colombia time (date and time).
 * Use for receipts, reports, and any user-facing date/time.
 */
export function formatInColombia(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "short",
    timeStyle: "short",
  }
): string {
  return date.toLocaleString("es-CO", { ...options, timeZone: COLOMBIA_TIMEZONE });
}

/**
 * Format date only (e.g. "3/3/2025") in Colombia.
 */
export function formatDateInColombia(date: Date): string {
  return date.toLocaleDateString("es-CO", { timeZone: COLOMBIA_TIMEZONE });
}

/**
 * Format time only (e.g. "14:30") in Colombia.
 */
export function formatTimeInColombia(date: Date): string {
  return date.toLocaleTimeString("es-CO", {
    timeZone: COLOMBIA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date with long month (e.g. "3 de marzo de 2025") in Colombia.
 */
export function formatDateLongInColombia(date: Date): string {
  return date.toLocaleDateString("es-CO", {
    timeZone: COLOMBIA_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
