import { describe, expect, it } from 'vitest'
import {
  createRegionFromExpressions,
  riemann2OverRegion,
  type RegionExpressionDefinition,
} from './riemannRegion'

describe('amostragem de regiões para prismas de Riemann', () => {
  it('centro dentro omite células fora do triângulo', () => {
    const region = createRegionFromExpressions(
      {
        kind: 'typeI',
        lowerExpression: '0',
        upperExpression: 'x',
        samplingMode: 'center',
      },
      [0, 1],
      [0, 1],
    )
    const grid = riemann2OverRegion(() => 1, [0, 1], [0, 1], region, 2, 2, 'center')

    expect([...grid.cellFractions]).toEqual([1, 0, 1, 1])
    expect(grid.value).toBe(0.75)
  })

  it('modo preciso pondera a célula pela fração de área estimada', () => {
    const region = createRegionFromExpressions(
      {
        kind: 'typeI',
        lowerExpression: '0',
        upperExpression: 'x',
        samplingMode: 'precise',
      },
      [0, 1],
      [0, 1],
    )
    const grid = riemann2OverRegion(
      () => 1,
      [0, 1],
      [0, 1],
      region,
      1,
      1,
      'precise',
      16,
    )

    expect(grid.cellFractions[0]).toBeCloseTo(0.53125, 5)
    expect(grid.value).toBeCloseTo(0.53125, 5)
  })

  it('constrói limites tipo II dependentes de y', () => {
    const region = createRegionFromExpressions(
      {
        kind: 'typeII',
        lowerExpression: 'y',
        upperExpression: '1',
        samplingMode: 'center',
      },
      [0, 1],
      [0, 1],
    )

    expect(region.contains(0.8, 0.2)).toBe(true)
    expect(region.contains(0.2, 0.8)).toBe(false)
  })

  it('usa interpolação linear dos limites após a troca de ordem', () => {
    const region = createRegionFromExpressions(
      {
        kind: 'typeII',
        lowerExpression: 'interpolado',
        upperExpression: 'interpolado',
        samplingMode: 'precise',
        sampledBounds: {
          outerBounds: [0, 1],
          lowerValues: [0, 1],
          upperValues: [1, 1],
        },
      },
      [0, 1],
      [0, 1],
    )

    expect(region.bounds(0.5)).toEqual([0.5, 1])
    expect(region.contains(0.75, 0.5)).toBe(true)
    expect(region.contains(0.25, 0.5)).toBe(false)
  })

  it('rejeita tabela de limites incompatível com o domínio da região', () => {
    expect(() =>
      createRegionFromExpressions(
        {
          kind: 'typeI',
          lowerExpression: '0',
          upperExpression: '1',
          samplingMode: 'center',
          sampledBounds: {
            outerBounds: [-1, 1],
            lowerValues: [0, 0],
            upperValues: [1, 1],
          },
        },
        [0, 1],
        [0, 1],
      ),
    ).toThrow(/limites interpolados/)
  })

  it.each([
    { kind: 'typeI', lowerExpression: 'y', upperExpression: 'x' },
    { kind: 'typeII', lowerExpression: 'a', upperExpression: '1' },
  ] as const)(
    'rejeita dependência não permitida nos limites',
    ({ kind, lowerExpression, upperExpression }) => {
      const definition: RegionExpressionDefinition = {
        kind,
        lowerExpression,
        upperExpression,
        samplingMode: 'center',
      }
      expect(() => createRegionFromExpressions(definition, [0, 1], [0, 1])).toThrow(
        RangeError,
      )
    },
  )
})
