/** Maximum supported order; higher orders are unnecessary for current quadrature jobs. */
const MAX_GAUSS_ORDER = 256
const MAX_NEWTON_ITERATIONS = 100
const ROOT_TOLERANCE = 1e-15

export interface GaussLegendreRule {
  /** Nodes in ascending order on [-1, 1]; arrays are independent of the internal cache. */
  readonly nodes: Float64Array
  /** Positive weights associated with each node; arrays are independent of the internal cache. */
  readonly weights: Float64Array
}

type LegendreEvaluation = { value: number; derivative: number }

const ruleCache = new Map<number, GaussLegendreRule>()

function copyRule(rule: GaussLegendreRule): GaussLegendreRule {
  return Object.freeze({ nodes: rule.nodes.slice(), weights: rule.weights.slice() })
}

function evaluateLegendre(order: number, x: number): LegendreEvaluation {
  let previous = 1
  if (order === 0) return { value: previous, derivative: 0 }

  let current = x
  for (let degree = 2; degree <= order; degree += 1) {
    const next = ((2 * degree - 1) * x * current - (degree - 1) * previous) / degree
    previous = current
    current = next
  }

  const derivative = (order * (x * current - previous)) / (x * x - 1)
  return { value: current, derivative }
}

/**
 * Calculates the n-point Gauss–Legendre nodes and weights on [-1, 1].
 * The returned rule integrates every polynomial of degree at most 2n−1
 * exactly in exact arithmetic. Results are cached by order.
 */
export function gaussLegendre(order: number): GaussLegendreRule {
  if (!Number.isInteger(order) || order < 1 || order > MAX_GAUSS_ORDER) {
    throw new RangeError(
      `A ordem de Gauss–Legendre deve ser um inteiro de 1 a ${MAX_GAUSS_ORDER}.`,
    )
  }

  const cached = ruleCache.get(order)
  if (cached) return copyRule(cached)

  const nodes = new Float64Array(order)
  const weights = new Float64Array(order)
  const rootCount = Math.ceil(order / 2)

  for (let index = 0; index < rootCount; index += 1) {
    let root = Math.cos((Math.PI * (index + 0.75)) / (order + 0.5))
    if (order % 2 === 1 && index === (order - 1) / 2) root = 0

    let converged = false
    for (let iteration = 0; iteration < MAX_NEWTON_ITERATIONS; iteration += 1) {
      const { value, derivative } = evaluateLegendre(order, root)
      if (!Number.isFinite(derivative) || derivative === 0) {
        throw new Error(`Não foi possível calcular um nó para a ordem ${order}.`)
      }

      const correction = value / derivative
      root -= correction
      if (!Number.isFinite(root)) {
        throw new Error(`A busca por nós de Gauss–Legendre divergiu na ordem ${order}.`)
      }
      if (Math.abs(correction) <= ROOT_TOLERANCE) {
        converged = true
        break
      }
    }

    if (!converged) {
      throw new Error(
        `A busca por nós de Gauss–Legendre não convergiu na ordem ${order}.`,
      )
    }

    const { derivative } = evaluateLegendre(order, root)
    const weight = 2 / ((1 - root * root) * derivative * derivative)
    const opposite = order - index - 1

    nodes[index] = -root
    nodes[opposite] = root
    weights[index] = weight
    weights[opposite] = weight
  }

  const rule = Object.freeze({ nodes, weights })
  ruleCache.set(order, rule)
  return copyRule(rule)
}
