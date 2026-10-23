import { describe, expect, it } from 'vitest'
import { integral2Rectangular } from './iterated'

function expectRelativeError(value: number, exact: number, tolerance: number) {
  const relativeError = Math.abs(value - exact) / Math.abs(exact)
  expect(relativeError).toBeLessThan(tolerance)
}

describe('integral2Rectangular', () => {
  it('reproduz A1: a integral dupla de xy em [0,1]² é 1/4', () => {
    const value = integral2Rectangular((x, y) => x * y, [0, 1], [0, 1], 2)

    expectRelativeError(value, 1 / 4, 1e-12)
  })

  it('reproduz A2: a integral dupla de x²+y² em [0,1]² é 2/3', () => {
    const value = integral2Rectangular((x, y) => x ** 2 + y ** 2, [0, 1], [0, 1], 2)

    expectRelativeError(value, 2 / 3, 1e-12)
  })

  it('reproduz A3: a integral dupla de sen(x)sen(y) em [0,π]² é 4', () => {
    const value = integral2Rectangular(
      (x, y) => Math.sin(x) * Math.sin(y),
      [0, Math.PI],
      [0, Math.PI],
      16,
    )

    expectRelativeError(value, 4, 1e-10)
  })

  it('mapeia a regra de Gauss para retângulos deslocados e escalados', () => {
    const value = integral2Rectangular(() => 1, [2, 4], [-3, 1], 2)

    expect(value).toBeCloseTo(8, 14)
  })

  it('preserva a orientação quando um ou ambos os intervalos são invertidos', () => {
    const integrateOne = (
      xBounds: readonly [number, number],
      yBounds: readonly [number, number],
    ) => integral2Rectangular(() => 1, xBounds, yBounds, 2)

    expect(integrateOne([1, 0], [0, 1])).toBeCloseTo(-1, 14)
    expect(integrateOne([1, 0], [1, 0])).toBeCloseTo(1, 14)
  })

  it('retorna zero para uma região degenerada sem avaliar o integrando', () => {
    const integrand = () => {
      throw new Error('não deve ser avaliado')
    }

    expect(integral2Rectangular(integrand, [2, 2], [-1, 1], 4)).toBe(0)
  })

  it('rejeita limites não finitos e amostras do integrando não finitas', () => {
    expect(() => integral2Rectangular(() => 1, [0, Infinity], [0, 1])).toThrow(
      RangeError,
    )
    expect(() => integral2Rectangular(() => Number.NaN, [0, 1], [0, 1], 2)).toThrow(
      RangeError,
    )
  })

  it('rejeita resultados fora da faixa representável em precisão dupla', () => {
    expect(() =>
      integral2Rectangular(() => Number.MAX_VALUE, [0, 2], [0, 2], 2),
    ).toThrow(RangeError)
  })
})
