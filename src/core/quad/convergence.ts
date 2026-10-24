export interface ConvergencePoint {
  readonly subdivisions: number
  readonly error: number
}

/** Estimates the order p in error(n) ≈ C n⁻ᵖ by least squares in log space. */
export function estimateObservedOrder(
  points: readonly ConvergencePoint[],
): number | null {
  for (const point of points) {
    if (
      !Number.isSafeInteger(point.subdivisions) ||
      point.subdivisions <= 0 ||
      !Number.isFinite(point.error) ||
      point.error < 0
    ) {
      throw new RangeError('Os pontos de convergência precisam ser finitos e válidos.')
    }
  }

  const usable = points.filter((point) => point.error > 0)
  if (usable.length < 2) return null

  const logN = usable.map(({ subdivisions }) => Math.log(subdivisions))
  const logError = usable.map(({ error }) => Math.log(error))
  const meanLogN = logN.reduce((sum, value) => sum + value, 0) / usable.length
  const meanLogError = logError.reduce((sum, value) => sum + value, 0) / usable.length
  let covariance = 0
  let variance = 0
  for (let index = 0; index < usable.length; index += 1) {
    const dx = logN[index]! - meanLogN
    covariance += dx * (logError[index]! - meanLogError)
    variance += dx * dx
  }

  return variance === 0 ? null : -covariance / variance
}
