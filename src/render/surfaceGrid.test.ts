import { describe, expect, it } from 'vitest'
import { createExpressionFunction } from '../core/functions/expressionFunction'
import type { VisualizableFunction } from '../core/functions/types'
import { createSurfaceGrid } from './surfaceGrid'

function sampleFunction(
  evaluate: (x: number, y: number) => number,
): VisualizableFunction {
  return {
    id: 'grid-test',
    name: 'Função de teste',
    formula: 'z = f(x, y)',
    formulaPlain: 'z igual a f de x e y',
    domain: {
      x: { min: -1, max: 1 },
      y: { min: -1, max: 1 },
    },
    domainLabel: '−1 ≤ x, y ≤ 1',
    range: { min: -1, max: 1 },
    evaluate,
    criticalPoints: [],
    analysis: [],
  }
}

describe('createSurfaceGrid', () => {
  it('omite células que cruzariam uma descontinuidade em 1/x', () => {
    const grid = createSurfaceGrid(
      sampleFunction((x) => 1 / x),
      8,
    )
    const invalidIndices = Array.from(grid.validVertices, (isValid, index) =>
      isValid ? -1 : index,
    ).filter((index) => index >= 0)

    expect(grid.invalidSampleCount).toBe(9)
    expect(grid.indices.length).toBeGreaterThan(0)
    expect(grid.indices.length).toBeLessThan(8 * 8 * 6)
    expect(grid.indices.every((index) => grid.validVertices[index] === 1)).toBe(true)
    expect(invalidIndices.every((index) => grid.positions[index * 3] === 0)).toBe(true)
    expect([...grid.positions].every(Number.isFinite)).toBe(true)
  })

  it('deixa a região x < 0 aberta para z = sqrt(x)', () => {
    const grid = createSurfaceGrid(
      sampleFunction((x) => Math.sqrt(x)),
      8,
    )

    expect(grid.invalidSampleCount).toBe(4 * 9)
    expect(grid.indices.length).toBeGreaterThan(0)
    for (const index of grid.indices) {
      expect(grid.validVertices[index]).toBe(1)
      expect(grid.positions[index * 3]).toBeGreaterThanOrEqual(0)
    }
  })

  it('gera uma malha sem triângulos quando nenhum ponto tem valor real', () => {
    const grid = createSurfaceGrid(
      sampleFunction(() => Number.NaN),
      4,
    )

    expect(grid.invalidSampleCount).toBe(25)
    expect(grid.indices).toEqual([])
    expect([...grid.positions].every(Number.isFinite)).toBe(true)
  })

  it('omite alturas além da faixa gráfica configurada', () => {
    const grid = createSurfaceGrid(
      sampleFunction(() => 1e7),
      2,
    )

    expect(grid.invalidSampleCount).toBe(9)
    expect(grid.indices).toEqual([])
    expect([...grid.positions].every(Number.isFinite)).toBe(true)
  })

  it('deixa buracos nos polos de tangente da expressão senxtany', () => {
    const grid = createSurfaceGrid(createExpressionFunction('senxtany'), 96)

    expect(grid.invalidSampleCount).toBeGreaterThan(0)
    expect(grid.indices.length).toBeLessThan(96 * 96 * 6)
    expect(grid.indices.every((index) => grid.validVertices[index] === 1)).toBe(true)
    expect([...grid.positions].every(Number.isFinite)).toBe(true)
  })

  it('mantém as duas faces das células quando todos os valores são finitos', () => {
    const grid = createSurfaceGrid(
      sampleFunction((x, y) => x + y),
      4,
    )

    expect(grid.invalidSampleCount).toBe(0)
    expect(grid.indices).toHaveLength(4 * 4 * 6)
  })

  it('guarda derivadas analíticas por vértice para construir as normais', () => {
    const func = sampleFunction((x, y) => x ** 2 + y ** 2)
    func.gradient = (x, y) => [2 * x, 2 * y]
    const grid = createSurfaceGrid(func, 2)
    const vertexIndex = 2 * 3

    expect(grid.gradientX[vertexIndex]).toBe(2)
    expect(grid.gradientY[vertexIndex]).toBe(-2)
  })

  it('deixa derivadas ausentes marcadas para o fallback de diferenças finitas', () => {
    const grid = createSurfaceGrid(createExpressionFunction('floor(x)+y'), 2)

    expect([...grid.gradientX].every(Number.isNaN)).toBe(true)
    expect([...grid.gradientY].every(Number.isNaN)).toBe(true)
  })
})
