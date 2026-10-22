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
    expect(paraboloid.gradient).toBeUndefined()
  })

  it('preserva os valores de referência da caixa de ovos', () => {
    const surface = createExpressionFunction('sin(x)*cos(y)')

    expect(surface.evaluate(0, 0)).toBe(0)
    expect(surface.evaluate(Math.PI / 2, 0)).toBeCloseTo(1)
    expect(surface.evaluate(Math.PI / 2, Math.PI)).toBeCloseTo(-1)
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
