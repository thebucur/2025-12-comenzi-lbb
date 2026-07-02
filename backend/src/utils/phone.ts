export function normalizePhoneDigits(value: string): string {
  return String(value ?? '').replace(/\D/g, '')
}

/** Romanian mobile: 07 + 8 more digits = 10 total */
export const ROMANIAN_MOBILE_PHONE_REGEX = /^07\d{8}$/

export function isValidTenDigitPhone(digits: string): boolean {
  return ROMANIAN_MOBILE_PHONE_REGEX.test(normalizePhoneDigits(digits))
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
