/** A fully described function ready for visualization. */
export interface VisualizableFunction {
  /** Unique identifier */
  id: string
  /** Display name in pt-BR */
  name: string
  /** LaTeX-like formula string for display (e.g. "z = \\sin(x) \\cdot \\cos(y)") */
  formula: string
  /** Plain text formula for aria labels */
  formulaPlain: string
  /** Domain bounds */
  domain: {
    x: { min: number; max: number }
    y: { min: number; max: number }
  }
  /** Domain description for display (e.g. "−π ≤ x, y ≤ π") */
  domainLabel: string
  /** Range of the function */
  range: { min: number; max: number }
  /** Evaluate the function at (x, y) */
  evaluate: (x: number, y: number) => number
  /** Compute the gradient [∂f/∂x, ∂f/∂y] at (x, y), when known analytically */
  gradient?: (x: number, y: number) => [number, number]
  /** Critical points with classification */
  criticalPoints: CriticalPointData[]
  /** Step-by-step mathematical analysis in pt-BR */
  analysis: AnalysisStep[]
}

export interface CriticalPointData {
  x: number
  y: number
  z: number
  kind: 'maximum' | 'minimum' | 'saddle'
  /** Display label, e.g. "(π/2, 0)" */
  label: string
}

export interface AnalysisStep {
  /** Step title */
  title: string
  /** Content - math notation and explanatory text in pt-BR */
  content: string
  /** Which scene elements this step relates to (for highlighting) */
  relatedElements?: ('surface' | 'gradient' | 'criticalPoints' | 'axes')[]
}
