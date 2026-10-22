import { ExpressionError, compileExpression } from '../expr/codegen'
import type { VisualizableFunction } from './types'

const DOMAIN = {
  x: { min: -Math.PI, max: Math.PI },
  y: { min: -Math.PI, max: Math.PI },
}
const RANGE_SEGMENTS = 64

function isRenderableHeight(value: number): boolean {
  return Number.isFinite(value) && Number.isFinite(Math.fround(value))
}

function sampleRange(evaluate: (x: number, y: number) => number): {
  min: number
  max: number
} {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (let i = 0; i <= RANGE_SEGMENTS; i += 1) {
    const x = DOMAIN.x.min + ((DOMAIN.x.max - DOMAIN.x.min) * i) / RANGE_SEGMENTS
    for (let j = 0; j <= RANGE_SEGMENTS; j += 1) {
      const y = DOMAIN.y.min + ((DOMAIN.y.max - DOMAIN.y.min) * j) / RANGE_SEGMENTS
      const value = evaluate(x, y)
      if (!isRenderableHeight(value)) continue
      min = Math.min(min, value)
      max = Math.max(max, value)
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: -1, max: 1 }
  }

  const span = max - min
  const padding = span === 0 ? Math.max(Math.abs(min) * 0.08, 0.5) : span * 0.04
  return { min: min - padding, max: max + padding }
}

/** Creates a renderable surface definition from a parsed, whitelist-checked formula. */
export function createExpressionFunction(
  source: string,
  parameterValues: Readonly<Record<string, number>> = {},
): VisualizableFunction {
  const expression = compileExpression(source)
  const freeParameters = expression.variables.filter(
    (name) => name !== 'x' && name !== 'y',
  )
  for (const name of freeParameters) {
    const value = parameterValues[name] ?? 1
    if (!Number.isFinite(value)) {
      throw new ExpressionError(
        'invalid-variable-value',
        `O parâmetro "${name}" precisa ter um valor real e finito.`,
      )
    }
  }

  const evaluate = (x: number, y: number) => {
    const variables: Record<string, number> = { x, y }
    for (const name of freeParameters) variables[name] = parameterValues[name] ?? 1
    return expression.evaluate(variables)
  }

  return {
    id: `expression:${expression.source}`,
    name: 'Função personalizada',
    formula: `z = ${expression.source}`,
    formulaPlain: `z = ${expression.source}`,
    domain: {
      x: { ...DOMAIN.x },
      y: { ...DOMAIN.y },
    },
    domainLabel: '−π ≤ x, y ≤ π',
    range: sampleRange(evaluate),
    evaluate,
    criticalPoints: [],
    analysis: [],
  }
}

/** Returns free one-letter parameters in the order used by the parsed expression. */
export function getExpressionParameters(source: string): string[] {
  return compileExpression(source).variables.filter(
    (name) => name !== 'x' && name !== 'y',
  )
}
