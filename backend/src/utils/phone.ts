export function normalizePhoneDigits(value: string): string {
  return String(value ?? '').replace(/\D/g, '')
}

/**
 * Length validation was removed by request — staff can enter any number of
 * digits (or leave it empty) when taking orders.
 */
export function isValidTenDigitPhone(_digits: string): boolean {
  return true
}

/** Show stored value as digits only */
export function formatPhoneDisplay(value: string): string {
  return normalizePhoneDigits(value)
}
