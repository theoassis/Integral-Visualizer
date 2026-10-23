import { Color } from 'three'

export const SURFACE_COLOR_MAPS = {
  atlas: {
    label: 'Atlas',
    stops: ['#34475f', '#63858d', '#9eb4a8', '#dbc18d'],
    css: 'linear-gradient(90deg, #34475f, #63858d, #9eb4a8, #dbc18d)',
  },
  viridis: {
    label: 'Viridis',
    stops: ['#440154', '#31688e', '#35b779', '#fde725'],
    css: 'linear-gradient(90deg, #440154, #31688e, #35b779, #fde725)',
  },
  thermal: {
    label: 'Térmico',
    stops: ['#30123b', '#4666d5', '#35b779', '#f9d057', '#b7212c'],
    css: 'linear-gradient(90deg, #30123b, #4666d5, #35b779, #f9d057, #b7212c)',
  },
} as const

export type SurfaceColorMap = keyof typeof SURFACE_COLOR_MAPS

const COLOR_STOPS = Object.fromEntries(
  Object.entries(SURFACE_COLOR_MAPS).map(([name, palette]) => [
    name,
    palette.stops.map((hex) => new Color(hex)),
  ]),
) as Record<SurfaceColorMap, Color[]>
const mixedColor = new Color()

/** Samples a perceptually distinct height palette in linear RGB for the shader. */
export function evaluateHeightColor(
  value: number,
  map: SurfaceColorMap = 'atlas',
): [number, number, number] {
  const stops = COLOR_STOPS[map]
  const normalized = Math.min(Math.max(value, 0), 1) * (stops.length - 1)
  const lowerIndex = Math.floor(normalized)
  const upperIndex = Math.min(lowerIndex + 1, stops.length - 1)
  mixedColor.lerpColors(stops[lowerIndex]!, stops[upperIndex]!, normalized - lowerIndex)
  return [mixedColor.r, mixedColor.g, mixedColor.b]
}
