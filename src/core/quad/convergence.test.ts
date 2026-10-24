import { describe, expect, it } from 'vitest'
import { estimateObservedOrder } from './convergence'

describe('estimateObservedOrder', () => {
  it('recupera a ordem dois de erros proporcionais a n⁻²', () => {
    const result = estimateObservedOrder([
      { subdivisions: 8, error: 3 / 8 ** 2 },
      { subdivisions: 16, error: 3 / 16 ** 2 },
      { subdivisions: 32, error: 3 / 32 ** 2 },
      { subdivisions: 64, error: 3 / 64 ** 2 },
    ])

    expect(result).toBeCloseTo(2, 12)
  })

  it('recupera a ordem um e ignora erros nulos que não podem entrar em log', () => {
    const result = estimateObservedOrder([
      { subdivisions: 8, error: 0.125 },
      { subdivisions: 16, error: 0.0625 },
      { subdivisions: 32, error: 0.03125 },
      { subdivisions: 64, error: 0 },
    ])

    expect(result).toBeCloseTo(1, 12)
  })

  it('não estima ordem com menos de dois erros positivos', () => {
    expect(
      estimateObservedOrder([
        { subdivisions: 8, error: 0 },
        { subdivisions: 16, error: 1e-12 },
      ]),
    ).toBeNull()
  })

  it('rejeita divisões inválidas e erros negativos', () => {
    expect(() =>
      estimateObservedOrder([
        { subdivisions: 0, error: 1 },
        { subdivisions: 2, error: -1 },
      ]),
    ).toThrow(RangeError)
  })
})
