import { describe, expect, it } from 'vitest'
import { createExpressionFunction, getExpressionParameters } from './expressionFunction'

describe('createExpressionFunction', () => {
  it('adapta uma expressão arbitrária à interface de função visualizável', () => {
    const paraboloid = createExpressionFunction('x^2+y^2')

    expect(paraboloid.name).toBe('Função personalizada')
    expect(paraboloid.formulaPlain).toBe('z = x^2+y^2')
    expect(paraboloid.evaluate(1, 2)).toBe(5)
    expect(paraboloid.criticalPoints).toEqual([])
    expect(paraboloid.analysis).toEqual([])
    expect(paraboloid.gradient?.(1, 2)).toEqual([2, 4])
  })

  it('preserva os valores de referência da caixa de ovos', () => {
    const surface = createExpressionFunction('sin(x)*cos(y)')

    expect(surface.evaluate(0, 0)).toBe(0)
    expect(surface.evaluate(Math.PI / 2, 0)).toBeCloseTo(1)
    expect(surface.evaluate(Math.PI / 2, Math.PI)).toBeCloseTo(-1)
  })

  it('mantém a escala controlada para senxtany no domínio padrão', () => {
    const surface = createExpressionFunction('senxtany')

    expect(surface.evaluate(Math.PI / 6, Math.PI / 4)).toBeCloseTo(0.5)
    expect(surface.gradient?.(Math.PI / 6, Math.PI / 4)[0]).toBeCloseTo(
      Math.sqrt(3) / 2,
    )
    expect(surface.gradient?.(Math.PI / 6, Math.PI / 4)[1]).toBeCloseTo(1)
    expect(Math.abs(surface.range.min)).toBeLessThan(100)
    expect(Math.abs(surface.range.max)).toBeLessThan(100)
  })

  it('estima uma faixa finita a partir do domínio cartesiano padrão', () => {
    const paraboloid = createExpressionFunction('x^2+y^2')

    expect(paraboloid.domain).toEqual({
      x: { min: -Math.PI, max: Math.PI },
      y: { min: -Math.PI, max: Math.PI },
    })
    expect(paraboloid.range.min).toBeLessThanOrEqual(0)
    expect(paraboloid.range.max).toBeGreaterThan(2 * Math.PI ** 2)
  })

  it('usa limites personalizados para o domínio e a faixa amostrada', () => {
    const surface = createExpressionFunction(
      'x^2+y^2',
      {},
      { x: { min: 0, max: 1 }, y: { min: -2, max: 2 } },
    )

    expect(surface.domain).toEqual({
      x: { min: 0, max: 1 },
      y: { min: -2, max: 2 },
    })
    expect(surface.evaluate(1, 2)).toBe(5)
    expect(surface.domainLabel).toContain('0 ≤ x ≤ 1')
    expect(surface.domainLabel).toContain('−2 ≤ y ≤ 2')
  })

  it('rejeita limites iguais, invertidos ou não finitos', () => {
    expect(() =>
      createExpressionFunction(
        'x+y',
        {},
        { x: { min: 1, max: 1 }, y: { min: 0, max: 1 } },
      ),
    ).toThrow(/limite inferior.*menor/i)
    expect(() =>
      createExpressionFunction(
        'x+y',
        {},
        { x: { min: 0, max: 1 }, y: { min: 2, max: -2 } },
      ),
    ).toThrow(/limite inferior.*menor/i)
    expect(() =>
      createExpressionFunction(
        'x+y',
        {},
        { x: { min: Number.NEGATIVE_INFINITY, max: 1 }, y: { min: 0, max: 1 } },
      ),
    ).toThrow(/reais e finitos/i)
  })

  it('mantém NaN e infinito para a malha identificar os buracos', () => {
    const reciprocal = createExpressionFunction('1/x')
    const squareRoot = createExpressionFunction('sqrt(x)')

    expect(reciprocal.evaluate(0, 1)).toBe(Infinity)
    expect(squareRoot.evaluate(-1, 0)).toBeNaN()
    expect(squareRoot.evaluate(1, 0)).toBe(1)
  })

  it('identifica parâmetros livres e os avalia com valores ajustáveis', () => {
    const expression = 'sin(a*x)*cos(y)'
    const defaultFunction = createExpressionFunction(expression)
    const adjustedFunction = createExpressionFunction(expression, { a: 2 })

    expect(getExpressionParameters(expression)).toEqual(['a'])
    expect(defaultFunction.evaluate(Math.PI / 2, 0)).toBeCloseTo(1)
    expect(adjustedFunction.evaluate(Math.PI / 4, 0)).toBeCloseTo(1)
    expect(() => createExpressionFunction(expression, { a: Number.NaN })).toThrow(
      /parâmetro "a".*finito/i,
    )
  })

  it('repassa mensagens pt-BR do parser para a interface', () => {
    expect(() => createExpressionFunction('sin(')).toThrow(
      /Não foi possível interpretar/,
    )
  })
})
