import {
  riemann2Rectangular,
  type RiemannGridData,
  type RiemannRule,
} from '../core/quad/riemann'
import { integral2Rectangular as integrateByGauss } from '../core/quad/iterated'
import type { VisualizableFunction } from '../core/functions/types'
import { createExpressionFunction } from '../core/functions/expressionFunction'
import { estimateObservedOrder, type ConvergencePoint } from '../core/quad/convergence'

export interface RiemannCalculationRequest {
  readonly jobId: number
  readonly expression: string
  readonly parameters: Record<string, number>
  readonly domain: VisualizableFunction['domain']
  readonly rule: RiemannRule
  readonly xSubdivisions: number
  readonly ySubdivisions: number
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
  const sampleCount = xSubdivisions * ySubdivisions
  const values = new Float64Array(sampleCount)
  const sampleX = new Float64Array(sampleCount)
  const sampleY = new Float64Array(sampleCount)
  const options = {
    rule: request.rule,
    xSubdivisions,
    ySubdivisions,
  }

  const value = riemann2Rectangular(
    func.evaluate,
    [request.domain.x.min, request.domain.x.max],
    [request.domain.y.min, request.domain.y.max],
    options,
    (cell) => {
      const index = cell.row * ySubdivisions + cell.column
      values[index] = cell.value
      sampleX[index] = cell.x
      sampleY[index] = cell.y
    },
  )

  const xBounds = [request.domain.x.min, request.domain.x.max] as const
  const yBounds = [request.domain.y.min, request.domain.y.max] as const
  const referenceValue = integrateByGauss(func.evaluate, xBounds, yBounds, 64)
  const referenceAt32 = integrateByGauss(func.evaluate, xBounds, yBounds, 32)
  const referenceRefinementDifference = Math.abs(referenceValue - referenceAt32)
  const convergenceNoiseFloor =
    64 * Number.EPSILON * Math.max(1, Math.abs(referenceValue))
  const convergenceSubdivisions = [4, 8, 16, 32, 64]
  const convergence = convergenceSubdivisions.map((subdivisions) => {
    const convergenceValue = riemann2Rectangular(func.evaluate, xBounds, yBounds, {
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
      rule: request.rule,
      xMin: request.domain.x.min,
      yMin: request.domain.y.min,
      deltaX: (request.domain.x.max - request.domain.x.min) / xSubdivisions,
      deltaY: (request.domain.y.max - request.domain.y.min) / ySubdivisions,
      xSubdivisions,
      ySubdivisions,
      values,
      sampleX,
      sampleY,
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
