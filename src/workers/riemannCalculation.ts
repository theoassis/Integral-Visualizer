import {
  riemann2Rectangular,
  type RiemannGridData,
  type RiemannRule,
} from '../core/quad/riemann'
import { integral2Rectangular as integrateByGauss } from '../core/quad/iterated'
import type { VisualizableFunction } from '../core/functions/types'
import { createExpressionFunction } from '../core/functions/expressionFunction'
import { estimateObservedOrder, type ConvergencePoint } from '../core/quad/convergence'
import { integral2TypeI, integral2TypeII } from '../core/regions/regions'
import {
  createRegionFromExpressions,
  riemann2OverRegion,
} from '../core/regions/riemannRegion'
import type { RegionExpressionDefinition } from '../core/regions/riemannRegion'

export interface RiemannCalculationRequest {
  readonly jobId: number
  readonly expression: string
  readonly parameters: Record<string, number>
  readonly domain: VisualizableFunction['domain']
  readonly rule: RiemannRule
  readonly xSubdivisions: number
  readonly ySubdivisions: number
  readonly region?: RegionExpressionDefinition
}

export interface RiemannCalculationResult {
  readonly jobId: number
  readonly value: number
  readonly referenceValue: number
  readonly absoluteError: number
  readonly relativeError: number | null
  readonly referenceRefinementDifference: number
  readonly convergence: readonly ConvergencePoint[]
  readonly observedOrder: number | null
  readonly elapsedMs: number
  readonly grid: RiemannGridData
}

export function calculateRiemannIntegral(
  request: RiemannCalculationRequest,
): RiemannCalculationResult {
  const startedAt = performance.now()
  const func = createExpressionFunction(
    request.expression,
    request.parameters,
    request.domain,
  )
  const { xSubdivisions, ySubdivisions } = request
  const xBounds = [request.domain.x.min, request.domain.x.max] as const
  const yBounds = [request.domain.y.min, request.domain.y.max] as const
  const region = request.region
    ? createRegionFromExpressions(request.region, xBounds, yBounds)
    : null
  const sampleRegion = (xCount: number, yCount: number) => {
    if (!request.region || !region) return null
    return riemann2OverRegion(
      func.evaluate,
      xBounds,
      yBounds,
      region,
      xCount,
      yCount,
      request.region.samplingMode,
    )
  }
  const regionGrid = sampleRegion(xSubdivisions, ySubdivisions)
  const sampleCount = xSubdivisions * ySubdivisions
  const values = new Float64Array(sampleCount)
  const sampleX = new Float64Array(sampleCount)
  const sampleY = new Float64Array(sampleCount)
  let value: number
  if (regionGrid) {
    values.set(regionGrid.values)
    sampleX.set(regionGrid.sampleX)
    sampleY.set(regionGrid.sampleY)
    value = regionGrid.value
  } else {
    value = riemann2Rectangular(
      func.evaluate,
      xBounds,
      yBounds,
      { rule: request.rule, xSubdivisions, ySubdivisions },
      (cell) => {
        const index = cell.row * ySubdivisions + cell.column
        values[index] = cell.value
        sampleX[index] = cell.x
        sampleY[index] = cell.y
      },
    )
  }

  const integrate = (order: number) => {
    if (!request.region || !region) {
      return integrateByGauss(func.evaluate, xBounds, yBounds, order)
    }
    return region.kind === 'typeI'
      ? integral2TypeI(func.evaluate, region, order)
      : integral2TypeII(func.evaluate, region, order)
  }
  const referenceValue = integrate(64)
  const referenceAt32 = integrate(32)
  const referenceRefinementDifference = Math.abs(referenceValue - referenceAt32)
  const convergenceNoiseFloor =
    64 * Number.EPSILON * Math.max(1, Math.abs(referenceValue))
  const convergenceSubdivisions = [4, 8, 16, 32, 64]
  const convergence = convergenceSubdivisions.map((subdivisions) => {
    const convergenceValue = request.region
      ? (sampleRegion(subdivisions, subdivisions)?.value ?? Number.NaN)
      : riemann2Rectangular(func.evaluate, xBounds, yBounds, {
          rule: request.rule,
          xSubdivisions: subdivisions,
          ySubdivisions: subdivisions,
          ...(request.rule === 'random'
            ? { random: createSeededRandom(request.expression, subdivisions) }
            : {}),
        })
    const rawError = Math.abs(convergenceValue - referenceValue)
    return {
      subdivisions,
      error: rawError <= convergenceNoiseFloor ? 0 : rawError,
    }
  })
  const absoluteError = Math.abs(value - referenceValue)
  const relativeError =
    Math.abs(referenceValue) <= 64 * Number.EPSILON * Math.max(1, Math.abs(value))
      ? null
      : absoluteError / Math.abs(referenceValue)

  return {
    jobId: request.jobId,
    value,
    referenceValue,
    absoluteError,
    relativeError,
    referenceRefinementDifference,
    convergence,
    observedOrder: estimateObservedOrder(convergence),
    elapsedMs: performance.now() - startedAt,
    grid: {
      rule: request.region ? 'midpoint' : request.rule,
      xMin: request.domain.x.min,
      yMin: request.domain.y.min,
      deltaX: (request.domain.x.max - request.domain.x.min) / xSubdivisions,
      deltaY: (request.domain.y.max - request.domain.y.min) / ySubdivisions,
      xSubdivisions,
      ySubdivisions,
      values,
      sampleX,
      sampleY,
      ...(regionGrid ? { cellFractions: regionGrid.cellFractions } : {}),
    },
  }
}

function createSeededRandom(expression: string, subdivisions: number): () => number {
  let state = 2166136261 ^ subdivisions
  for (let index = 0; index < expression.length; index += 1) {
    state = Math.imul(state ^ expression.charCodeAt(index), 16777619)
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
