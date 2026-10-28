import { describe, expect, it } from 'vitest'
import { createInequalityRegion, integral2Inequality } from './regions'

describe('integração em regiões por desigualdade', () => {
  it('usa varredura e bissecção para a área de uma faixa entre fronteiras', () => {
    const band = createInequalityRegion(
      [0, 1],
      [0, 1],
      (_x, y) => (y - 0.25) * (y - 0.75),
    )
    const result = integral2Inequality(() => 1, band)

    expect(result.method).toBe('scan-bisection')
    expect(result.value).toBeCloseTo(0.5, 10)
    expect(result.errorEstimate).toBeLessThan(1e-10)
    expect(result.samples).toBeGreaterThan(0)
  })

  it('classifica fronteira inclusiva e limita o teste à janela fornecida', () => {
    const disk = createInequalityRegion([-1, 1], [-1, 1], (x, y) => x * x + y * y - 1)

    expect(disk.contains(1, 0)).toBe(true)
    expect(disk.contains(0, 0)).toBe(true)
    expect(disk.contains(1.01, 0)).toBe(false)
    expect(disk.contains(Number.NaN, 0)).toBe(false)
  })

  it('estima a área do disco pela fronteira x²+y²−1=0', () => {
    const disk = createInequalityRegion([-1, 1], [-1, 1], (x, y) => x * x + y * y - 1)
    const result = integral2Inequality(() => 1, disk)

    expect(result.method).toBe('scan-bisection')
    expect(result.value).toBeCloseTo(Math.PI, 3)
  })

  it('converte uma desigualdade independente de x em uma faixa horizontal exata', () => {
    const band = createInequalityRegion([0, 3], [-2, 2], (_x, y) => y - 0.5)
    const result = integral2Inequality(() => 1, band)

    expect(result.value).toBeCloseTo(7.5, 12)
    expect(result.method).toBe('scan-bisection')
  })

  it('retorna zero para uma região vazia e integra o retângulo inteiro', () => {
    const empty = createInequalityRegion([0, 1], [0, 1], () => 1)
    const full = createInequalityRegion([0, 1], [0, 1], () => -1)

    expect(integral2Inequality(() => 1, empty).value).toBe(0)
    expect(integral2Inequality(() => 1, full).value).toBeCloseTo(1, 14)
  })

  it('integra uma função sobre a metade esquerda sem perder o sinal', () => {
    const halfPlane = createInequalityRegion([-1, 1], [-2, 2], (x) => x)
    const result = integral2Inequality((x) => x, halfPlane)

    expect(result.value).toBeCloseTo(-2, 12)
  })

  it('troca para Monte Carlo quando o número de cruzamentos excede o limite', () => {
    const oscillatory = createInequalityRegion([0, 1], [0, 1], (_x, y) =>
      Math.sin(200 * y),
    )
    const options = { monteCarloSamples: 80_000, seed: 12345 }
    const first = integral2Inequality(() => 1, oscillatory, options)
    const second = integral2Inequality(() => 1, oscillatory, options)

    expect(first.method).toBe('monte-carlo')
    expect(first).toEqual(second)
    expect(first.value).toBeCloseTo(0.5, 2)
    expect(first.errorEstimate).toBeGreaterThan(0)
    expect(first.errorEstimate).toBeLessThan(0.02)
    expect(first.samples).toBe(80_000)
  })

  it('detecta fronteira oscilatória alinhada à malha ao comparar a resolução vertical', () => {
    const aliased = createInequalityRegion([0, 1], [0, 1], (_x, y) =>
      Math.cos(512 * Math.PI * y),
    )
    const result = integral2Inequality(() => 1, aliased, {
      monteCarloSamples: 50_000,
      seed: 19,
    })

    expect(result.method).toBe('monte-carlo')
    expect(result.value).toBeCloseTo(0.5, 2)
    expect(result.errorEstimate).toBeGreaterThan(0)
  })

  it('o erro padrão Monte Carlo diminui quando a amostra aumenta', () => {
    const halfPlane = createInequalityRegion([0, 1], [0, 1], (_x, y) =>
      Math.sin(40 * Math.PI * y),
    )
    const small = integral2Inequality(() => 1, halfPlane, {
      maxBoundaryCrossings: 1,
      monteCarloSamples: 2_000,
      seed: 77,
    })
    const large = integral2Inequality(() => 1, halfPlane, {
      maxBoundaryCrossings: 1,
      monteCarloSamples: 20_000,
      seed: 77,
    })

    expect(small.method).toBe('monte-carlo')
    expect(large.errorEstimate).toBeLessThan(small.errorEstimate)
  })

  it('erro padrão cobre a diferença do valor exato em uma região com área conhecida', () => {
    const periodicHalf = createInequalityRegion([0, 1], [0, 1], (_x, y) =>
      Math.sin(40 * Math.PI * y),
    )
    const result = integral2Inequality(() => 1, periodicHalf, {
      monteCarloSamples: 100_000,
      seed: 20261027,
    })

    expect(result.method).toBe('monte-carlo')
    expect(Math.abs(result.value - 0.5)).toBeLessThan(4 * result.errorEstimate)
  })

  it('rejeita limites inválidos, parâmetros excessivos e amostras não finitas', () => {
    expect(() => createInequalityRegion([1, 1], [0, 1], () => -1)).toThrow(RangeError)
    const region = createInequalityRegion([0, 1], [0, 1], (_x, y) =>
      Math.sin(20 * Math.PI * y),
    )
    expect(() => integral2Inequality(() => 1, region, { xSlices: 1 })).toThrow(
      RangeError,
    )
    expect(() => integral2Inequality(() => Number.NaN, region)).toThrow(RangeError)
    expect(() => integral2Inequality(() => 1, region, { xSlices: 513 })).toThrow(
      RangeError,
    )
    expect(() => integral2Inequality(() => 1, region, { yScanSlices: 1025 })).toThrow(
      RangeError,
    )
    expect(() =>
      integral2Inequality(() => 1, region, {
        maxBoundaryCrossings: 1,
        monteCarloSamples: 1,
      }),
    ).toThrow(RangeError)
  })
})
