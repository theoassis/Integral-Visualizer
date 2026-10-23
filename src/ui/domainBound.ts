import { compileExpression } from '../core/expr/codegen'

const MAX_DOMAIN_BOUND = 10_000

/** Evaluates a safe numeric expression such as `-pi`, `pi/2`, or `2*pi`. */
export function parseDomainBound(source: string): number {
  const expression = compileExpression(source)
  if (expression.variables.length > 0) {
    throw new Error(
      'Os limites do domínio podem usar números e constantes, sem variáveis.',
    )
  }

  const value = expression.evaluate()
  if (!Number.isFinite(value)) {
    throw new Error('O limite precisa resultar em um número real e finito.')
  }
  if (Math.abs(value) > MAX_DOMAIN_BOUND) {
    throw new Error(
      `Cada limite precisa estar entre −${MAX_DOMAIN_BOUND} e ${MAX_DOMAIN_BOUND}.`,
    )
  }
  return value
}
