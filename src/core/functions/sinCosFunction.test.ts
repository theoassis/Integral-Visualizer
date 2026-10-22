import { describe, expect, it } from 'vitest'
import { sinCosFunction } from './sinCosFunction'

describe('sinCosFunction (z = sin(x) · cos(y))', () => {
  const { evaluate, criticalPoints, range, domain } = sinCosFunction
  const gradient = sinCosFunction.gradient!

  it('possui o domínio correto [−π, π]²', () => {
    expect(domain.x.min).toBeCloseTo(-Math.PI)
    expect(domain.x.max).toBeCloseTo(Math.PI)
    expect(domain.y.min).toBeCloseTo(-Math.PI)
    expect(domain.y.max).toBeCloseTo(Math.PI)
  })

  it('possui a faixa de valores (range) [−1, 1]', () => {
    expect(range.min).toBe(-1)
    expect(range.max).toBe(1)
  })

  it('avalia a função corretamente em pontos de teste conhecidos', () => {
    // Origem: sin(0) * cos(0) = 0
    expect(evaluate(0, 0)).toBeCloseTo(0)

    // Máximo: sin(π/2) * cos(0) = 1 * 1 = 1
    expect(evaluate(Math.PI / 2, 0)).toBeCloseTo(1)

    // Mínimo: sin(-π/2) * cos(0) = -1 * 1 = -1
    expect(evaluate(-Math.PI / 2, 0)).toBeCloseTo(-1)

    // Ponto de sela na origem das coordenadas y: sin(0) * cos(π/2) = 0 * 0 = 0
    expect(evaluate(0, Math.PI / 2)).toBeCloseTo(0)
    expect(evaluate(0, -Math.PI / 2)).toBeCloseTo(0)

    // Extremos nos cantos do domínio
    expect(evaluate(Math.PI / 2, Math.PI)).toBeCloseTo(-1)
    expect(evaluate(-Math.PI / 2, -Math.PI)).toBeCloseTo(1)
  })

  it('calcula o gradiente simbólico exatamente', () => {
    // ∇f(0, 0) = (cos(0)·cos(0), −sin(0)·sin(0)) = (1, 0)
    const [gx0, gy0] = gradient(0, 0)
    expect(gx0).toBeCloseTo(1)
    expect(gy0).toBeCloseTo(0)

    // Em pontos críticos, o gradiente deve ser (0, 0)
    for (const cp of criticalPoints) {
      const [gx, gy] = gradient(cp.x, cp.y)
      expect(Math.hypot(gx, gy)).toBeCloseTo(0, 5)
    }
  })

  it('o gradiente confere com diferenças finitas centrais em pontos arbitrários', () => {
    const h = 1e-6
    const testPoints: [number, number][] = [
      [0.5, 0.7],
      [-1.2, 0.4],
      [2.1, -1.8],
      [-0.8, -2.5],
    ]

    for (const [x, y] of testPoints) {
      const [gxSym, gySym] = gradient(x, y)
      const gxNum = (evaluate(x + h, y) - evaluate(x - h, y)) / (2 * h)
      const gyNum = (evaluate(x, y + h) - evaluate(x, y - h)) / (2 * h)

      expect(gxSym).toBeCloseTo(gxNum, 5)
      expect(gySym).toBeCloseTo(gyNum, 5)
    }
  })

  it('contém exatamente 12 pontos críticos no domínio [−π, π]²', () => {
    expect(criticalPoints).toHaveLength(12)

    const maxPoints = criticalPoints.filter((p) => p.kind === 'maximum')
    const minPoints = criticalPoints.filter((p) => p.kind === 'minimum')
    const saddles = criticalPoints.filter((p) => p.kind === 'saddle')

    expect(maxPoints).toHaveLength(3)
    expect(minPoints).toHaveLength(3)
    expect(saddles).toHaveLength(6)

    // Todos os máximos devem ter z = 1
    for (const p of maxPoints) {
      expect(evaluate(p.x, p.y)).toBeCloseTo(1)
      expect(p.z).toBeCloseTo(1)
    }

    // Todos os mínimos devem ter z = -1
    for (const p of minPoints) {
      expect(evaluate(p.x, p.y)).toBeCloseTo(-1)
      expect(p.z).toBeCloseTo(-1)
    }

    // Todas as selas devem ter z = 0
    for (const p of saddles) {
      expect(evaluate(p.x, p.y)).toBeCloseTo(0)
      expect(p.z).toBeCloseTo(0)
    }
  })

  it('satisfaz o critério da Hessiana (D e f_xx) para cada ponto crítico', () => {
    for (const cp of criticalPoints) {
      const fxx = -Math.sin(cp.x) * Math.cos(cp.y)
      const fyy = -Math.sin(cp.x) * Math.cos(cp.y)
      const fxy = -Math.cos(cp.x) * Math.sin(cp.y)
      const detH = fxx * fyy - fxy * fxy

      if (cp.kind === 'maximum') {
        expect(detH).toBeGreaterThan(0)
        expect(fxx).toBeLessThan(0)
      } else if (cp.kind === 'minimum') {
        expect(detH).toBeGreaterThan(0)
        expect(fxx).toBeGreaterThan(0)
      } else if (cp.kind === 'saddle') {
        expect(detH).toBeLessThan(0)
      }
    }
  })

  it('satisfaz a equação de Helmholtz Δf + 2f = 0 em pontos arbitrários', () => {
    const testPoints: [number, number][] = [
      [0, 0],
      [1, 1],
      [-2, 1.5],
      [Math.PI / 4, -Math.PI / 3],
    ]

    for (const [x, y] of testPoints) {
      const f = evaluate(x, y)
      const fxx = -Math.sin(x) * Math.cos(y)
      const fyy = -Math.sin(x) * Math.cos(y)
      const laplacian = fxx + fyy

      // Δf + 2f = 0
      expect(laplacian + 2 * f).toBeCloseTo(0)
    }
  })
})
