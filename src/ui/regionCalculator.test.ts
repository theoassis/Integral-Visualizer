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
  rMin: '0',
  rMax: '1',
  thetaMin: '0',
  thetaMax: '2*pi',
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

  it('prepara disco polar, limites do domínio e jacobiano angular/radial', () => {
    const result = prepareIntegralCalculatorDraft({ ...baseDraft, kind: 'polar' })
    expect(result.domain).toEqual({ x: { min: -1, max: 1 }, y: { min: -1, max: 1 } })
    expect(result.region).toMatchObject({
      kind: 'polar',
      radiusBounds: [0, 1],
      thetaBounds: [0, 2 * Math.PI],
    })
  })

  it('rejeita região polar com raio negativo ou ângulo acima de 2π', () => {
    expect(() =>
      prepareIntegralCalculatorDraft({ ...baseDraft, kind: 'polar', rMin: '-1' }),
    ).toThrow(/radiais/)
    expect(() =>
      prepareIntegralCalculatorDraft({ ...baseDraft, kind: 'polar', thetaMax: '3*pi' }),
    ).toThrow(/angulares/)
  })
})
