import { compileExpression } from '../core/expr/codegen'
import type { VisualizableFunction } from '../core/functions/types'
import type { RegionExpressionDefinition } from '../core/regions/riemannRegion'
import { parseDomainBound } from './domainBound'

export type IntegralRegionKind = 'rectangle' | 'typeI' | 'typeII'

export interface IntegralCalculatorDraft {
  readonly expression: string
  readonly kind: IntegralRegionKind
  readonly xMin: string
  readonly xMax: string
  readonly yMin: string
  readonly yMax: string
  readonly lowerExpression: string
  readonly upperExpression: string
  readonly samplingMode: 'center' | 'precise'
}

export interface PreparedIntegral {
  readonly expression: string
  readonly domain: VisualizableFunction['domain']
  readonly region: RegionExpressionDefinition | null
}

export function prepareIntegralCalculatorDraft(
  draft: IntegralCalculatorDraft,
): PreparedIntegral {
  compileExpression(draft.expression)
  const xMin = parseDomainBound(draft.xMin)
  const xMax = parseDomainBound(draft.xMax)
  const yMin = parseDomainBound(draft.yMin)
  const yMax = parseDomainBound(draft.yMax)
  if (xMin >= xMax || yMin >= yMax) {
    throw new RangeError('Os limites externos devem estar em ordem crescente.')
  }

  if (draft.kind === 'rectangle') {
    return {
      expression: draft.expression.trim(),
      domain: { x: { min: xMin, max: xMax }, y: { min: yMin, max: yMax } },
      region: null,
    }
  }

  const outerVariable = draft.kind === 'typeI' ? 'x' : 'y'
  const innerAxis = draft.kind === 'typeI' ? 'y' : 'x'
  const lower = compileExpression(draft.lowerExpression)
  const upper = compileExpression(draft.upperExpression)
  if (
    lower.variables.some((name) => name !== outerVariable) ||
    upper.variables.some((name) => name !== outerVariable)
  ) {
    throw new RangeError(
      `Os limites internos podem depender somente de ${outerVariable}.`,
    )
  }

  const outerBounds = draft.kind === 'typeI' ? [xMin, xMax] : [yMin, yMax]
  const innerEnvelope = draft.kind === 'typeI' ? [yMin, yMax] : [xMin, xMax]
  for (let index = 0; index <= 128; index += 1) {
    const outer = outerBounds[0]! + ((outerBounds[1]! - outerBounds[0]!) * index) / 128
    const scope = { [outerVariable]: outer }
    const lowerValue = lower.evaluate(scope)
    const upperValue = upper.evaluate(scope)
    if (!Number.isFinite(lowerValue) || !Number.isFinite(upperValue)) {
      throw new RangeError(
        `Um limite interno não é finito em ${outerVariable}=${outer}.`,
      )
    }
    if (lowerValue > upperValue) {
      throw new RangeError(
        `Os limites internos se cruzam em ${outerVariable}=${outer}.`,
      )
    }
    if (lowerValue < innerEnvelope[0]! || upperValue > innerEnvelope[1]!) {
      throw new RangeError(
        `Os limites de ${innerAxis} precisam ficar dentro da janela gráfica configurada.`,
      )
    }
  }

  return {
    expression: draft.expression.trim(),
    domain: { x: { min: xMin, max: xMax }, y: { min: yMin, max: yMax } },
    region: {
      kind: draft.kind,
      lowerExpression: lower.source,
      upperExpression: upper.source,
      samplingMode: draft.samplingMode,
    },
  }
}
