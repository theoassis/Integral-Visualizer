import { describe, expect, it } from 'vitest'
import {
  createTypeIRegion,
  createTypeIIRegion,
  integral2TypeI,
  integral2TypeII,
  type TypeIRegion,
  type TypeIIRegion,
} from './regions'

const triangleTypeI: TypeIRegion = createTypeIRegion([0, 1], (x) => [0, x])

const triangleTypeII: TypeIIRegion = createTypeIIRegion([0, 1], (y) => [y, 1])

describe('regiões planas do tipo I e II', () => {
  it('calcula A5: integral de x no triângulo 0 ≤ y ≤ x ≤ 1 = 1/3', () => {
    expect(integral2TypeI((x) => x, triangleTypeI, 8)).toBeCloseTo(1 / 3, 13)
  })

  it('representa o triângulo equivalente em tipo II e mantém o mesmo valor', () => {
    expect(integral2TypeII((x) => x, triangleTypeII, 8)).toBeCloseTo(1 / 3, 13)
  })

  it('calcula A6: integral de x+y entre y=x² e y=√x = 3/10', () => {
    const region: TypeIRegion = createTypeIRegion([0, 1], (x) => [x ** 2, Math.sqrt(x)])

    expect(integral2TypeI((x, y) => x + y, region, 128)).toBeCloseTo(3 / 10, 9)
  })

  it('testa pertencimento e retorna os limites internos no ponto externo', () => {
    expect(triangleTypeI.contains(0.7, 0.4)).toBe(true)
    expect(triangleTypeI.contains(0.4, 0.7)).toBe(false)
    expect(triangleTypeI.bounds(0.7)).toEqual([0, 0.7])
    expect(triangleTypeII.contains(0.7, 0.4)).toBe(true)
    expect(triangleTypeII.contains(0.4, 0.7)).toBe(false)
    expect(triangleTypeII.bounds(0.7)).toEqual([0.7, 1])
  })

  it('rejeita limites externos ou internos inválidos e amostras não finitas', () => {
    expect(() => createTypeIRegion([1, 0], () => [0, 1])).toThrow(RangeError)
    expect(() =>
      integral2TypeI(
        () => 1,
        createTypeIRegion([0, 1], () => [2, 1]),
      ),
    ).toThrow(RangeError)
    expect(() => integral2TypeII(() => Number.NaN, triangleTypeII)).toThrow(RangeError)
  })
})
