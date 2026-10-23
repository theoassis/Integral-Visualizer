import { describe, expect, it } from 'vitest'
import { compileExpression } from './codegen'

function gradientOf(expression: string) {
  const gradient = compileExpression(expression).gradient
  if (!gradient) throw new Error(`Gradiente analítico não definido para ${expression}`)
  return gradient
}

describe('compileExpression', () => {
  it('respeita a precedência e os parênteses', () => {
    expect(compileExpression('2 + 3 * 4').evaluate()).toBe(14)
    expect(compileExpression('(2 + 3) * 4').evaluate()).toBe(20)
  })

  it('usa potência associativa à direita e potência antes do sinal', () => {
    expect(compileExpression('2^3^2').evaluate()).toBe(512)
    expect(compileExpression('-2^2').evaluate()).toBe(-4)
    expect(compileExpression('2^-2').evaluate()).toBe(0.25)
  })

  it('trata variáveis adjacentes como multiplicação implícita', () => {
    expect(compileExpression('xy').evaluate({ x: 3, y: 4 })).toBe(12)
    expect(compileExpression('2x').evaluate({ x: 3 })).toBe(6)
  })

  it('avalia polinômios em coordenadas conhecidas', () => {
    expect(compileExpression('x^2 + y^2').evaluate({ x: 2, y: 3 })).toBe(13)
    expect(compileExpression('x^2 - y^2').evaluate({ x: 2, y: 3 })).toBe(-5)
  })

  it('avalia o exemplo da superfície nos pontos de referência', () => {
    const surface = compileExpression('sin(x)*cos(y)')
    expect(surface.evaluate({ x: 0, y: 0 })).toBe(0)
    expect(surface.evaluate({ x: Math.PI / 2, y: 0 })).toBeCloseTo(1)
    expect(surface.evaluate({ x: Math.PI / 2, y: Math.PI })).toBeCloseTo(-1)
  })

  it('aceita a gaussiana usada como exemplo do projeto', () => {
    expect(compileExpression('exp(-(x^2+y^2))').evaluate({ x: 0, y: 0 })).toBe(1)
    expect(compileExpression('exp(-(x^2+y^2))').evaluate({ x: 1, y: 2 })).toBeCloseTo(
      Math.exp(-5),
    )
  })

  it('calcula gradientes analíticos por derivação simbólica', () => {
    const gradient = gradientOf('sin(x)*cos(y)')({ x: Math.PI / 4, y: Math.PI / 3 })

    expect(gradient[0]).toBeCloseTo(Math.SQRT2 / 4)
    expect(gradient[1]).toBeCloseTo(-Math.sqrt(6) / 4)
  })

  it('diferencia o produto implícito e parâmetros livres', () => {
    const product = gradientOf('xy')({ x: 3, y: 4 })
    const parameterized = gradientOf('sin(a*x)')({ a: 2, x: 0.3 })

    expect(product).toEqual([4, 3])
    expect(parameterized[0]).toBeCloseTo(2 * Math.cos(0.6))
    expect(parameterized[1]).toBe(0)
  })

  it('deriva potências e tangente usando regras analíticas', () => {
    expect(gradientOf('x^2+y^2')({ x: 1, y: 2 })).toEqual([2, 4])
    expect(gradientOf('tan(x)')({ x: 0.2 })[0]).toBeCloseTo(1 / Math.cos(0.2) ** 2)
  })

  it('confere derivadas simbólicas com diferenças finitas centrais', () => {
    const source = 'exp(-x^2)*sin(y)+log(x+2)'
    const expression = compileExpression(source)
    const x = 0.4
    const y = -0.7
    const h = 1e-5
    const gradient = gradientOf(source)({ x, y })
    const dx =
      (expression.evaluate({ x: x + h, y }) - expression.evaluate({ x: x - h, y })) /
      (2 * h)
    const dy =
      (expression.evaluate({ x, y: y + h }) - expression.evaluate({ x, y: y - h })) /
      (2 * h)

    expect(gradient[0]).toBeCloseTo(dx, 6)
    expect(gradient[1]).toBeCloseTo(dy, 6)
  })

  it('não inventa gradiente analítico quando uma função não tem regra suportada', () => {
    expect(compileExpression('floor(x)+y').gradient).toBeUndefined()
  })

  it('aceita os aliases em português sen e tg', () => {
    expect(compileExpression('sen(pi/2)').evaluate()).toBeCloseTo(1)
    expect(compileExpression('tg(pi/4)').evaluate()).toBeCloseTo(1)
  })

  it('interpreta abreviações trigonométricas escolares sem parênteses', () => {
    const shorthand = compileExpression('senxtany')

    expect(shorthand.variables).toEqual(['x', 'y'])
    expect(shorthand.evaluate({ x: Math.PI / 6, y: Math.PI / 4 })).toBeCloseTo(0.5)
  })

  it('reconhece as constantes pi e e', () => {
    expect(compileExpression('cos(pi) + e').evaluate()).toBeCloseTo(Math.E - 1)
    expect(compileExpression('pix').evaluate({ x: 2 })).toBeCloseTo(2 * Math.PI)
  })

  it('aceita funções unárias da lista branca', () => {
    expect(compileExpression('sqrt(abs(-9))').evaluate()).toBe(3)
    expect(compileExpression('asin(1)').evaluate()).toBeCloseTo(Math.PI / 2)
    expect(compileExpression('atan(1)').evaluate()).toBeCloseTo(Math.PI / 4)
    expect(compileExpression('sinh(0)+cosh(0)+tanh(0)').evaluate()).toBe(1)
  })

  it('marca os polos de tan como indefinidos em vez de produzir alturas enormes', () => {
    expect(compileExpression('tan(pi/2)').evaluate()).toBeNaN()
    expect(compileExpression('tan(3*pi/2)').evaluate()).toBeNaN()
    expect(compileExpression('tan(pi/4)').evaluate()).toBeCloseTo(1)
  })

  it('aceita as funções de dois argumentos atan2 e pow', () => {
    expect(compileExpression('atan2(1,1)').evaluate()).toBeCloseTo(Math.PI / 4)
    expect(compileExpression('pow(2,3)').evaluate()).toBe(8)
  })

  it('aceita min, max e floor', () => {
    expect(compileExpression('min(3,1,2)+max(3,1,2)+floor(1.9)').evaluate()).toBe(5)
  })

  it('mapeia log e ln para o logaritmo natural', () => {
    expect(compileExpression('log(e)+ln(e^2)').evaluate()).toBeCloseTo(3)
  })

  it('permite logaritmo com base explícita', () => {
    expect(compileExpression('log(8,2)').evaluate()).toBeCloseTo(3)
  })

  it('lista variáveis livres uma única vez e em ordem estável', () => {
    expect(compileExpression('y+a*x+xy+pi+e').variables).toEqual(['a', 'x', 'y'])
  })

  it('aceita valores de variáveis fornecidos como Map', () => {
    expect(
      compileExpression('x+y').evaluate(
        new Map([
          ['x', 2],
          ['y', 5],
        ]),
      ),
    ).toBe(7)
  })

  it('mantém resultados não finitos para o renderizador tratar como buracos', () => {
    expect(compileExpression('1/x').evaluate({ x: 0 })).toBe(Infinity)
  })

  it('explica em português quando a expressão está vazia', () => {
    expect(() => compileExpression('  ')).toThrow(/Digite uma expressão matemática/)
  })

  it('explica em português quando a sintaxe está incompleta', () => {
    expect(() => compileExpression('sin(')).toThrow(/Não foi possível interpretar/)
  })

  it('explica em português quando uma variável não foi informada', () => {
    expect(() => compileExpression('x+y').evaluate({ x: 1 })).toThrow(
      /variável "y" não foi informada/,
    )
  })

  it('não aceita valores herdados como variáveis', () => {
    const inheritedValues = Object.create({ x: 2 }) as Record<string, number>
    expect(() => compileExpression('x').evaluate(inheritedValues)).toThrow(
      /variável "x" não foi informada/,
    )
  })

  it('rejeita chamadas de função ausentes da lista branca', () => {
    expect(() => compileExpression('danger(1)')).toThrow(
      /Função "danger" não permitida/,
    )
    expect(() => compileExpression('sec(x)')).toThrow(/Função "sec" não permitida/)
  })

  it('rejeita quantidade incorreta de argumentos', () => {
    expect(() => compileExpression('sin(1,2)')).toThrow(/espera 1 argumento/)
    expect(() => compileExpression('pow(2)')).toThrow(/espera 2 argumentos/)
  })

  it('rejeita sintaxes que não pertencem à linguagem matemática', () => {
    expect(() => compileExpression('x = 1')).toThrow(/não é permitida/)
    expect(() => compileExpression('x!')).toThrow(/não é permitida/)
  })

  it('rejeita expressões excessivamente longas', () => {
    expect(() => compileExpression('x+'.repeat(300) + 'x')).toThrow(/longa demais/)
    expect(() => compileExpression(' '.repeat(513))).toThrow(/longa demais/)
  })

  it.each([
    'globalThis.process.exit(1)',
    'process.exit(1)',
    'window.alert(1)',
    'Math.random()',
    'x.constructor(1)',
    'x["constructor"]',
    'import("node:fs")',
    'constructor(1)',
    'x = 1',
    '2; process.exit(1)',
    '__proto__',
    'toString(1)',
  ])('bloqueia a entrada não confiável %s sem executá-la', (source) => {
    expect(() => compileExpression(source)).toThrow()
  })

  it('rejeita combinações geradas de acesso a objetos e propriedades', () => {
    const roots = [
      'Math',
      'globalThis',
      'window',
      'document',
      'process',
      'Function',
      'Object',
    ]
    const properties = ['random', 'constructor', 'prototype', 'exit', 'alert']

    for (const root of roots) {
      for (const property of properties) {
        expect(() => compileExpression(`${root}.${property}(1)`)).toThrow()
      }
    }
  })
})
