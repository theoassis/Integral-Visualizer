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
    expect(result.convergence).toHaveLength(5)
    expect(result.observedOrder).toBeNull()
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

  it('observa ordem próxima de dois para ponto médio em x²+y²', () => {
    const result = calculateRiemannIntegral({
      ...request,
      expression: 'x^2+y^2',
      rule: 'midpoint',
    })

    expect(result.observedOrder).toBeCloseTo(2, 8)
    expect(result.convergence.every(({ error }) => error > 0)).toBe(true)
  })

  it('mantém a referência de sen x sen y em [0, π]² próxima de 4', () => {
    const result = calculateRiemannIntegral({
      ...request,
      expression: 'sin(x)*sin(y)',
      domain: {
        x: { min: 0, max: Math.PI },
        y: { min: 0, max: Math.PI },
      },
      rule: 'midpoint',
    })

    expect(result.referenceValue).toBeCloseTo(4, 12)
    expect(result.value).toBeCloseTo(Math.PI ** 2 / 2, 12)
  })

  it('observa ordem próxima de um para a regra à esquerda', () => {
    const result = calculateRiemannIntegral({
      ...request,
      expression: 'x^2+y^2',
      rule: 'left',
    })

    expect(result.observedOrder).toBeCloseTo(1, 1)
  })

  it('mantém reproduzível o gráfico de convergência da regra aleatória', () => {
    const first = calculateRiemannIntegral({ ...request, rule: 'random' })
    const second = calculateRiemannIntegral({ ...request, rule: 'random' })

    expect(first.convergence).toEqual(second.convergence)
  })

  it('integra a região tipo I e conserva a máscara das células no modo centro', () => {
    const result = calculateRiemannIntegral({
      ...request,
      expression: '1',
      region: {
        kind: 'typeI',
        lowerExpression: '0',
        upperExpression: 'x',
        samplingMode: 'center',
      },
    })

    expect(result.value).toBeCloseTo(0.75, 14)
    expect(result.referenceValue).toBeCloseTo(0.5, 14)
    expect([...result.grid.cellFractions!]).toEqual([1, 0, 1, 1])
    expect(result.grid.rule).toBe('midpoint')
  })

  it('integra a mesma região triangular declarada em tipo II', () => {
    const result = calculateRiemannIntegral({
      ...request,
      expression: '1',
      region: {
        kind: 'typeII',
        lowerExpression: 'y',
        upperExpression: '1',
        samplingMode: 'center',
      },
    })

    expect(result.referenceValue).toBeCloseTo(0.5, 14)
    expect(result.value).toBeCloseTo(0.75, 14)
  })

  it('pondera as células parciais por subamostragem determinística', () => {
    const result = calculateRiemannIntegral({
      ...request,
      expression: '1',
      region: {
        kind: 'typeI',
        lowerExpression: '0',
        upperExpression: 'x',
        samplingMode: 'precise',
      },
    })

    expect(result.value).toBeGreaterThan(0.5)
    expect(result.value).toBeLessThan(0.6)
    expect(result.referenceValue).toBeCloseTo(0.5, 14)
    expect(result.grid.cellFractions).toHaveLength(4)
  })
})
