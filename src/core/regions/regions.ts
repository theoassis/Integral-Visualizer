import { gaussLegendre } from '../quad/gauss'
import type { Integrand2D, Interval } from '../quad/iterated'

interface RegionBase {
  readonly contains: (x: number, y: number) => boolean
  /** Returns the bounds of the inner variable at a given outer coordinate. */
  readonly bounds: (outer: number) => Interval
}

export interface TypeIRegion extends RegionBase {
  readonly kind: 'typeI'
  /** a ≤ x ≤ b */
  readonly xBounds: Interval
  /** g₁(x) ≤ y ≤ g₂(x) */
  readonly yBounds: (x: number) => Interval
}

export interface TypeIIRegion extends RegionBase {
  readonly kind: 'typeII'
  /** c ≤ y ≤ d */
  readonly yBounds: Interval
  /** h₁(y) ≤ x ≤ h₂(y) */
  readonly xBounds: (y: number) => Interval
}

export interface PolarRegion extends RegionBase {
  readonly kind: 'polar'
  readonly radiusBounds: Interval
  readonly thetaBounds: Interval
}

function assertInterval(interval: Interval, description: string): void {
  if (
    interval.length !== 2 ||
    !Number.isFinite(interval[0]) ||
    !Number.isFinite(interval[1]) ||
    interval[0] > interval[1]
  ) {
    throw new RangeError(`${description} devem ser finitos e estar em ordem crescente.`)
  }
}

function inside(value: number, interval: Interval): boolean {
  return value >= interval[0] && value <= interval[1]
}

export function createTypeIRegion(
  xBounds: Interval,
  yBounds: (x: number) => Interval,
): TypeIRegion {
  assertInterval(xBounds, 'Os limites externos de x')
  return Object.freeze({
    kind: 'typeI' as const,
    xBounds: Object.freeze([...xBounds]) as unknown as Interval,
    yBounds,
    bounds: yBounds,
    contains: (x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || !inside(x, xBounds))
        return false
      try {
        const interval = yBounds(x)
        assertInterval(interval, 'Os limites internos de y')
        return inside(y, interval)
      } catch {
        return false
      }
    },
  })
}

export function createTypeIIRegion(
  yBounds: Interval,
  xBounds: (y: number) => Interval,
): TypeIIRegion {
  assertInterval(yBounds, 'Os limites externos de y')
  return Object.freeze({
    kind: 'typeII' as const,
    yBounds: Object.freeze([...yBounds]) as unknown as Interval,
    xBounds,
    bounds: xBounds,
    contains: (x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || !inside(y, yBounds))
        return false
      try {
        const interval = xBounds(y)
        assertInterval(interval, 'Os limites internos de x')
        return inside(x, interval)
      } catch {
        return false
      }
    },
  })
}

/** Polar sector with 0 ≤ rMin ≤ r ≤ rMax and thetaMin ≤ θ ≤ thetaMax. */
export function createPolarRegion(
  radiusBounds: Interval,
  thetaBounds: Interval,
): PolarRegion {
  assertInterval(radiusBounds, 'Os limites radiais')
  assertInterval(thetaBounds, 'Os limites angulares')
  if (radiusBounds[0] < 0 || radiusBounds[0] === radiusBounds[1]) {
    throw new RangeError('Os raios devem ser não negativos e crescentes.')
  }
  if (
    thetaBounds[0] === thetaBounds[1] ||
    thetaBounds[1] - thetaBounds[0] > 2 * Math.PI
  ) {
    throw new RangeError('A abertura angular deve ser maior que zero e no máximo 2π.')
  }
  const [thetaStart, thetaEnd] = thetaBounds
  const angleSpan = thetaEnd - thetaStart
  return Object.freeze({
    kind: 'polar' as const,
    radiusBounds: Object.freeze([...radiusBounds]) as unknown as Interval,
    thetaBounds: Object.freeze([...thetaBounds]) as unknown as Interval,
    bounds: () => radiusBounds,
    contains: (x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false
      const radius = Math.hypot(x, y)
      if (radius < radiusBounds[0] || radius > radiusBounds[1]) return false
      if (radius === 0) return true
      const angle = Math.atan2(y, x)
      const offset =
        (((angle - thetaStart) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      return offset <= angleSpan + 16 * Number.EPSILON
    },
  })
}

function integrateOverRegion(
  outerBounds: Interval,
  innerBoundsAt: (outer: number) => Interval,
  sampleIntegrand: (outer: number, inner: number) => number,
  order: number,
): number {
  assertInterval(outerBounds, 'Os limites externos')
  const { nodes, weights } = gaussLegendre(order)
  const [outerStart, outerEnd] = outerBounds
  const outerHalfWidth = outerEnd / 2 - outerStart / 2
  if (outerHalfWidth === 0) return 0
  const outerCenter = outerStart / 2 + outerEnd / 2
  let sum = 0
  let compensation = 0

  for (let i = 0; i < nodes.length; i += 1) {
    const outer = outerCenter + outerHalfWidth * nodes[i]!
    const innerBounds = innerBoundsAt(outer)
    assertInterval(innerBounds, 'Os limites internos')
    const innerHalfWidth = innerBounds[1] / 2 - innerBounds[0] / 2
    if (innerHalfWidth === 0) continue
    const innerCenter = innerBounds[0] / 2 + innerBounds[1] / 2

    for (let j = 0; j < nodes.length; j += 1) {
      const inner = innerCenter + innerHalfWidth * nodes[j]!
      const sample = sampleIntegrand(outer, inner)
      if (!Number.isFinite(sample)) {
        throw new RangeError(`O integrando não é finito em (${outer}, ${inner}).`)
      }
      const term = weights[i]! * weights[j]! * sample * innerHalfWidth
      const adjusted = term - compensation
      const next = sum + adjusted
      compensation = next - sum - adjusted
      sum = next
    }
  }

  const result = sum * outerHalfWidth
  if (!Number.isFinite(result)) {
    throw new RangeError('O resultado da integral excede a faixa numérica suportada.')
  }
  return result
}

/** Integrates f over a type-I region: ∫ₐᵇ ∫g₁(x)^g₂(x) f(x,y) dy dx. */
export function integral2TypeI(
  f: Integrand2D,
  region: TypeIRegion,
  order = 32,
): number {
  return integrateOverRegion(region.xBounds, region.yBounds, (x, y) => f(x, y), order)
}

/** Integrates f over a type-II region: ∫cᵈ ∫h₁(y)^h₂(y) f(x,y) dx dy. */
export function integral2TypeII(
  f: Integrand2D,
  region: TypeIIRegion,
  order = 32,
): number {
  return integrateOverRegion(region.yBounds, region.xBounds, (y, x) => f(x, y), order)
}

/** Integrates over a polar sector; the area element includes the Jacobian r. */
export function integral2Polar(
  f: Integrand2D,
  region: PolarRegion,
  order = 32,
): number {
  return integrateOverRegion(
    region.thetaBounds,
    () => region.radiusBounds,
    (theta, radius) => f(radius * Math.cos(theta), radius * Math.sin(theta)) * radius,
    order,
  )
}
