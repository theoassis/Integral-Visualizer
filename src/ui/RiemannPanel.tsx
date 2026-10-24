import { useState } from 'react'
import type { RiemannRule } from '../core/quad/riemann'
import type { RiemannCalculationResult } from '../workers/riemannCalculation'

interface RiemannPanelProps {
  readonly workerReady: boolean
  readonly surfaceCalculating: boolean
  readonly integralCalculating: boolean
  readonly expression: string
  readonly result: RiemannCalculationResult | null
  readonly error: string | null
  readonly columnsVisible: boolean
  readonly omittedPrisms: number
  readonly onCalculate: (
    rule: RiemannRule,
    xSubdivisions: number,
    ySubdivisions: number,
  ) => void
  readonly onColumnsVisibleChange: (visible: boolean) => void
}

const RULES: Array<{ value: RiemannRule; label: string }> = [
  { value: 'midpoint', label: 'Ponto médio' },
  { value: 'left', label: 'Esquerda' },
  { value: 'right', label: 'Direita' },
  { value: 'lower', label: 'Inferior amostrada' },
  { value: 'upper', label: 'Superior amostrada' },
  { value: 'random', label: 'Aleatória' },
]

const numberFormat = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 8,
})

function formatValue(value: number | null): string {
  if (value === null) return 'não definido'
  if (!Number.isFinite(value)) return 'fora da faixa numérica'
  return numberFormat.format(value)
}

export default function RiemannPanel({
  workerReady,
  surfaceCalculating,
  integralCalculating,
  expression,
  result,
  error,
  columnsVisible,
  omittedPrisms,
  onCalculate,
  onColumnsVisibleChange,
}: RiemannPanelProps) {
  const [rule, setRule] = useState<RiemannRule>('midpoint')
  const [xSubdivisions, setXSubdivisions] = useState(24)
  const [ySubdivisions, setYSubdivisions] = useState(24)

  return (
    <section className="riemann-panel" aria-labelledby="riemann-heading">
      <div className="riemann-panel-heading">
        <div>
          <span className="card-label">INTEGRAÇÃO NUMÉRICA</span>
          <h2 id="riemann-heading">Somas de Riemann</h2>
        </div>
        <span className="riemann-panel-symbol" aria-hidden="true">
          ∑ f(x*, y*) ΔA
        </span>
      </div>

      <p className="riemann-expression">
        Aproximando a integral de <code>{expression || 'f(x, y)'}</code> no domínio da
        função.
      </p>

      <label className="riemann-field" htmlFor="riemann-rule">
        Regra de amostragem
        <select
          id="riemann-rule"
          value={rule}
          onChange={(event) => setRule(event.currentTarget.value as RiemannRule)}
        >
          {RULES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <div className="riemann-subdivision-controls">
        <label className="riemann-range-field" htmlFor="riemann-x-count">
          <span>
            Subdivisões em <i>x</i>
            <output htmlFor="riemann-x-count">{xSubdivisions}</output>
          </span>
          <input
            id="riemann-x-count"
            type="range"
            min="2"
            max="200"
            step="1"
            value={xSubdivisions}
            onChange={(event) => setXSubdivisions(Number(event.currentTarget.value))}
          />
        </label>
        <label className="riemann-range-field" htmlFor="riemann-y-count">
          <span>
            Subdivisões em <i>y</i>
            <output htmlFor="riemann-y-count">{ySubdivisions}</output>
          </span>
          <input
            id="riemann-y-count"
            type="range"
            min="2"
            max="200"
            step="1"
            value={ySubdivisions}
            onChange={(event) => setYSubdivisions(Number(event.currentTarget.value))}
          />
        </label>
      </div>

      <button
        className="riemann-calculate-button"
        type="button"
        disabled={!workerReady || surfaceCalculating || integralCalculating}
        onClick={() => onCalculate(rule, xSubdivisions, ySubdivisions)}
      >
        {integralCalculating ? 'Calculando as células…' : 'Calcular e visualizar'}
      </button>
      {!workerReady && <p className="riemann-help">Preparando o calculador…</p>}
      {surfaceCalculating && (
        <p className="riemann-help">
          Aguarde a atualização da função antes de integrar.
        </p>
      )}
      {error && (
        <p className="riemann-error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <>
          <label className="riemann-visual-toggle">
            <input
              type="checkbox"
              checked={columnsVisible}
              onChange={(event) => onColumnsVisibleChange(event.currentTarget.checked)}
            />
            <span>Mostrar prismas na cena 3D</span>
          </label>
          {omittedPrisms > 0 && (
            <p className="riemann-help" role="status">
              {omittedPrisms}{' '}
              {omittedPrisms === 1 ? 'prisma omitido' : 'prismas omitidos'} por
              excederem a faixa gráfica segura.
            </p>
          )}

          <dl className="riemann-results" aria-label="Resultados da integral dupla">
            <div className="riemann-result-primary">
              <dt>Soma de Riemann S(n, m)</dt>
              <dd>{formatValue(result.value)}</dd>
            </div>
            <div>
              <dt>Referência numérica · Gauss 64×64</dt>
              <dd>{formatValue(result.referenceValue)}</dd>
            </div>
            <div>
              <dt>Erro absoluto |S − I|</dt>
              <dd>{formatValue(result.absoluteError)}</dd>
            </div>
            <div>
              <dt>Erro relativo</dt>
              <dd>
                {result.relativeError === null
                  ? 'não definido para I = 0'
                  : `${formatValue(result.relativeError * 100)}%`}
              </dd>
            </div>
            <div>
              <dt>Tempo de cálculo</dt>
              <dd>{formatValue(result.elapsedMs)} ms</dd>
            </div>
            <div>
              <dt>Estabilidade da referência · 32→64</dt>
              <dd>{formatValue(result.referenceRefinementDifference)}</dd>
            </div>
          </dl>
          <p className="riemann-disclaimer">
            A referência é uma quadratura de alta ordem, não um valor simbólico. O
            refinamento estima estabilidade; não certifica o erro.
          </p>
        </>
      )}
    </section>
  )
}
