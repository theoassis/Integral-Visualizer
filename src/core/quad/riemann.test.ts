import { describe, expect, it } from 'vitest'
import { compareRiemannRefinement, riemann2Rectangular } from './riemann'

describe('riemann2Rectangular', () => {
  it.each([
    ['left', 1 / 16],
    ['right', 9 / 16],
    ['midpoint', 1 / 4],
    ['lower', 1 / 16],
    ['upper', 9 / 16],
  ] as const)('calcula a regra %s para xy em [0,1]²', (rule, exact) => {
    const value = riemann2Rectangular((x, y) => x * y, [0, 1], [0, 1], {
      rule,
      xSubdivisions: 2,
      ySubdivisions: 2,
    })

    expect(value).toBeCloseTo(exact, 14)
  })

  it('permite uma soma aleatória reproduzível com gerador fornecido pelo chamador', () => {
    const value = riemann2Rectangular((x, y) => x * y, [0, 1], [0, 1], {
      rule: 'random',
      xSubdivisions: 2,
      ySubdivisions: 2,
      random: () => 0.5,
    })

    expect(value).toBeCloseTo(1 / 4, 14)
  })

  it('expõe a amostra e a contribuição de cada célula para visualização', () => {
    const cells: Array<{
      row: number
      column: number
      x: number
      y: number
      value: number
      deltaArea: number
      contribution: number
    }> = []
    const value = riemann2Rectangular(
      (x, y) => x * y,
      [0, 1],
      [0, 1],
      { rule: 'midpoint', xSubdivisions: 2, ySubdivisions: 2 },
      (cell) => cells.push(cell),
    )

    expect(cells).toHaveLength(4)
    expect(cells[0]).toEqual({
      row: 0,
      column: 0,
      x: 0.25,
      y: 0.25,
      value: 0.0625,
      deltaArea: 0.25,
      contribution: 0.015625,
    })
    expect(cells.reduce((sum, cell) => sum + cell.contribution, 0)).toBeCloseTo(
      value,
      14,
    )
  })

  it('preserva orientação e escala em retângulos deslocados', () => {
    const options = { rule: 'midpoint', xSubdivisions: 20, ySubdivisions: 20 } as const
    const forward = riemann2Rectangular(() => 1, [2, 4], [-3, 1], options)
    const reversed = riemann2Rectangular(() => 1, [4, 2], [-3, 1], options)

    expect(forward).toBeCloseTo(8, 14)
    expect(reversed).toBeCloseTo(-8, 14)
  })

  it('inverte a seleção amostrada inferior/superior quando a orientação é negativa', () => {
    const lower = riemann2Rectangular((x, y) => x * y, [1, 0], [0, 1], {
      rule: 'lower',
      xSubdivisions: 2,
      ySubdivisions: 2,
    })
    const upper = riemann2Rectangular((x, y) => x * y, [1, 0], [0, 1], {
      rule: 'upper',
      xSubdivisions: 2,
      ySubdivisions: 2,
    })

    expect(lower).toBeCloseTo(-9 / 16, 14)
    expect(upper).toBeCloseTo(-1 / 16, 14)
  })

  it('retorna zero em região degenerada sem avaliar o integrando', () => {
    const integrand = () => {
      throw new Error('não deve ser avaliado')
    }

    expect(
      riemann2Rectangular(integrand, [1, 1], [0, 1], {
        rule: 'midpoint',
        xSubdivisions: 8,
        ySubdivisions: 8,
      }),
    ).toBe(0)
  })

  it('mostra ordem de convergência 2 para ponto médio em x²+y²', () => {
    const error = (subdivisions: number) =>
      Math.abs(
        riemann2Rectangular((x, y) => x ** 2 + y ** 2, [0, 1], [0, 1], {
          rule: 'midpoint',
          xSubdivisions: subdivisions,
          ySubdivisions: subdivisions,
        }) -
          2 / 3,
      )
    const errorN = error(32)
    const error2N = error(64)

    expect(errorN / error2N).toBeCloseTo(4, 10)
  })

  it('mostra ordem de convergência 1 para a regra esquerda em x²+y²', () => {
    const error = (subdivisions: number) =>
      Math.abs(
        riemann2Rectangular((x, y) => x ** 2 + y ** 2, [0, 1], [0, 1], {
          rule: 'left',
          xSubdivisions: subdivisions,
          ySubdivisions: subdivisions,
        }) -
          2 / 3,
      )
    const errorN = error(128)
    const error2N = error(256)

    expect(errorN / error2N).toBeCloseTo(2, 2)
  })

  it('estima o erro do ponto médio pela diferença entre n e 2n', () => {
    const result = compareRiemannRefinement((x, y) => x ** 2 + y ** 2, [0, 1], [0, 1], {
      rule: 'midpoint',
      xSubdivisions: 8,
      ySubdivisions: 8,
    })

    expect(result.coarseValue).toBeCloseTo(2 / 3 - 1 / (6 * 8 ** 2), 14)
    expect(result.refinedValue).toBeCloseTo(2 / 3 - 1 / (6 * 16 ** 2), 14)
    expect(result.estimatedAbsoluteError).toBeCloseTo(1 / (6 * 16 ** 2), 14)
    expect(result.estimatedRelativeError).toBeCloseTo(
      result.estimatedAbsoluteError / result.refinedValue,
      14,
    )
  })

  it('rejeita opções inválidas, limites e amostras não finitas', () => {
    expect(() =>
      riemann2Rectangular(() => 1, [0, 1], [0, 1], {
        rule: 'midpoint',
        xSubdivisions: 0,
        ySubdivisions: 1,
      }),
    ).toThrow(RangeError)
    expect(() =>
      riemann2Rectangular(() => 1, [0, 1], [0, 1], {
        rule: 'random',
        xSubdivisions: 1,
        ySubdivisions: 1,
        random: () => 1,
      }),
    ).toThrow(RangeError)
    expect(() =>
      riemann2Rectangular(() => Number.NaN, [0, 1], [0, 1], {
        rule: 'midpoint',
        xSubdivisions: 1,
        ySubdivisions: 1,
      }),
    ).toThrow(RangeError)
    expect(() =>
      riemann2Rectangular(() => 1, [0, Infinity], [0, 1], {
        rule: 'midpoint',
        xSubdivisions: 1,
        ySubdivisions: 1,
      }),
    ).toThrow(RangeError)
  })
})
