import { describe, expect, it } from 'vitest'
import { integral2DiskPolar, integral2Rectangular } from './iterated'
import { createPolarRegion, integral2Polar } from '../regions/regions'

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

describe('integral2DiskPolar', () => {
  it('reproduz A4: integral de x²+y² no disco unitário é π/2', () => {
    const value = integral2DiskPolar((x, y) => x ** 2 + y ** 2, 1, 4)

    expectRelativeError(value, Math.PI / 2, 1e-12)
  })

  it('escala com a quarta potência do raio para o momento radial de x²+y²', () => {
    const value = integral2DiskPolar((x, y) => x ** 2 + y ** 2, 2, 4)

    expectRelativeError(value, 8 * Math.PI, 1e-12)
  })

  it('rejeita raios nulos, negativos ou não finitos', () => {
    expect(() => integral2DiskPolar(() => 1, 0)).toThrow(RangeError)
    expect(() => integral2DiskPolar(() => 1, -1)).toThrow(RangeError)
    expect(() => integral2DiskPolar(() => 1, Infinity)).toThrow(RangeError)
  })
})

describe('integrais em coordenadas polares', () => {
  const disk = createPolarRegion([0, 1], [0, 2 * Math.PI])

  it('reproduz A7: volume sob 1−x²−y² no disco unitário é π/2', () => {
    expect(integral2Polar((x, y) => 1 - x ** 2 - y ** 2, disk, 8)).toBeCloseTo(
      Math.PI / 2,
      12,
    )
  })

  it('reproduz A8: integral gaussiana no disco de raio 2', () => {
    const value = integral2Polar(
      (x, y) => Math.exp(-(x ** 2 + y ** 2)),
      createPolarRegion([0, 2], [0, 2 * Math.PI]),
      40,
    )
    expect(value).toBeCloseTo(Math.PI * (1 - Math.exp(-4)), 12)
  })

  it('reproduz A9: a integral de x no disco unitário é zero por simetria', () => {
    expect(Math.abs(integral2Polar((x) => x, disk, 32))).toBeLessThan(1e-12)
  })

  it('integra setores parciais e preserva o jacobiano r', () => {
    const quarterDisk = createPolarRegion([0, 1], [0, Math.PI / 2])
    expect(integral2Polar(() => 1, quarterDisk, 8)).toBeCloseTo(Math.PI / 4, 12)
  })

  it('rejeita abertura angular maior que uma volta ou raios inválidos', () => {
    expect(() => createPolarRegion([-1, 1], [0, Math.PI])).toThrow(RangeError)
    expect(() => createPolarRegion([0, 1], [0, 3 * Math.PI])).toThrow(RangeError)
  })
})
