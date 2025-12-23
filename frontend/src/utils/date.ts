/**
 * Date utilities for Bucharest timezone (Europe/Bucharest)
 * All date operations use Bucharest timezone to ensure consistency
 */

const BUCHAREST_TIMEZONE = 'Europe/Bucharest'
const LOCALE = 'ro-RO'

/**
 * Get today's date string in YYYY-MM-DD format (Bucharest timezone)
 */
export const getTodayString = (): string => {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUCHAREST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(now)
}

/**
 * Convert a date to Bucharest timezone date string (YYYY-MM-DD)
 */
export const toBucharestDateString = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUCHAREST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(dateObj)
}

/**
 * Format date to Romanian locale string (Bucharest timezone)
 */
export const formatBucharestDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(LOCALE, {
    ...options,
    timeZone: BUCHAREST_TIMEZONE,
  })
}

/**
 * Format date/time to Romanian locale string (Bucharest timezone)
 */
export const formatBucharestDateTime = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString(LOCALE, {
    ...options,
    timeZone: BUCHAREST_TIMEZONE,
  })
}

/**
 * Get current date/time as a Date object adjusted for Bucharest timezone display
 * Note: JavaScript Date objects are always in UTC internally.
 * This function helps create dates that when formatted will show Bucharest time.
 */
export const getBucharestNow = (): Date => {
  return new Date()
}
