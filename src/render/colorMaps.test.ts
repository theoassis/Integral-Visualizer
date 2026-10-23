import { describe, expect, it } from 'vitest'
import { Color } from 'three'
import { evaluateHeightColor, SURFACE_COLOR_MAPS } from './colorMaps'

describe('surface color maps', () => {
  it('clamps height samples to the palette endpoints', () => {
    expect(evaluateHeightColor(-1)).toEqual(evaluateHeightColor(0))
    expect(evaluateHeightColor(2)).toEqual(evaluateHeightColor(1))
  })

  it('offers distinct color maps with the expected endpoint colors', () => {
    expect(Object.keys(SURFACE_COLOR_MAPS)).toEqual(['atlas', 'viridis', 'thermal'])
    const viridisStart = new Color(SURFACE_COLOR_MAPS.viridis.stops[0])
    expect(evaluateHeightColor(0, 'viridis')).toEqual([
      viridisStart.r,
      viridisStart.g,
      viridisStart.b,
    ])
    expect(evaluateHeightColor(0.5, 'viridis')).not.toEqual(
      evaluateHeightColor(0.5, 'thermal'),
    )
  })
})
