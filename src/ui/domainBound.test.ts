import { describe, expect, it } from 'vitest'
import { parseDomainBound } from './domainBound'

describe('parseDomainBound', () => {
  it('accepts pi, e, and arithmetic combinations of constants', () => {
    expect(parseDomainBound('-pi')).toBe(-Math.PI)
    expect(parseDomainBound('pi/2')).toBe(Math.PI / 2)
    expect(parseDomainBound('2*pi')).toBe(2 * Math.PI)
    expect(parseDomainBound('e+1')).toBeCloseTo(Math.E + 1)
  })

  it('rejects variables and non-finite or out-of-range values', () => {
    expect(() => parseDomainBound('x')).toThrow(/sem variáveis/)
    expect(() => parseDomainBound('1/0')).toThrow(/finito/)
    expect(() => parseDomainBound('10001')).toThrow(/entre/)
  })
})
