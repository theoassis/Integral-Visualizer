export const PARAMETER_SLIDER_MIN = -3
export const PARAMETER_SLIDER_MAX = 3
export const PARAMETER_SLIDER_STEP = 0.05
export const PARAMETER_ANIMATION_CYCLE_MS = 8_000

/** Smoothly oscillates a free parameter while preserving its starting value at t = 0. */
export function getAnimatedParameterValue(
  startingValue: number,
  elapsedMs: number,
  speed: number,
  min = PARAMETER_SLIDER_MIN,
  max = PARAMETER_SLIDER_MAX,
): number {
  if (
    !Number.isFinite(startingValue) ||
    !Number.isFinite(elapsedMs) ||
    !Number.isFinite(speed) ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min >= max ||
    speed <= 0 ||
    startingValue < min ||
    startingValue > max
  ) {
    throw new RangeError('Os limites e a velocidade da animação precisam ser válidos.')
  }

  const midpoint = (min + max) / 2
  const amplitude = (max - min) / 2
  const normalizedStart = Math.max(
    -1,
    Math.min(1, (startingValue - midpoint) / amplitude),
  )
  const initialPhase = Math.asin(normalizedStart)
  const phase =
    initialPhase + (2 * Math.PI * elapsedMs * speed) / PARAMETER_ANIMATION_CYCLE_MS
  const value = midpoint + amplitude * Math.sin(phase)
  const steppedValue =
    min + Math.round((value - min) / PARAMETER_SLIDER_STEP) * PARAMETER_SLIDER_STEP
  return Math.max(min, Math.min(max, Number(steppedValue.toFixed(10))))
}
