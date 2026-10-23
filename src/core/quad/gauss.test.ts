import { describe, expect, it } from 'vitest'
import { gaussLegendre } from './gauss'

describe('gaussLegendre', () => {
  it('retorna o nó e o peso exatos da regra de ordem 1', () => {
    const rule = gaussLegendre(1)

    expect(rule.nodes[0]).toBe(0)
    expect(rule.weights[0]).toBe(2)
  })

  it('retorna nós e pesos conhecidos para as ordens 2 e 3', () => {
    const twoPointRule = gaussLegendre(2)
    const root = Math.sqrt(1 / 3)

    expect(twoPointRule.nodes[0]).toBeCloseTo(-root, 14)
    expect(twoPointRule.nodes[1]).toBeCloseTo(root, 14)
    expect(twoPointRule.weights[0]).toBeCloseTo(1, 14)
    expect(twoPointRule.weights[1]).toBeCloseTo(1, 14)

    const threePointRule = gaussLegendre(3)
    const outerRoot = Math.sqrt(3 / 5)

    expect(threePointRule.nodes[0]).toBeCloseTo(-outerRoot, 14)
    expect(threePointRule.nodes[1]).toBeCloseTo(0, 14)
    expect(threePointRule.nodes[2]).toBeCloseTo(outerRoot, 14)
    expect(threePointRule.weights[0]).toBeCloseTo(5 / 9, 14)
    expect(threePointRule.weights[1]).toBeCloseTo(8 / 9, 14)
    expect(threePointRule.weights[2]).toBeCloseTo(5 / 9, 14)
  })

  it('não deixa a alteração de uma regra retornada corromper o cache', () => {
    const firstRule = gaussLegendre(2)
    firstRule.nodes[0] = 0
    firstRule.weights[0] = 0

    const nextRule = gaussLegendre(2)
    expect(nextRule.nodes[0]).toBeCloseTo(-1 / Math.sqrt(3), 14)
    expect(nextRule.weights[0]).toBeCloseTo(1, 14)
  })

  it('integra exatamente, até arredondamento, polinômios de grau até 2n−1', () => {
    for (let order = 1; order <= 8; order += 1) {
      const { nodes, weights } = gaussLegendre(order)

      for (let degree = 0; degree <= 2 * order - 1; degree += 1) {
        let approximation = 0
        for (let index = 0; index < order; index += 1) {
          approximation += weights[index]! * nodes[index]! ** degree
        }

        const exact = degree % 2 === 0 ? 2 / (degree + 1) : 0
        expect(approximation).toBeCloseTo(exact, 13)
      }
    }
  })

  it('mantém ordem crescente, simetria e pesos positivos em ordens maiores', () => {
    const order = 256
    const { nodes, weights } = gaussLegendre(order)

    expect(nodes).toHaveLength(order)
    expect(weights).toHaveLength(order)
    expect(
      Array.from(nodes).every((node, index) => index === 0 || nodes[index - 1]! < node),
    ).toBe(true)
    expect(Array.from(weights).every((weight) => weight > 0)).toBe(true)
    expect(Array.from(weights).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(
      2,
      14,
    )

    for (let index = 0; index < order; index += 1) {
      const opposite = order - index - 1
      expect(nodes[index]! + nodes[opposite]!).toBeCloseTo(0, 14)
      expect(weights[index]).toBeCloseTo(weights[opposite]!, 14)
    }
  })

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 257])(
    'rejeita a ordem inválida %s',
    (order) => {
      expect(() => gaussLegendre(order)).toThrow(RangeError)
    },
  )
})
