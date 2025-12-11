export interface ColorOption {
  name: string
  value: string
}

// Palette used when no installation config is provided.
export const defaultColorOptions: ColorOption[] = [
  { name: 'ALB', value: '#FFFFFF' },
  { name: 'NEGRU', value: '#000000' },
  { name: 'ROȘU', value: '#FF0000' },
  { name: 'VERDE', value: '#32CD32' },
  { name: 'ALBASTRU', value: '#0000FF' },
  { name: 'GALBEN', value: '#FFD700' },
  { name: 'ROZ', value: '#FF69B4' },
  { name: 'PORTOCALIU', value: '#FFA500' },
  { name: 'MARO', value: '#8B4513' },
  { name: 'VIOLET', value: '#8A2BE2' },
  { name: 'AURIU', value: '#D4AF37' },
  { name: 'SPECIAL', value: '#4B5563' },
]

const hexToName = new Map(defaultColorOptions.map((color) => [color.value.toLowerCase(), color.name]))

export const normalizeColorOptions = (
  colors?: Array<string | ColorOption>
): ColorOption[] => {
  if (!colors || colors.length === 0) return defaultColorOptions

  return colors.map((color) => {
    if (typeof color === 'string') {
      const normalized = color.toLowerCase()
      const matchedName = hexToName.get(normalized) || color
      return { name: matchedName, value: color }
    }
    return color
  })
}

export const resolveColorValue = (nameOrValue: string, palette: ColorOption[] = defaultColorOptions) => {
  const match = palette.find(
    (color) =>
      color.name.toLowerCase() === nameOrValue.toLowerCase() ||
      color.value.toLowerCase() === nameOrValue.toLowerCase()
  )
  return match?.value || nameOrValue
}







