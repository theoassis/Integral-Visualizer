export interface RiemannExample {
  readonly id: string
  readonly label: string
  readonly expression: string
  readonly domain: {
    readonly x: { readonly min: number; readonly max: number }
    readonly y: { readonly min: number; readonly max: number }
  }
  readonly exactValue: number
}

export const RIEMANN_EXAMPLES: readonly RiemannExample[] = [
  {
    id: 'xy-unit-square',
    label: 'xy em [0, 1]²  ·  1/4',
    expression: 'x*y',
    domain: { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } },
    exactValue: 1 / 4,
  },
  {
    id: 'quadratic-unit-square',
    label: 'x² + y² em [0, 1]²  ·  2/3',
    expression: 'x^2+y^2',
    domain: { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } },
    exactValue: 2 / 3,
  },
  {
    id: 'sine-pi-square',
    label: 'sen x · sen y em [0, π]²  ·  4',
    expression: 'sin(x)*sin(y)',
    domain: {
      x: { min: 0, max: Math.PI },
      y: { min: 0, max: Math.PI },
    },
    exactValue: 4,
  },
  {
    id: 'symmetric-zero',
    label: 'x − y em [0, 1]²  ·  0',
    expression: 'x-y',
    domain: { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } },
    exactValue: 0,
  },
]
