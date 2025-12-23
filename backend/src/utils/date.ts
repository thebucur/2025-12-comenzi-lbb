/**
 * Date utilities for Bucharest timezone (Europe/Bucharest)
 * Backend date utilities to ensure consistency with frontend
 */

const BUCHAREST_TIMEZONE = 'Europe/Bucharest'

/**
 * Get today's date at start of day (00:00:00) in Bucharest timezone
 * Returns a Date object normalized to midnight in Bucharest timezone
 */
export const getBucharestToday = (): Date => {
  const now = new Date()
  
  // Get current date in Bucharest timezone as YYYY-MM-DD string
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUCHAREST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateStr = formatter.format(now)
  const [year, month, day] = dateStr.split('-').map(Number)
  
  // Create date at midnight local time (which represents midnight in Bucharest)
  // Since we're working with date-only values, this is sufficient
  const normalized = new Date(year, month - 1, day)
  normalized.setHours(0, 0, 0, 0)
  
  return normalized
}

/**
 * Normalize a date to start of day (00:00:00) in Bucharest timezone
 */
export const normalizeDateBucharest = (date: Date): Date => {
  // Get the date string in Bucharest timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUCHAREST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateStr = formatter.format(date)
  const [year, month, day] = dateStr.split('-').map(Number)
  
  const normalized = new Date(year, month - 1, day)
  normalized.setHours(0, 0, 0, 0)
  
  return normalized
}

/**
 * Get current date in Bucharest timezone as ISO string (YYYY-MM-DD)
 */
export const getBucharestTodayString = (): string => {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUCHAREST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(now)
}
