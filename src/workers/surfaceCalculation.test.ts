import { describe, expect, it } from 'vitest'
import { calculateSurface, SurfaceCalculationService } from './surfaceCalculation'

const request = {
  jobId: 7,
  expression: 'x*y',
  parameters: {},
  domain: {
    x: { min: 0, max: 1 },
    y: { min: 0, max: 1 },
  },
  segments: 4,
}

describe('surface calculation worker service', () => {
  it('returns the sampled range and transferable-ready mesh data', async () => {
    const result = await calculateSurface(request)

    expect(result?.jobId).toBe(7)
    expect(result?.range.min).toBeLessThan(0)
    expect(result?.range.max).toBeGreaterThan(1)
    expect(result?.grid.positions).toHaveLength(5 * 5 * 3)
    expect(result?.grid.validVertices).toHaveLength(25)
    expect(result?.grid.gradientX[22]).toBeCloseTo(0.5)
    expect(result?.grid.gradientY[22]).toBeCloseTo(1)
    expect(result?.grid.indices.length).toBeGreaterThan(0)
  })

  it('cancels a running calculation by its job id', async () => {
    const service = new SurfaceCalculationService()
    const calculation = service.calculate({ ...request, segments: 96 })
    service.cancel(request.jobId)

    await expect(calculation).resolves.toBeNull()
  })

  it('preserves formula validation errors for the caller', async () => {
    await expect(
      calculateSurface({ ...request, expression: 'danger(1)' }),
    ).rejects.toThrow(/não permitida|permitida/i)
  })
})
