import { describe, expect, it } from 'vitest'
import {
  prepareIntegralCalculatorDraft,
  type IntegralCalculatorDraft,
} from './regionCalculator'

const baseDraft: IntegralCalculatorDraft = {
  expression: '1',
  kind: 'typeI',
  xMin: '0',
  xMax: '1',
  yMin: '0',
  yMax: '1',
  lowerExpression: '0',
  upperExpression: 'x',
  samplingMode: 'center',
}

describe('construtor da integral dupla', () => {
  it('prepara o triângulo tipo I 0≤y≤x≤1', () => {
    expect(prepareIntegralCalculatorDraft(baseDraft)).toEqual({
      expression: '1',
      domain: { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } },
      region: {
        kind: 'typeI',
        lowerExpression: '0',
        upperExpression: 'x',
        samplingMode: 'center',
      },
    })
  })

  it('prepara a região triangular equivalente tipo II', () => {
    const result = prepareIntegralCalculatorDraft({
      ...baseDraft,
      kind: 'typeII',
      lowerExpression: 'y',
      upperExpression: '1',
    })

    expect(result.region?.kind).toBe('typeII')
  })

  it('permite retângulos sem fronteiras funcionais', () => {
    const result = prepareIntegralCalculatorDraft({ ...baseDraft, kind: 'rectangle' })
    expect(result.region).toBeNull()
    expect(result.domain).toEqual({ x: { min: 0, max: 1 }, y: { min: 0, max: 1 } })
  })

  it('rejeita curvas que usam variável incorreta, se cruzam ou saem da janela', () => {
    expect(() =>
      prepareIntegralCalculatorDraft({ ...baseDraft, lowerExpression: 'y' }),
    ).toThrow(/somente de x/)
    expect(() =>
      prepareIntegralCalculatorDraft({
        ...baseDraft,
        lowerExpression: 'x',
        upperExpression: '0',
      }),
    ).toThrow(/cruzam/)
    expect(() =>
      prepareIntegralCalculatorDraft({ ...baseDraft, upperExpression: '2*x' }),
    ).toThrow(/janela gráfica/)
  })
})
