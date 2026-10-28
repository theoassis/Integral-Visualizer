import { gaussLegendre } from '../quad/gauss'
import type { Integrand2D, Interval } from '../quad/iterated'

export interface RegionBase {
  readonly contains: (x: number, y: number) => boolean
  /** Returns the bounds of the inner variable at a given outer coordinate. */
  readonly bounds: (outer: number) => Interval
}

export interface InequalityRegion extends RegionBase {
  readonly kind: 'inequality'
  readonly xBounds: Interval
  readonly yBounds: Interval
  readonly evaluate: (x: number, y: number) => number
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

export function createInequalityRegion(
  xBounds: Interval,
  yBounds: Interval,
  evaluate: (x: number, y: number) => number,
): InequalityRegion {
  assertInterval(xBounds, 'Os limites de x')
  assertInterval(yBounds, 'Os limites de y')
  if (xBounds[0] === xBounds[1] || yBounds[0] === yBounds[1]) {
    throw new RangeError('A janela da desigualdade precisa ter área positiva.')
  }
  const valueAt = (x: number, y: number) => {
    const value = evaluate(x, y)
    if (!Number.isFinite(value)) {
      throw new RangeError(`A desigualdade não é finita em (${x}, ${y}).`)
    }
    return value
  }
  return Object.freeze({
    kind: 'inequality' as const,
    xBounds: Object.freeze([...xBounds]) as unknown as Interval,
    yBounds: Object.freeze([...yBounds]) as unknown as Interval,
    bounds: () => yBounds,
    evaluate: valueAt,
    contains: (x: number, y: number) => {
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !inside(x, xBounds) ||
        !inside(y, yBounds)
      ) {
        return false
      }
      return valueAt(x, y) <= 0
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

export interface InequalityIntegrationOptions {
  readonly xSlices?: number
  readonly yScanSlices?: number
  readonly maxBoundaryCrossings?: number
  readonly monteCarloSamples?: number
  readonly seed?: number
}

export interface InequalityIntegrationResult {
  readonly value: number
  /** Refinement difference for scan mode, or one standard error for Monte Carlo. */
  readonly errorEstimate: number
  readonly method: 'scan-bisection' | 'monte-carlo'
  readonly samples: number
}

function integrateBetween(
  f: Integrand2D,
  x: number,
  start: number,
  end: number,
  nodes: Float64Array,
  weights: Float64Array,
): number {
  if (start === end) return 0
  const center = start / 2 + end / 2
  const halfWidth = end / 2 - start / 2
  let sum = 0
  for (let index = 0; index < nodes.length; index += 1) {
    const y = center + halfWidth * nodes[index]!
    const value = f(x, y)
    if (!Number.isFinite(value)) {
      throw new RangeError(`O integrando não é finito em (${x}, ${y}).`)
    }
    sum += weights[index]! * value
  }
  return sum * halfWidth
}

function rootsOnVerticalSlice(
  region: InequalityRegion,
  x: number,
  scanSlices: number,
  maxCrossings: number,
): number[] | null {
  const [yMin, yMax] = region.yBounds
  const step = (yMax - yMin) / scanSlices
  const roots: number[] = []
  let left = yMin
  let leftValue = region.evaluate(x, left)
  for (let index = 1; index <= scanSlices; index += 1) {
    const right = yMin + index * step
    const rightValue = region.evaluate(x, right)
    const leftInside = leftValue <= 0
    const rightInside = rightValue <= 0
    if (leftInside !== rightInside) {
      let lo = left
      let hi = right
      const loInside = leftInside
      for (let iteration = 0; iteration < 40; iteration += 1) {
        const middle = lo / 2 + hi / 2
        const middleInside = region.evaluate(x, middle) <= 0
        if (middleInside === loInside) lo = middle
        else hi = middle
      }
      roots.push(lo / 2 + hi / 2)
      if (roots.length > maxCrossings) return null
    }
    left = right
    leftValue = rightValue
  }
  return roots
}

function scanBisectionValue(
  f: Integrand2D,
  region: InequalityRegion,
  xSlices: number,
  yScanSlices: number,
  maxCrossings: number,
): number | null {
  const { nodes, weights } = gaussLegendre(8)
  const [xMin, xMax] = region.xBounds
  const [yMin, yMax] = region.yBounds
  const dx = (xMax - xMin) / xSlices
  let total = 0
  for (let index = 0; index < xSlices; index += 1) {
    const x = xMin + (index + 0.5) * dx
    const roots = rootsOnVerticalSlice(region, x, yScanSlices, maxCrossings)
    if (roots === null) return null
    const cuts = [yMin, ...roots, yMax]
    for (let cut = 0; cut < cuts.length - 1; cut += 1) {
      const start = cuts[cut]!
      const end = cuts[cut + 1]!
      if (region.evaluate(x, start / 2 + end / 2) <= 0) {
        total += integrateBetween(f, x, start, end, nodes, weights) * dx
      }
    }
  }
  if (!Number.isFinite(total))
    throw new RangeError('A integral excede a faixa numérica.')
  return total
}

function monteCarloInequality(
  f: Integrand2D,
  region: InequalityRegion,
  samples: number,
  seed: number,
): InequalityIntegrationResult {
  if (!Number.isSafeInteger(samples) || samples < 2 || samples > 2_000_000) {
    throw new RangeError('O fallback Monte Carlo precisa de 2 a 2.000.000 amostras.')
  }
  let state = seed | 0
  const random = () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
  const [xMin, xMax] = region.xBounds
  const [yMin, yMax] = region.yBounds
  const area = (xMax - xMin) * (yMax - yMin)
  if (!Number.isFinite(area)) {
    throw new RangeError('A janela da desigualdade excede a faixa numérica suportada.')
  }
  let mean = 0
  let squaredDeviationSum = 0
  for (let index = 0; index < samples; index += 1) {
    const x = xMin + random() * (xMax - xMin)
    const y = yMin + random() * (yMax - yMin)
    const value = region.evaluate(x, y) <= 0 ? f(x, y) : 0
    if (!Number.isFinite(value)) {
      throw new RangeError(`O integrando não é finito em (${x}, ${y}).`)
    }
    const delta = value - mean
    mean += delta / (index + 1)
    squaredDeviationSum += delta * (value - mean)
  }
  const variance = Math.max(0, squaredDeviationSum / (samples - 1))
  const value = area * mean
  const errorEstimate = area * Math.sqrt(variance / samples)
  if (!Number.isFinite(value) || !Number.isFinite(errorEstimate)) {
    throw new RangeError('A estimativa Monte Carlo excede a faixa numérica suportada.')
  }
  return {
    value,
    errorEstimate,
    method: 'monte-carlo',
    samples,
  }
}

/** Scans vertical slices, bisects sign changes, and falls back to Monte Carlo for complex boundaries. */
export function integral2Inequality(
  f: Integrand2D,
  region: InequalityRegion,
  options: InequalityIntegrationOptions = {},
): InequalityIntegrationResult {
  const xSlices = options.xSlices ?? 96
  const yScanSlices = options.yScanSlices ?? 256
  const maxCrossings = options.maxBoundaryCrossings ?? 24
  const monteCarloSamples = options.monteCarloSamples ?? 100_000
  for (const [value, name, min, max] of [
    [xSlices, 'As fatias em x', 2, 512],
    [yScanSlices, 'As fatias de varredura em y', 2, 1024],
    [maxCrossings, 'O número máximo de cruzamentos', 1, 1024],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new RangeError(`${name} devem ser inteiras entre ${min} e ${max}.`)
    }
  }
  const coarse = scanBisectionValue(f, region, xSlices, yScanSlices, maxCrossings)
  if (coarse === null) {
    return monteCarloInequality(f, region, monteCarloSamples, options.seed ?? 0x51f15e)
  }
  const fine = scanBisectionValue(f, region, xSlices * 2, yScanSlices * 2, maxCrossings)
  if (fine === null) {
    return monteCarloInequality(f, region, monteCarloSamples, options.seed ?? 0x51f15e)
  }
  const refinementDifference = Math.abs(fine - coarse)
  if (refinementDifference > 0.02 * Math.max(1, Math.abs(fine))) {
    return monteCarloInequality(f, region, monteCarloSamples, options.seed ?? 0x51f15e)
  }
  return {
    value: fine,
    errorEstimate: refinementDifference,
    method: 'scan-bisection',
    samples: xSlices * 5 * yScanSlices,
  }
}
