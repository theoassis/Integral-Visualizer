import { describe, expect, it } from 'vitest'
import { changeRegionOrder, createRegionFromExpressions } from './riemannRegion'
import { integral2TypeII } from './regions'

describe('conversão da ordem de integração', () => {
  it('converte o triângulo tipo I em tipo II e preserva a integral', () => {
    const bounds = [0, 1] as const
    const result = changeRegionOrder(
      {
        kind: 'typeI',
        lowerExpression: '0',
        upperExpression: 'x',
        samplingMode: 'center',
      },
      bounds,
      bounds,
      (x) => x,
    )

    expect(result.region.kind).toBe('typeII')
    expect(result.sourceValue).toBeCloseTo(1 / 3, 12)
    expect(result.convertedValue).toBeCloseTo(1 / 3, 10)
    expect(result.relativeDifference).not.toBeNull()
    expect(result.relativeDifference!).toBeLessThan(1e-3)
    expect(result.sourceArea).toBeCloseTo(0.5, 12)
    expect(result.convertedArea).toBeCloseTo(0.5, 10)
    expect(result.areaDifference).toBeLessThan(1e-3)
    expect(result.samplesPerBoundary).toBe(257)
  })

  it('converte a região entre parábolas e verifica a integral A6 nos dois sentidos', () => {
    const bounds = [0, 1] as const
    const sourceDefinition = {
      kind: 'typeI' as const,
      lowerExpression: 'x^2',
      upperExpression: 'sqrt(x)',
      samplingMode: 'precise' as const,
    }
    const result = changeRegionOrder(sourceDefinition, bounds, bounds, (x, y) => x + y)
    const convertedRegion = createRegionFromExpressions(result.region, bounds, bounds)

    expect(result.region.kind).toBe('typeII')
    expect(result.sourceValue).toBeCloseTo(0.3, 9)
    expect(result.convertedValue).toBeCloseTo(0.3, 3)
    expect(convertedRegion.kind).toBe('typeII')
    if (convertedRegion.kind !== 'typeII') throw new Error('tipo II esperado')
    expect(integral2TypeII((x, y) => x + y, convertedRegion, 64)).toBeCloseTo(0.3, 3)
  })

  it('converte uma região de faixa horizontal de volta para tipo I', () => {
    const bounds = [0, 1] as const
    const result = changeRegionOrder(
      {
        kind: 'typeII',
        lowerExpression: '0',
        upperExpression: 'y',
        samplingMode: 'center',
      },
      bounds,
      bounds,
      () => 1,
    )

    expect(result.region.kind).toBe('typeI')
    expect(result.sourceValue).toBeCloseTo(0.5, 12)
    expect(result.convertedValue).toBeCloseTo(0.5, 12)
  })

  it('marca erro relativo como indefinido quando a integral de referência é zero', () => {
    const result = changeRegionOrder(
      {
        kind: 'typeI',
        lowerExpression: '0',
        upperExpression: '1',
        samplingMode: 'center',
      },
      [0, 1],
      [0, 1],
      (x, y) => x - y,
    )

    expect(result.sourceValue).toBeCloseTo(0, 12)
    expect(result.relativeDifference).toBeNull()
  })

  it('avisa em regiões cuja seção transversal vira vários intervalos', () => {
    expect(() =>
      changeRegionOrder(
        {
          kind: 'typeI',
          lowerExpression: '0',
          upperExpression: 'sin(4*pi*x)^2',
          samplingMode: 'center',
        },
        [0, 1],
        [0, 1],
        () => 1,
      ),
    ).toThrow(/intervalos desconexos/)
  })

  it('rejeita conversão de regiões polares/implícitas e resolução inválida', () => {
    expect(() =>
      changeRegionOrder(
        {
          kind: 'polar',
          lowerExpression: '0',
          upperExpression: '1',
          samplingMode: 'center',
        },
        [0, 1],
        [0, 1],
        () => 1,
      ),
    ).toThrow(/tipo I\/II/)
    expect(() =>
      changeRegionOrder(
        {
          kind: 'typeI',
          lowerExpression: '0',
          upperExpression: 'x',
          samplingMode: 'center',
        },
        [0, 1],
        [0, 1],
        () => 1,
        2,
      ),
    ).toThrow(/Resolução/)
  })
})
