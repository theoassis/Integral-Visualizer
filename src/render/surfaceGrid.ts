import type { VisualizableFunction } from '../core/functions/types'
import { MAX_SURFACE_HEIGHT } from '../core/functions/constants'

export interface SurfaceGrid {
  readonly segments: number
  readonly stepX: number
  readonly stepY: number
  readonly positions: Float32Array
  readonly heights: Float64Array
  readonly validVertices: Uint8Array
  readonly indices: number[]
  readonly invalidSampleCount: number
}

export const SURFACE_SEGMENTS = 96

/** Samples a rectangular domain and omits every triangle that touches an invalid height. */
export function createSurfaceGrid(
  func: Pick<VisualizableFunction, 'domain' | 'evaluate'>,
  segments: number,
): SurfaceGrid {
  if (!Number.isInteger(segments) || segments < 1) {
    throw new RangeError('A malha precisa ter ao menos uma divisão inteira.')
  }

  const { x: xDomain, y: yDomain } = func.domain
  const stepX = (xDomain.max - xDomain.min) / segments
  const stepY = (yDomain.max - yDomain.min) / segments
  const sideLength = segments + 1
  const vertexCount = sideLength * sideLength
  const positions = new Float32Array(vertexCount * 3)
  const heights = new Float64Array(vertexCount)
  const validVertices = new Uint8Array(vertexCount)
  let invalidSampleCount = 0

  for (let i = 0; i <= segments; i += 1) {
    const x = xDomain.min + i * stepX
    for (let j = 0; j <= segments; j += 1) {
      const y = yDomain.min + j * stepY
      const index = i * sideLength + j
      const height = func.evaluate(x, y)
      const valid = Number.isFinite(height) && Math.abs(height) <= MAX_SURFACE_HEIGHT

      positions[index * 3] = x
      positions[index * 3 + 1] = y
      positions[index * 3 + 2] = valid ? height : 0
      heights[index] = valid ? height : Number.NaN
      validVertices[index] = valid ? 1 : 0
      if (!valid) invalidSampleCount += 1
    }
  }

  const indices: number[] = []
  const addTriangleIfValid = (a: number, b: number, c: number) => {
    if (validVertices[a] === 1 && validVertices[b] === 1 && validVertices[c] === 1) {
      indices.push(a, b, c)
    }
  }

  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = i * sideLength + j
      const b = a + sideLength
      const c = a + 1
      const d = b + 1
      addTriangleIfValid(a, b, c)
      addTriangleIfValid(b, d, c)
    }
  }

  return {
    segments,
    stepX,
    stepY,
    positions,
    heights,
    validVertices,
    indices,
    invalidSampleCount,
  }
}

/** Samples a surface cooperatively so a Worker can receive newer jobs between rows. */
export async function createSurfaceGridAsync(
  func: Pick<VisualizableFunction, 'domain' | 'evaluate'>,
  segments: number,
  shouldCancel: () => boolean,
): Promise<SurfaceGrid | null> {
  if (!Number.isInteger(segments) || segments < 1) {
    throw new RangeError('A malha precisa ter ao menos uma divisão inteira.')
  }

  const { x: xDomain, y: yDomain } = func.domain
  const stepX = (xDomain.max - xDomain.min) / segments
  const stepY = (yDomain.max - yDomain.min) / segments
  const sideLength = segments + 1
  const vertexCount = sideLength * sideLength
  const positions = new Float32Array(vertexCount * 3)
  const heights = new Float64Array(vertexCount)
  const validVertices = new Uint8Array(vertexCount)
  let invalidSampleCount = 0

  for (let i = 0; i <= segments; i += 1) {
    if (shouldCancel()) return null
    const x = xDomain.min + i * stepX
    for (let j = 0; j <= segments; j += 1) {
      const y = yDomain.min + j * stepY
      const index = i * sideLength + j
      const height = func.evaluate(x, y)
      const valid = Number.isFinite(height) && Math.abs(height) <= MAX_SURFACE_HEIGHT
      positions[index * 3] = x
      positions[index * 3 + 1] = y
      positions[index * 3 + 2] = valid ? height : 0
      heights[index] = valid ? height : Number.NaN
      validVertices[index] = valid ? 1 : 0
      if (!valid) invalidSampleCount += 1
    }
    if (i % 8 === 7 || i === segments) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
  }

  if (shouldCancel()) return null
  const indices: number[] = []
  const addTriangleIfValid = (a: number, b: number, c: number) => {
    if (validVertices[a] === 1 && validVertices[b] === 1 && validVertices[c] === 1) {
      indices.push(a, b, c)
    }
  }
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = i * sideLength + j
      const b = a + sideLength
      const c = a + 1
      const d = b + 1
      addTriangleIfValid(a, b, c)
      addTriangleIfValid(b, d, c)
    }
  }

  return {
    segments,
    stepX,
    stepY,
    positions,
    heights,
    validVertices,
    indices,
    invalidSampleCount,
  }
}

/** Estimates slope from neighboring valid samples for visual normals only. */
export function estimateGridGradient(
  grid: SurfaceGrid,
  i: number,
  j: number,
): [number, number] {
  const sideLength = grid.segments + 1
  const index = i * sideLength + j
  if (grid.validVertices[index] !== 1) return [0, 0]

  const derivative = (
    minusIndex: number | undefined,
    plusIndex: number | undefined,
    step: number,
  ) => {
    const current = grid.heights[index]!
    const minus =
      minusIndex === undefined || grid.validVertices[minusIndex] !== 1
        ? undefined
        : grid.heights[minusIndex]!
    const plus =
      plusIndex === undefined || grid.validVertices[plusIndex] !== 1
        ? undefined
        : grid.heights[plusIndex]!

    if (minus !== undefined && plus !== undefined) return (plus - minus) / (2 * step)
    if (plus !== undefined) return (plus - current) / step
    if (minus !== undefined) return (current - minus) / step
    return 0
  }

  const dx = derivative(
    i > 0 ? index - sideLength : undefined,
    i < grid.segments ? index + sideLength : undefined,
    grid.stepX,
  )
  const dy = derivative(
    j > 0 ? index - 1 : undefined,
    j < grid.segments ? index + 1 : undefined,
    grid.stepY,
  )
  return [Number.isFinite(dx) ? dx : 0, Number.isFinite(dy) ? dy : 0]
}
