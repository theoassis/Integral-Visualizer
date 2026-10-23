import { describe, expect, it } from 'vitest'
import {
  getAnimatedParameterValue,
  PARAMETER_ANIMATION_CYCLE_MS,
  PARAMETER_SLIDER_MAX,
  PARAMETER_SLIDER_MIN,
  PARAMETER_SLIDER_STEP,
} from './parameterAnimation'

describe('parameter animation', () => {
  it('starts at the selected parameter value without a jump', () => {
    expect(getAnimatedParameterValue(1.25, 0, 1)).toBeCloseTo(1.25)
  })

  it('stays inside the slider interval throughout the cycle', () => {
    const values = Array.from({ length: 65 }, (_, index) =>
      getAnimatedParameterValue(0.5, (PARAMETER_ANIMATION_CYCLE_MS * index) / 64, 1),
    )

    expect(Math.min(...values)).toBeGreaterThanOrEqual(PARAMETER_SLIDER_MIN)
    expect(Math.max(...values)).toBeLessThanOrEqual(PARAMETER_SLIDER_MAX)
    expect(Math.max(...values)).toBeCloseTo(PARAMETER_SLIDER_MAX)
    expect(Math.min(...values)).toBeCloseTo(PARAMETER_SLIDER_MIN)
  })

  it('completes one periodic cycle at the configured duration', () => {
    const start = getAnimatedParameterValue(-1, 0, 1.5)
    const end = getAnimatedParameterValue(-1, PARAMETER_ANIMATION_CYCLE_MS / 1.5, 1.5)

    expect(end).toBeCloseTo(start)
  })

  it('keeps animated values aligned with the slider step', () => {
    const value = getAnimatedParameterValue(0.5, 1234, 1)
    const sliderStepIndex = (value - PARAMETER_SLIDER_MIN) / PARAMETER_SLIDER_STEP

    expect(sliderStepIndex).toBeCloseTo(Math.round(sliderStepIndex))
  })

  it('rejects invalid speed and parameter bounds', () => {
    expect(() => getAnimatedParameterValue(0, 0, 0)).toThrow(RangeError)
    expect(() => getAnimatedParameterValue(0, 0, 1, 2, 2)).toThrow(RangeError)
    expect(() => getAnimatedParameterValue(4, 0, 1)).toThrow(RangeError)
  })
})
