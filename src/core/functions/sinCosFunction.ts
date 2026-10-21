import type { VisualizableFunction } from './types'

/**
 * Visualizable definition for the surface z = sin(x)·cos(y)
 * on the domain [−π, π]².
 */
export const sinCosFunction: VisualizableFunction = {
  id: 'sin-cos',
  name: 'Seno vezes Cosseno',
  formula: 'z = \\sin(x) \\cdot \\cos(y)',
  formulaPlain: 'z igual a seno de x vezes cosseno de y',
  domain: {
    x: { min: -Math.PI, max: Math.PI },
    y: { min: -Math.PI, max: Math.PI },
  },
  domainLabel: '−π ≤ x, y ≤ π',
  range: { min: -1, max: 1 },

  evaluate: (x: number, y: number): number => Math.sin(x) * Math.cos(y),

  gradient: (x: number, y: number): [number, number] => [
    Math.cos(x) * Math.cos(y),
    -Math.sin(x) * Math.sin(y),
  ],

  criticalPoints: [
    // ── Maxima (f = 1) ──────────────────────────────────────────────────
    { x: Math.PI / 2, y: 0, z: 1, kind: 'maximum', label: '(π/2, 0)' },
    { x: -Math.PI / 2, y: -Math.PI, z: 1, kind: 'maximum', label: '(−π/2, −π)' },
    { x: -Math.PI / 2, y: Math.PI, z: 1, kind: 'maximum', label: '(−π/2, π)' },

    // ── Minima (f = −1) ─────────────────────────────────────────────────
    { x: -Math.PI / 2, y: 0, z: -1, kind: 'minimum', label: '(−π/2, 0)' },
    { x: Math.PI / 2, y: -Math.PI, z: -1, kind: 'minimum', label: '(π/2, −π)' },
    { x: Math.PI / 2, y: Math.PI, z: -1, kind: 'minimum', label: '(π/2, π)' },

    // ── Saddle points (f = 0) ───────────────────────────────────────────
    // x ∈ {−π, 0, π}, y ∈ {−π/2, π/2}
    { x: -Math.PI, y: -Math.PI / 2, z: 0, kind: 'saddle', label: '(−π, −π/2)' },
    { x: -Math.PI, y: Math.PI / 2, z: 0, kind: 'saddle', label: '(−π, π/2)' },
    { x: 0, y: -Math.PI / 2, z: 0, kind: 'saddle', label: '(0, −π/2)' },
    { x: 0, y: Math.PI / 2, z: 0, kind: 'saddle', label: '(0, π/2)' },
    { x: Math.PI, y: -Math.PI / 2, z: 0, kind: 'saddle', label: '(π, −π/2)' },
    { x: Math.PI, y: Math.PI / 2, z: 0, kind: 'saddle', label: '(π, π/2)' },
  ],

  analysis: [
    // 1. Função e domínio
    {
      title: 'Função e domínio',
      content: [
        'Considere a função de duas variáveis reais:',
        '',
        'f(x, y) = sin(x)·cos(y)',
        '',
        'definida no domínio fechado D = [−π, π] × [−π, π].',
        'Essa superfície combina uma oscilação senoidal na direção x com uma oscilação cossenoidal na direção y,',
        'produzindo um padrão de "xadrez" de picos e vales com amplitude máxima igual a 1.',
      ].join('\n'),
      relatedElements: ['surface', 'axes'],
    },

    // 2. Derivadas parciais
    {
      title: 'Derivadas parciais',
      content: [
        'As derivadas parciais de primeira ordem são obtidas aplicando as regras de derivação a cada variável',
        'enquanto a outra é tratada como constante:',
        '',
        '∂f/∂x = cos(x)·cos(y)',
        '  → Derivamos sin(x) em relação a x, obtendo cos(x), e cos(y) permanece inalterado.',
        '',
        '∂f/∂y = −sin(x)·sin(y)',
        '  → sin(x) permanece inalterado e derivamos cos(y) em relação a y, obtendo −sin(y).',
      ].join('\n'),
      relatedElements: ['surface'],
    },

    // 3. Gradiente
    {
      title: 'Gradiente',
      content: [
        'O vetor gradiente reúne as derivadas parciais:',
        '',
        '∇f(x, y) = (cos(x)·cos(y),  −sin(x)·sin(y))',
        '',
        'Em cada ponto do domínio, ∇f aponta na direção de maior crescimento de f.',
        'Sua norma ‖∇f‖ indica a taxa de variação nessa direção.',
        'Quando ‖∇f‖ = 0, estamos num ponto crítico.',
      ].join('\n'),
      relatedElements: ['gradient'],
    },

    // 4. Pontos críticos
    {
      title: 'Pontos críticos',
      content: [
        'Os pontos críticos satisfazem ∇f = (0, 0), ou seja:',
        '',
        '  cos(x)·cos(y) = 0   …(I)',
        '  sin(x)·sin(y) = 0   …(II)',
        '',
        'De (I): cos(x) = 0  ou  cos(y) = 0.',
        '',
        'Caso A — cos(x) = 0  ⟹  x ∈ {−π/2, π/2}.',
        '  Substituindo em (II): sin(x) ≠ 0, logo sin(y) = 0  ⟹  y ∈ {−π, 0, π}.',
        '  Isso gera 6 pontos: f(±π/2, 0) = ±1 e f(±π/2, ±π) = ∓1.',
        '',
        'Caso B — cos(y) = 0  ⟹  y ∈ {−π/2, π/2}.',
        '  Substituindo em (II): sin(y) ≠ 0, logo sin(x) = 0  ⟹  x ∈ {−π, 0, π}.',
        '  Isso gera 6 pontos, todos com f = 0.',
        '',
        'Total: 12 pontos críticos em [−π, π]².',
      ].join('\n'),
      relatedElements: ['criticalPoints'],
    },

    // 5. Classificação (Hessiana)
    {
      title: 'Classificação (Hessiana)',
      content: [
        'Derivadas parciais de segunda ordem:',
        '',
        'f_xx = −sin(x)·cos(y)',
        'f_yy = −sin(x)·cos(y)',
        'f_xy = −cos(x)·sin(y)',
        '',
        'Note que f_xx = f_yy = −f(x, y).',
        '',
        'O determinante da Hessiana é:',
        'D = f_xx·f_yy − (f_xy)²',
        '  = sin²(x)·cos²(y) − cos²(x)·sin²(y)',
        '',
        'Critério de classificação:',
        '• D > 0 e f_xx < 0  →  máximo local',
        '• D > 0 e f_xx > 0  →  mínimo local',
        '• D < 0             →  ponto de sela',
        '',
        'Resultados para os 12 pontos:',
        '  (π/2, 0), (−π/2, ±π): D = 1 > 0, f_xx = −1 < 0  →  máximo (f = 1)',
        '  (−π/2, 0), (π/2, ±π): D = 1 > 0, f_xx = 1 > 0   →  mínimo (f = −1)',
        '  x ∈ {−π, 0, π}, y ∈ {−π/2, π/2}: D = −1 < 0     →  ponto de sela (f = 0)',
      ].join('\n'),
      relatedElements: ['criticalPoints', 'surface'],
    },

    // 6. Propriedade da curvatura
    {
      title: 'Propriedade da curvatura',
      content: [
        'A soma das derivadas segundas (o Laplaciano) é:',
        '',
        'Δf = f_xx + f_yy = −sin(x)·cos(y) + (−sin(x)·cos(y)) = −2·sin(x)·cos(y) = −2f',
        '',
        'Portanto:',
        '',
        'Δf + 2f = 0',
        '',
        'Essa é uma equação de Helmholtz com constante k² = 2.',
        'Isso significa que f é uma autofunção do operador Laplaciano com autovalor −2,',
        'refletindo a periodicidade regular da superfície.',
      ].join('\n'),
      relatedElements: ['surface'],
    },
  ],
}
