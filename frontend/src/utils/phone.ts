/** Digits only */
export function normalizePhoneDigits(value: string): string {
  return String(value ?? '').replace(/\D/g, '')
}

/**
 * Phone is considered "complete" if it has at least one digit OR is empty.
 * Validation length was removed by request — staff can enter any number of digits
 * (or leave it empty) when taking orders.
 */
export function isCompletePhoneNumber(_value: string): boolean {
  return true
}

/**
 * Show stored phone for display/PDF.
 * Legacy orders stored only 8 digits (UI showed a fixed "07" prefix separately).
 */
export function formatPhoneDisplay(value: string): string {
  const digits = normalizePhoneDigits(value)
  if (!digits) return digits
  if (digits.startsWith('07')) return digits
  if (digits.length === 8) return `07${digits}`
  return digits
}
