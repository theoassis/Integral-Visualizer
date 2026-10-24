import { describe, expect, it } from 'vitest'
import { calculateRiemannIntegral } from './riemannCalculation'

const request = {
  jobId: 19,
  expression: 'x*y',
  parameters: {},
  domain: {
    x: { min: 0, max: 1 },
    y: { min: 0, max: 1 },
  },
  rule: 'midpoint' as const,
  xSubdivisions: 2,
  ySubdivisions: 2,
}

describe('riemann calculation worker', () => {
  it('returns the Riemann sum, Gauss reference, errors and the sampled cells', () => {
    const result = calculateRiemannIntegral(request)

    expect(result.jobId).toBe(19)
    expect(result.value).toBeCloseTo(1 / 4, 14)
    expect(result.referenceValue).toBeCloseTo(1 / 4, 14)
    expect(result.absoluteError).toBeLessThan(1e-14)
    expect(result.relativeError).toBeLessThan(1e-14)
    expect(result.referenceRefinementDifference).toBeLessThan(1e-14)
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
    expect(result.grid.values).toHaveLength(4)
    expect(result.grid.sampleX[0]).toBeCloseTo(0.25, 14)
    expect(result.grid.sampleY[0]).toBeCloseTo(0.25, 14)
    expect(result.grid.values[0]).toBeCloseTo(0.0625, 14)
  })

  it('reports relative error as unavailable when the reference integral is zero', () => {
    const result = calculateRiemannIntegral({
      ...request,
      expression: 'x-y',
      rule: 'midpoint',
      xSubdivisions: 3,
      ySubdivisions: 3,
    })

    expect(result.referenceValue).toBeCloseTo(0, 14)
    expect(result.relativeError).toBeNull()
  })
})
