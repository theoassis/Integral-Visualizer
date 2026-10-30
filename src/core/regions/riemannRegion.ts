import type { Integrand2D, Interval } from '../quad/iterated'
import { compileExpression } from '../expr/codegen'
import {
  createInequalityRegion,
  createPolarRegion,
  createTypeIRegion,
  createTypeIIRegion,
} from './regions'
import type {
  InequalityRegion,
  PolarRegion,
  TypeIRegion,
  TypeIIRegion,
} from './regions'
import { integral2TypeI, integral2TypeII } from './regions'

export type RegionSamplingMode = 'center' | 'precise'
export interface SampledRegionBounds {
  readonly outerBounds: Interval
  readonly lowerValues: readonly number[]
  readonly upperValues: readonly number[]
}
export type IntegrationRegion =
  TypeIRegion | TypeIIRegion | PolarRegion | InequalityRegion

export interface RegionExpressionDefinition {
  readonly kind: 'typeI' | 'typeII' | 'polar' | 'inequality'
  readonly lowerExpression: string
  readonly upperExpression: string
  readonly samplingMode: RegionSamplingMode
  readonly radiusBounds?: Interval
  readonly thetaBounds?: Interval
  readonly inequalityExpression?: string
  readonly sampledBounds?: SampledRegionBounds
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
  if (definition.kind === 'inequality') {
    if (!definition.inequalityExpression) {
      throw new RangeError('Informe a expressão da desigualdade g(x,y) ≤ 0.')
    }
    const expression = compileExpression(definition.inequalityExpression)
    if (expression.variables.some((name) => name !== 'x' && name !== 'y')) {
      throw new RangeError('A desigualdade pode depender somente de x e y.')
    }
    return createInequalityRegion(xBounds, yBounds, (x, y) =>
      expression.evaluate({ x, y }),
    )
  }
  if (definition.kind === 'polar') {
    if (!definition.radiusBounds || !definition.thetaBounds) {
      throw new RangeError('A região polar precisa dos limites de r e θ.')
    }
    return createPolarRegion(definition.radiusBounds, definition.thetaBounds)
  }
  if (definition.sampledBounds) {
    if (definition.kind !== 'typeI' && definition.kind !== 'typeII') {
      throw new RangeError('Limites interpolados só são válidos em regiões tipo I/II.')
    }
    const { outerBounds, lowerValues, upperValues } = definition.sampledBounds
    const expectedOuterBounds = definition.kind === 'typeI' ? xBounds : yBounds
    const innerEnvelope = definition.kind === 'typeI' ? yBounds : xBounds
    if (
      outerBounds[0] >= outerBounds[1] ||
      lowerValues.length < 2 ||
      lowerValues.length > 4097 ||
      lowerValues.length !== upperValues.length
    ) {
      throw new RangeError('A tabela de fronteiras interpoladas é inválida.')
    }
    if (
      outerBounds[0] !== expectedOuterBounds[0] ||
      outerBounds[1] !== expectedOuterBounds[1]
    ) {
      throw new RangeError(
        'Os limites interpolados não correspondem ao domínio externo atual.',
      )
    }
    if (
      [...lowerValues, ...upperValues].some((value) => !Number.isFinite(value)) ||
      lowerValues.some(
        (value, index) =>
          value > upperValues[index]! ||
          value < innerEnvelope[0] ||
          upperValues[index]! > innerEnvelope[1],
      )
    ) {
      throw new RangeError(
        'A tabela de fronteiras interpoladas não forma uma região válida.',
      )
    }
    const boundsAt = (outer: number): Interval => {
      const position =
        ((outer - outerBounds[0]) / (outerBounds[1] - outerBounds[0])) *
        (lowerValues.length - 1)
      const index = Math.min(Math.max(Math.floor(position), 0), lowerValues.length - 2)
      const fraction = Math.min(Math.max(position - index, 0), 1)
      const lower =
        lowerValues[index]! * (1 - fraction) + lowerValues[index + 1]! * fraction
      const upper =
        upperValues[index]! * (1 - fraction) + upperValues[index + 1]! * fraction
      if (lower > upper) {
        throw new RangeError(`Fronteiras interpoladas se cruzam em ${outer}.`)
      }
      return [lower, upper]
    }
    return definition.kind === 'typeI'
      ? createTypeIRegion(outerBounds, boundsAt)
      : createTypeIIRegion(outerBounds, boundsAt)
  }
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

export interface RegionOrderConversionResult {
  readonly region: RegionExpressionDefinition
  readonly sourceValue: number
  readonly convertedValue: number
  readonly absoluteDifference: number
  readonly relativeDifference: number | null
  readonly sourceArea: number
  readonly convertedArea: number
  readonly areaDifference: number
  readonly samplesPerBoundary: number
}

/** Convert a connected, single-interval region by scanning slices and bisecting its boundary. */
export function changeRegionOrder(
  definition: RegionExpressionDefinition,
  xBounds: Interval,
  yBounds: Interval,
  f: Integrand2D,
  slices = 256,
  scanSlices = 512,
): RegionOrderConversionResult {
  if (definition.kind !== 'typeI' && definition.kind !== 'typeII') {
    throw new RangeError(
      'A mudança de ordem automática está disponível para regiões tipo I/II.',
    )
  }
  if (
    !Number.isSafeInteger(slices) ||
    slices < 16 ||
    slices > 1024 ||
    !Number.isSafeInteger(scanSlices) ||
    scanSlices < 32 ||
    scanSlices > 2048
  ) {
    throw new RangeError('Resolução de conversão fora dos limites suportados.')
  }
  const source = createRegionFromExpressions(definition, xBounds, yBounds)
  if (source.kind !== 'typeI' && source.kind !== 'typeII') {
    throw new RangeError('A conversão requer uma região tipo I ou tipo II válida.')
  }
  const toTypeI = definition.kind === 'typeII'
  const outerBounds = toTypeI ? xBounds : yBounds
  const innerBounds = toTypeI ? yBounds : xBounds
  const lowerValues: number[] = []
  const upperValues: number[] = []
  const innerStep = (innerBounds[1] - innerBounds[0]) / scanSlices
  const interpolateCrossing = (
    outer: number,
    outside: number,
    inside: number,
  ): number => {
    let lo = outside
    let hi = inside
    const targetState = true
    for (let iteration = 0; iteration < 48; iteration += 1) {
      const middle = lo / 2 + hi / 2
      const x = toTypeI ? outer : middle
      const y = toTypeI ? middle : outer
      if (source.contains(x, y) === targetState) hi = middle
      else lo = middle
    }
    return lo / 2 + hi / 2
  }

  for (let index = 0; index <= slices; index += 1) {
    const outer = outerBounds[0] + ((outerBounds[1] - outerBounds[0]) * index) / slices
    const insideSamples: number[] = []
    for (let innerIndex = 0; innerIndex <= scanSlices; innerIndex += 1) {
      const inner = innerBounds[0] + innerIndex * innerStep
      const x = toTypeI ? outer : inner
      const y = toTypeI ? inner : outer
      if (source.contains(x, y)) insideSamples.push(innerIndex)
    }
    if (insideSamples.length === 0) {
      throw new RangeError(
        `A conversão encontrou uma fatia vazia em ${toTypeI ? 'x' : 'y'}=${outer}; não há uma descrição segura por um único intervalo.`,
      )
    }
    const first = insideSamples[0]!
    const last = insideSamples.at(-1)!
    if (
      insideSamples.some(
        (sample, sampleIndex) =>
          sampleIndex > 0 && sample !== insideSamples[sampleIndex - 1]! + 1,
      )
    ) {
      throw new RangeError(
        `A conversão encontrou intervalos desconexos em ${toTypeI ? 'x' : 'y'}=${outer}; a região não pode ser expressa com um único par de limites.`,
      )
    }
    const lower =
      first === 0
        ? innerBounds[0]
        : interpolateCrossing(
            outer,
            innerBounds[0] + (first - 1) * innerStep,
            innerBounds[0] + first * innerStep,
          )
    const upper =
      last === scanSlices
        ? innerBounds[1]
        : interpolateCrossing(
            outer,
            innerBounds[0] + (last + 1) * innerStep,
            innerBounds[0] + last * innerStep,
          )
    lowerValues.push(lower)
    upperValues.push(upper)
  }

  const convertedKind = toTypeI ? 'typeI' : 'typeII'
  const converted: RegionExpressionDefinition = {
    kind: convertedKind,
    lowerExpression: 'limite inferior interpolado',
    upperExpression: 'limite superior interpolado',
    samplingMode: definition.samplingMode,
    sampledBounds: { outerBounds, lowerValues, upperValues },
  }
  const convertedRegion = createRegionFromExpressions(converted, xBounds, yBounds)
  if (convertedRegion.kind !== 'typeI' && convertedRegion.kind !== 'typeII') {
    throw new RangeError('A conversão não gerou uma região tipo I/II válida.')
  }
  const integrateRegion = (
    integrand: Integrand2D,
    target: TypeIRegion | TypeIIRegion,
  ) =>
    target.kind === 'typeI'
      ? integral2TypeI(integrand, target, 64)
      : integral2TypeII(integrand, target, 64)
  const sourceValue = integrateRegion(f, source)
  const convertedValue = integrateRegion(f, convertedRegion)
  const sourceArea = integrateRegion(() => 1, source)
  const convertedArea = integrateRegion(() => 1, convertedRegion)
  const absoluteDifference = Math.abs(convertedValue - sourceValue)
  const areaDifference = Math.abs(convertedArea - sourceArea)
  const relativeDifference =
    Math.abs(sourceValue) <= 64 * Number.EPSILON
      ? null
      : absoluteDifference / Math.abs(sourceValue)
  if (
    absoluteDifference > 1e-3 * Math.max(1, Math.abs(sourceValue)) ||
    areaDifference > 1e-3 * Math.max(1, Math.abs(sourceArea))
  ) {
    throw new RangeError(
      `A validação numérica não convergiu: integral ${sourceValue}→${convertedValue} (diferença ${absoluteDifference}); área ${sourceArea}→${convertedArea} (diferença ${areaDifference}). A ordem não foi alterada.`,
    )
  }
  return {
    region: converted,
    sourceValue,
    convertedValue,
    absoluteDifference,
    relativeDifference,
    sourceArea,
    convertedArea,
    areaDifference,
    samplesPerBoundary: slices + 1,
  }
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
