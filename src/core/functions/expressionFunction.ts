import { ExpressionError, compileExpression } from '../expr/codegen'
import { MAX_SURFACE_HEIGHT } from './constants'
import type { VisualizableFunction } from './types'

const DOMAIN = {
  x: { min: -Math.PI, max: Math.PI },
  y: { min: -Math.PI, max: Math.PI },
}
const RANGE_SEGMENTS = 64
const MAX_DOMAIN_BOUND = 10_000

function isRenderableHeight(value: number): boolean {
  return (
    Number.isFinite(value) &&
    Math.abs(value) <= MAX_SURFACE_HEIGHT &&
    Number.isFinite(Math.fround(value))
  )
}

function sampleRange(
  evaluate: (x: number, y: number) => number,
  domain: VisualizableFunction['domain'],
): {
  min: number
  max: number
} {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (let i = 0; i <= RANGE_SEGMENTS; i += 1) {
    const x = domain.x.min + ((domain.x.max - domain.x.min) * i) / RANGE_SEGMENTS
    for (let j = 0; j <= RANGE_SEGMENTS; j += 1) {
      const y = domain.y.min + ((domain.y.max - domain.y.min) * j) / RANGE_SEGMENTS
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

function validateDomain(domain: VisualizableFunction['domain']): void {
  for (const axis of ['x', 'y'] as const) {
    const { min, max } = domain[axis]
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new ExpressionError(
        'invalid-variable-value',
        'Os limites do domínio precisam ser números reais e finitos.',
      )
    }
    if (min >= max) {
      throw new ExpressionError(
        'invalid-variable-value',
        'O limite inferior de cada variável precisa ser menor que o limite superior.',
      )
    }
    if (Math.max(Math.abs(min), Math.abs(max)) > MAX_DOMAIN_BOUND) {
      throw new ExpressionError(
        'invalid-variable-value',
        `Cada limite precisa estar entre −${MAX_DOMAIN_BOUND} e ${MAX_DOMAIN_BOUND}.`,
      )
    }
  }
}

function formatDomainBound(value: number): string {
  if (Math.abs(value - Math.PI) < 1e-12) return 'π'
  if (Math.abs(value + Math.PI) < 1e-12) return '−π'
  if (Math.abs(value) < 1e-12) return '0'
  return Number(value.toPrecision(6)).toString().replace('-', '−')
}

function describeDomain(domain: VisualizableFunction['domain']): string {
  if (
    domain.x.min === -Math.PI &&
    domain.x.max === Math.PI &&
    domain.y.min === -Math.PI &&
    domain.y.max === Math.PI
  )
    return '−π ≤ x, y ≤ π'

  return `${formatDomainBound(domain.x.min)} ≤ x ≤ ${formatDomainBound(domain.x.max)}; ${formatDomainBound(domain.y.min)} ≤ y ≤ ${formatDomainBound(domain.y.max)}`
}

/** Creates a renderable surface definition from a parsed, whitelist-checked formula. */
export function createExpressionFunction(
  source: string,
  parameterValues: Readonly<Record<string, number>> = {},
  domain: VisualizableFunction['domain'] = DOMAIN,
): VisualizableFunction {
  validateDomain(domain)
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
      x: { ...domain.x },
      y: { ...domain.y },
    },
    domainLabel: describeDomain(domain),
    range: sampleRange(evaluate, domain),
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
