import { compileExpression } from '../core/expr/codegen'
import type { VisualizableFunction } from '../core/functions/types'
import {
  changeRegionOrder,
  type RegionExpressionDefinition,
  type RegionOrderConversionResult,
  type SampledRegionBounds,
} from '../core/regions/riemannRegion'
import { parseDomainBound } from './domainBound'

export type IntegralRegionKind =
  'rectangle' | 'typeI' | 'typeII' | 'polar' | 'inequality'

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
  readonly rMin: string
  readonly rMax: string
  readonly thetaMin: string
  readonly thetaMax: string
  readonly inequalityExpression: string
  readonly sampledBounds?: SampledRegionBounds
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

  if (draft.kind === 'polar') {
    const rMin = parseDomainBound(draft.rMin)
    const rMax = parseDomainBound(draft.rMax)
    const thetaMin = parseDomainBound(draft.thetaMin)
    const thetaMax = parseDomainBound(draft.thetaMax)
    if (rMin < 0 || rMin >= rMax) {
      throw new RangeError(
        'Os limites radiais devem satisfazer 0 ≤ r mínimo < r máximo.',
      )
    }
    if (thetaMin >= thetaMax || thetaMax - thetaMin > 2 * Math.PI) {
      throw new RangeError('Os limites angulares devem crescer e cobrir no máximo 2π.')
    }
    return {
      expression: draft.expression.trim(),
      domain: {
        x: { min: -rMax, max: rMax },
        y: { min: -rMax, max: rMax },
      },
      region: {
        kind: 'polar',
        lowerExpression: draft.rMin,
        upperExpression: draft.rMax,
        radiusBounds: [rMin, rMax],
        thetaBounds: [thetaMin, thetaMax],
        samplingMode: draft.samplingMode,
      },
    }
  }

  if (draft.kind === 'inequality') {
    const expression = compileExpression(draft.inequalityExpression)
    if (expression.variables.some((name) => name !== 'x' && name !== 'y')) {
      throw new RangeError('A desigualdade pode depender somente de x e y.')
    }
    for (let ix = 0; ix <= 32; ix += 1) {
      const x = xMin + ((xMax - xMin) * ix) / 32
      for (let iy = 0; iy <= 32; iy += 1) {
        const y = yMin + ((yMax - yMin) * iy) / 32
        if (!Number.isFinite(expression.evaluate({ x, y }))) {
          throw new RangeError(`A desigualdade não é finita em (${x}, ${y}).`)
        }
      }
    }
    return {
      expression: draft.expression.trim(),
      domain: { x: { min: xMin, max: xMax }, y: { min: yMin, max: yMax } },
      region: {
        kind: 'inequality',
        lowerExpression: '0',
        upperExpression: '0',
        inequalityExpression: expression.source,
        samplingMode: draft.samplingMode,
      },
    }
  }

  if (draft.sampledBounds) {
    if (draft.kind !== 'typeI' && draft.kind !== 'typeII') {
      throw new RangeError('Limites interpolados só podem ser usados em tipo I ou II.')
    }
    const expectedOuter = draft.kind === 'typeI' ? [xMin, xMax] : [yMin, yMax]
    if (
      draft.sampledBounds.outerBounds[0] !== expectedOuter[0] ||
      draft.sampledBounds.outerBounds[1] !== expectedOuter[1]
    ) {
      throw new RangeError(
        'A janela externa mudou após a conversão; refaça a conversão da ordem.',
      )
    }
    return {
      expression: draft.expression.trim(),
      domain: { x: { min: xMin, max: xMax }, y: { min: yMin, max: yMax } },
      region: {
        kind: draft.kind,
        lowerExpression: draft.lowerExpression,
        upperExpression: draft.upperExpression,
        samplingMode: draft.samplingMode,
        sampledBounds: draft.sampledBounds,
      },
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

export interface ChangedIntegralOrder {
  readonly draft: IntegralCalculatorDraft
  readonly validation: RegionOrderConversionResult
}

export function changeIntegralCalculatorOrder(
  draft: IntegralCalculatorDraft,
): ChangedIntegralOrder {
  const prepared = prepareIntegralCalculatorDraft(draft)
  if (
    !prepared.region ||
    (prepared.region.kind !== 'typeI' && prepared.region.kind !== 'typeII')
  ) {
    throw new RangeError('A mudança de ordem exige uma região tipo I ou tipo II.')
  }
  const integrand = compileExpression(prepared.expression)
  const parameters = Object.fromEntries(
    integrand.variables
      .filter((name) => name !== 'x' && name !== 'y')
      .map((name) => [name, 1]),
  )
  const validation = changeRegionOrder(
    prepared.region,
    [prepared.domain.x.min, prepared.domain.x.max],
    [prepared.domain.y.min, prepared.domain.y.max],
    (x, y) => integrand.evaluate({ ...parameters, x, y }),
  )
  if (!validation.region.sampledBounds) {
    throw new RangeError('A conversão não produziu limites interpolados utilizáveis.')
  }
  const nextDraft: IntegralCalculatorDraft = {
    ...draft,
    kind: validation.region.kind,
    sampledBounds: validation.region.sampledBounds,
    lowerExpression: validation.region.lowerExpression,
    upperExpression: validation.region.upperExpression,
  }
  return { draft: nextDraft, validation }
}
