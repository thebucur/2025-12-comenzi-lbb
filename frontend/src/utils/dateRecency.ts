const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Returns tailwind text color class based on how old the given date is.
 * - Yesterday: orange text
 * - Two days ago or older: red text
 * - Today or future dates: no color override
 */
export const getDateRecencyClass = (dateString?: string | null): string => {
  const recency = getDateRecency(dateString)
  if (recency === 'yesterday') return 'text-orange-500'
  if (recency === 'older') return 'text-red-500'
  return ''
}

/**
 * Returns a hex color for highlighting in non-tailwind contexts (e.g. PDF).
 * - Yesterday: yellow
 * - Two days ago or older: red
 * - Otherwise: null
 */
export const getDateRecencyHex = (dateString?: string | null): string | null => {
  const recency = getDateRecency(dateString)
  if (recency === 'yesterday') return '#ffff00' // yellow highlight for yesterday
  if (recency === 'older') return '#ef4444' // tailwind red-500
  return null
}

type Recency = 'today' | 'future' | 'yesterday' | 'older'

const getDateRecency = (dateString?: string | null): Recency => {
  if (!dateString) return 'future'

  const parsed = new Date(dateString)
  if (isNaN(parsed.getTime())) return 'future'

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const targetStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())

  const diffDays = Math.floor((todayStart.getTime() - targetStart.getTime()) / MS_PER_DAY)

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays > 1) return 'older'
  return 'future'
}
