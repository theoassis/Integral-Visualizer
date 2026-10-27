import type { Integrand2D, Interval } from '../quad/iterated'
import { compileExpression } from '../expr/codegen'
import { createTypeIRegion, createTypeIIRegion } from './regions'
import type { TypeIRegion, TypeIIRegion } from './regions'

export type RegionSamplingMode = 'center' | 'precise'
export type IntegrationRegion = TypeIRegion | TypeIIRegion

export interface RegionExpressionDefinition {
  readonly kind: 'typeI' | 'typeII'
  readonly lowerExpression: string
  readonly upperExpression: string
  readonly samplingMode: RegionSamplingMode
}

export interface RegionRiemannGrid {
  readonly value: number
  readonly xMin: number
  readonly yMin: number
  readonly deltaX: number
  readonly deltaY: number
  readonly xSubdivisions: number
  readonly ySubdivisions: number
  readonly values: Float64Array
  readonly sampleX: Float64Array
  readonly sampleY: Float64Array
  /** Approximate fraction of each rectangular cell lying inside the region. */
  readonly cellFractions: Float32Array
}

const MAX_REGION_CELLS = 1_000_000
const MAX_PRECISE_SAMPLES_PER_CELL = 16

/** Compiles the two boundary curves for a calculator-defined type-I or type-II region. */
export function createRegionFromExpressions(
  definition: RegionExpressionDefinition,
  xBounds: Interval,
  yBounds: Interval,
): IntegrationRegion {
  const variable = definition.kind === 'typeI' ? 'x' : 'y'
  const compileBoundary = (source: string) => {
    const expression = compileExpression(source)
    if (expression.variables.some((name) => name !== variable)) {
      throw new RangeError(
        `Os limites desta região podem usar apenas a variável ${variable}.`,
      )
    }
    return (value: number): number => {
      const result = expression.evaluate({ [variable]: value })
      if (!Number.isFinite(result)) {
        throw new RangeError(
          `Um limite da região não é finito em ${variable}=${value}.`,
        )
      }
      return result
    }
  }
  const lower = compileBoundary(definition.lowerExpression)
  const upper = compileBoundary(definition.upperExpression)
  const boundsAt = (value: number): Interval => {
    const lowerValue = lower(value)
    const upperValue = upper(value)
    if (lowerValue > upperValue) {
      throw new RangeError(`Os limites internos se cruzam em ${variable}=${value}.`)
    }
    return [lowerValue, upperValue]
  }

  return definition.kind === 'typeI'
    ? createTypeIRegion(xBounds, boundsAt)
    : createTypeIIRegion(yBounds, boundsAt)
}

function assertBounds(bounds: Interval, name: string): void {
  if (
    !Number.isFinite(bounds[0]) ||
    !Number.isFinite(bounds[1]) ||
    bounds[0] >= bounds[1]
  ) {
    throw new RangeError(`${name} devem ser finitos e crescentes.`)
  }
}

/**
 * Builds a midpoint Riemann grid over a type-I/II region. In `center` mode a
 * whole cell is counted only when its center is inside; `precise` estimates
 * each cell's covered area from a deterministic subgrid.
 */
export function riemann2OverRegion(
  f: Integrand2D,
  xBounds: Interval,
  yBounds: Interval,
  region: IntegrationRegion,
  xSubdivisions: number,
  ySubdivisions: number,
  mode: RegionSamplingMode,
  samplesPerAxis = 8,
): RegionRiemannGrid {
  assertBounds(xBounds, 'Os limites de x')
  assertBounds(yBounds, 'Os limites de y')
  if (
    !Number.isSafeInteger(xSubdivisions) ||
    !Number.isSafeInteger(ySubdivisions) ||
    xSubdivisions < 1 ||
    ySubdivisions < 1 ||
    xSubdivisions * ySubdivisions > MAX_REGION_CELLS
  ) {
    throw new RangeError(
      `A malha da região deve ter de 1 a ${MAX_REGION_CELLS} células.`,
    )
  }
  if (mode !== 'center' && mode !== 'precise') {
    throw new RangeError('Modo de amostragem da região desconhecido.')
  }
  if (
    !Number.isSafeInteger(samplesPerAxis) ||
    samplesPerAxis < 1 ||
    samplesPerAxis > MAX_PRECISE_SAMPLES_PER_CELL
  ) {
    throw new RangeError(
      `A subamostragem deve ter de 1 a ${MAX_PRECISE_SAMPLES_PER_CELL} pontos por eixo.`,
    )
  }

  const cellCount = xSubdivisions * ySubdivisions
  const values = new Float64Array(cellCount)
  const sampleX = new Float64Array(cellCount)
  const sampleY = new Float64Array(cellCount)
  const cellFractions = new Float32Array(cellCount)
  const deltaX = (xBounds[1] - xBounds[0]) / xSubdivisions
  const deltaY = (yBounds[1] - yBounds[0]) / ySubdivisions
  const cellArea = deltaX * deltaY
  let total = 0
  let compensation = 0

  const sampleValue = (x: number, y: number): number => {
    const value = f(x, y)
    if (!Number.isFinite(value)) {
      throw new RangeError(`O integrando não é finito em (${x}, ${y}).`)
    }
    return value
  }

  for (let row = 0; row < xSubdivisions; row += 1) {
    const x0 = xBounds[0] + row * deltaX
    const x1 = x0 + deltaX
    for (let column = 0; column < ySubdivisions; column += 1) {
      const index = row * ySubdivisions + column
      const y0 = yBounds[0] + column * deltaY
      const y1 = y0 + deltaY
      let insideCount = 0
      let sum = 0
      let sumX = 0
      let sumY = 0

      if (mode === 'center') {
        const x = x0 / 2 + x1 / 2
        const y = y0 / 2 + y1 / 2
        if (region.contains(x, y)) {
          insideCount = 1
          sum = sampleValue(x, y)
          sumX = x
          sumY = y
        }
      } else {
        for (let sx = 0; sx < samplesPerAxis; sx += 1) {
          const x = x0 + ((sx + 0.5) / samplesPerAxis) * deltaX
          for (let sy = 0; sy < samplesPerAxis; sy += 1) {
            const y = y0 + ((sy + 0.5) / samplesPerAxis) * deltaY
            if (!region.contains(x, y)) continue
            insideCount += 1
            sum += sampleValue(x, y)
            sumX += x
            sumY += y
          }
        }
      }

      if (insideCount === 0) continue
      const fraction = mode === 'center' ? 1 : insideCount / samplesPerAxis ** 2
      const averageValue = sum / insideCount
      const meanX = sumX / insideCount
      const meanY = sumY / insideCount
      const contribution = cellArea * fraction * averageValue
      if (!Number.isFinite(contribution)) {
        throw new RangeError(
          'Uma contribuição da soma excede a faixa numérica suportada.',
        )
      }
      values[index] = averageValue
      sampleX[index] = meanX
      sampleY[index] = meanY
      cellFractions[index] = fraction

      const adjusted = contribution - compensation
      const next = total + adjusted
      compensation = next - total - adjusted
      total = next
    }
  }

  if (!Number.isFinite(total)) {
    throw new RangeError('O resultado da soma excede a faixa numérica suportada.')
  }
  return {
    value: total,
    xMin: xBounds[0],
    yMin: yBounds[0],
    deltaX,
    deltaY,
    xSubdivisions,
    ySubdivisions,
    values,
    sampleX,
    sampleY,
    cellFractions,
  }
}
