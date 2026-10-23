export type RiemannRule = 'left' | 'right' | 'midpoint' | 'lower' | 'upper' | 'random'

export type RiemannInterval = readonly [number, number]

export interface RiemannOptions {
  readonly rule: RiemannRule
  readonly xSubdivisions: number
  readonly ySubdivisions: number
  /** Optional reproducible source of values in [0, 1). Defaults to Math.random. */
  readonly random?: () => number
}

export interface RiemannRefinement {
  readonly coarseValue: number
  readonly refinedValue: number
  readonly estimatedAbsoluteError: number
  /** Null when the refined value is zero, so the relative estimate is undefined. */
  readonly estimatedRelativeError: number | null
}

const MAX_RIEMANN_CELLS = 1_000_000

function validateSubdivisionCount(count: number, name: string): void {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new RangeError(`${name} deve ser um inteiro positivo seguro.`)
  }
}

function validateInterval(interval: RiemannInterval, name: string): number {
  const [start, end] = interval
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new RangeError(`Os limites de ${name} devem ser números finitos.`)
  }

  const width = end - start
  if (!Number.isFinite(width)) {
    throw new RangeError(`A largura de ${name} excede a faixa numérica suportada.`)
  }
  return width
}

/**
 * Approximates a double integral over an axis-aligned rectangle with a
 * rectangular Riemann sum. `lower` and `upper` use the minimum/maximum of the
 * four sampled signed cell contributions; they are estimates, not certified
 * extrema. Reversed bounds preserve signed-integral orientation.
 */
export function riemann2Rectangular(
  f: (x: number, y: number) => number,
  xBounds: RiemannInterval,
  yBounds: RiemannInterval,
  options: RiemannOptions,
): number {
  const { rule, xSubdivisions, ySubdivisions } = options
  validateSubdivisionCount(xSubdivisions, 'xSubdivisions')
  validateSubdivisionCount(ySubdivisions, 'ySubdivisions')
  if (xSubdivisions * ySubdivisions > MAX_RIEMANN_CELLS) {
    throw new RangeError(`A malha excede o limite de ${MAX_RIEMANN_CELLS} células.`)
  }
  if (!['left', 'right', 'midpoint', 'lower', 'upper', 'random'].includes(rule)) {
    throw new RangeError('Regra de Riemann desconhecida.')
  }
  if (
    rule === 'random' &&
    options.random !== undefined &&
    typeof options.random !== 'function'
  ) {
    throw new RangeError('O gerador aleatório deve ser uma função.')
  }

  const [xStart] = xBounds
  const [yStart] = yBounds
  const xWidth = validateInterval(xBounds, 'x')
  const yWidth = validateInterval(yBounds, 'y')
  if (xWidth === 0 || yWidth === 0) return 0

  const cellWidth = xWidth / xSubdivisions
  const cellHeight = yWidth / ySubdivisions
  const cellArea = cellWidth * cellHeight
  if (!Number.isFinite(cellArea)) {
    throw new RangeError('A área de cada célula excede a faixa numérica suportada.')
  }

  const random = options.random ?? Math.random
  let sum = 0
  let compensation = 0

  const sample = (x: number, y: number): number => {
    const value = f(x, y)
    if (!Number.isFinite(value)) {
      throw new RangeError(`O integrando não é finito em (${x}, ${y}).`)
    }
    return value
  }

  for (let i = 0; i < xSubdivisions; i += 1) {
    const x0 = xStart + xWidth * (i / xSubdivisions)
    const x1 = xStart + xWidth * ((i + 1) / xSubdivisions)
    for (let j = 0; j < ySubdivisions; j += 1) {
      const y0 = yStart + yWidth * (j / ySubdivisions)
      const y1 = yStart + yWidth * ((j + 1) / ySubdivisions)
      let value: number
      let term: number | undefined

      switch (rule) {
        case 'left':
          value = sample(x0, y0)
          break
        case 'right':
          value = sample(x1, y1)
          break
        case 'midpoint':
          value = sample(x0 / 2 + x1 / 2, y0 / 2 + y1 / 2)
          break
        case 'lower':
        case 'upper': {
          const contributions = [
            sample(x0, y0) * cellArea,
            sample(x0, y1) * cellArea,
            sample(x1, y0) * cellArea,
            sample(x1, y1) * cellArea,
          ]
          if (!contributions.every(Number.isFinite)) {
            throw new RangeError(
              'Uma contribuição amostrada excede a faixa numérica suportada.',
            )
          }
          const selectedContribution =
            rule === 'lower' ? Math.min(...contributions) : Math.max(...contributions)
          term = selectedContribution
          value = 0
          break
        }
        case 'random': {
          const xRandom = random()
          const yRandom = random()
          if (
            !Number.isFinite(xRandom) ||
            !Number.isFinite(yRandom) ||
            xRandom < 0 ||
            xRandom >= 1 ||
            yRandom < 0 ||
            yRandom >= 1
          ) {
            throw new RangeError('O gerador aleatório deve retornar valores em [0, 1).')
          }
          const x = xStart + xWidth * ((i + xRandom) / xSubdivisions)
          const y = yStart + yWidth * ((j + yRandom) / ySubdivisions)
          value = sample(x, y)
          break
        }
      }

      term ??= value * cellArea
      if (!Number.isFinite(term)) {
        throw new RangeError(
          'Uma contribuição da soma excede a faixa numérica suportada.',
        )
      }

      const adjusted = term - compensation
      const next = sum + adjusted
      compensation = next - sum - adjusted
      sum = next
    }
  }

  if (!Number.isFinite(sum)) {
    throw new RangeError('O resultado da soma excede a faixa numérica suportada.')
  }
  return sum
}

/**
 * Compares a rectangular Riemann sum with the same rule at twice the
 * subdivisions in each direction. The returned error is a refinement-based
 * estimate, not a certified bound; stochastic sums also include sampling noise.
 */
export function compareRiemannRefinement(
  f: (x: number, y: number) => number,
  xBounds: RiemannInterval,
  yBounds: RiemannInterval,
  options: RiemannOptions,
): RiemannRefinement {
  if (
    options.xSubdivisions > Number.MAX_SAFE_INTEGER / 2 ||
    options.ySubdivisions > Number.MAX_SAFE_INTEGER / 2
  ) {
    throw new RangeError('A subdivisão refinada excederia a faixa de inteiros seguros.')
  }

  const coarseValue = riemann2Rectangular(f, xBounds, yBounds, options)
  const refinedValue = riemann2Rectangular(f, xBounds, yBounds, {
    ...options,
    xSubdivisions: options.xSubdivisions * 2,
    ySubdivisions: options.ySubdivisions * 2,
  })
  const difference = Math.abs(refinedValue - coarseValue)
  const order = options.rule === 'midpoint' ? 2 : 1
  const estimatedAbsoluteError = difference / (2 ** order - 1)

  return {
    coarseValue,
    refinedValue,
    estimatedAbsoluteError,
    estimatedRelativeError:
      refinedValue === 0 ? null : estimatedAbsoluteError / Math.abs(refinedValue),
  }
}
