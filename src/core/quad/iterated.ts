import { gaussLegendre } from './gauss'

export type Integrand2D = (x: number, y: number) => number
export type Interval = readonly [number, number]

/**
 * Evaluates an iterated double integral over an axis-aligned rectangle using
 * a tensor product of Gauss–Legendre rules. Reversed bounds preserve the
 * usual signed-integral orientation. Non-finite samples/results are rejected;
 * singular and improper integrals require a dedicated method.
 */
export function integral2Rectangular(
  f: Integrand2D,
  xBounds: Interval,
  yBounds: Interval,
  order = 32,
): number {
  const { nodes, weights } = gaussLegendre(order)
  const [xStart, xEnd] = xBounds
  const [yStart, yEnd] = yBounds

  if (![xStart, xEnd, yStart, yEnd].every(Number.isFinite)) {
    throw new RangeError('Os limites da integral devem ser números finitos.')
  }

  const xCenter = xStart / 2 + xEnd / 2
  const xHalfWidth = xEnd / 2 - xStart / 2
  const yCenter = yStart / 2 + yEnd / 2
  const yHalfWidth = yEnd / 2 - yStart / 2

  if (![xCenter, xHalfWidth, yCenter, yHalfWidth].every(Number.isFinite)) {
    throw new RangeError('A região retangular excede a faixa numérica suportada.')
  }
  if (xHalfWidth === 0 || yHalfWidth === 0) return 0

  let sum = 0
  let compensation = 0

  for (let i = 0; i < nodes.length; i += 1) {
    const x = xCenter + xHalfWidth * nodes[i]!
    for (let j = 0; j < nodes.length; j += 1) {
      const y = yCenter + yHalfWidth * nodes[j]!
      const sample = f(x, y)
      if (!Number.isFinite(sample)) {
        throw new RangeError(`O integrando não é finito em (${x}, ${y}).`)
      }

      const term = weights[i]! * weights[j]! * sample
      const adjusted = term - compensation
      const next = sum + adjusted
      compensation = next - sum - adjusted
      sum = next
    }
  }

  const result = sum * xHalfWidth * yHalfWidth
  if (!Number.isFinite(result)) {
    throw new RangeError('O resultado da integral excede a faixa numérica suportada.')
  }
  return result
}

/** Integrates over a disk by the polar substitution (x,y)=(r cos θ,r sin θ). */
export function integral2DiskPolar(f: Integrand2D, radius = 1, order = 32): number {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError('O raio do disco precisa ser finito e positivo.')
  }

  return integral2Rectangular(
    (r, theta) => f(r * Math.cos(theta), r * Math.sin(theta)) * r,
    [0, radius],
    [0, 2 * Math.PI],
    order,
  )
}
