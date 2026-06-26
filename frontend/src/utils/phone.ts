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

/** Show stored value as digits only */
export function formatPhoneDisplay(value: string): string {
  return normalizePhoneDigits(value)
}
