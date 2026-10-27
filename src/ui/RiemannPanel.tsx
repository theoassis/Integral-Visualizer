import { useState } from 'react'
import type { RiemannRule } from '../core/quad/riemann'
import type { RiemannCalculationResult } from '../workers/riemannCalculation'
import { RIEMANN_EXAMPLES, type RiemannExample } from './riemannExamples'

export type RiemannSceneMode = 'surface' | 'prisms' | 'solid' | 'both'

interface RiemannPanelProps {
  readonly workerReady: boolean
  readonly surfaceCalculating: boolean
  readonly integralCalculating: boolean
  readonly expression: string
  readonly result: RiemannCalculationResult | null
  readonly error: string | null
  readonly omittedPrisms: number
  readonly sceneMode: RiemannSceneMode
  readonly exactValue: number | null
  readonly onCalculate: (
    rule: RiemannRule,
    xSubdivisions: number,
    ySubdivisions: number,
  ) => void
  readonly onSceneModeChange: (mode: RiemannSceneMode) => void
  readonly onExampleSelect: (example: RiemannExample) => void
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
  omittedPrisms,
  sceneMode,
  exactValue,
  onCalculate,
  onSceneModeChange,
  onExampleSelect,
}: RiemannPanelProps) {
  const [rule, setRule] = useState<RiemannRule>('midpoint')
  const [xSubdivisions, setXSubdivisions] = useState(24)
  const [ySubdivisions, setYSubdivisions] = useState(24)

  return (
    <section
      id="riemann-panel"
      className="riemann-panel"
      aria-labelledby="riemann-heading"
    >
      <div className="riemann-panel-heading">
        <div>
          <span className="card-label">INTEGRAÇÃO NUMÉRICA</span>
          <h2 id="riemann-heading">Somas de Riemann</h2>
        </div>
        <span className="riemann-panel-symbol" aria-hidden="true">
          ∬<sub>D</sub> f(x, y) dA ≈ ∑ f(x*, y*) ΔA
        </span>
      </div>

      <p className="riemann-expression">
        Aproximando a integral de <code>{expression || 'f(x, y)'}</code> no domínio da
        função.
      </p>

      <label className="riemann-field" htmlFor="riemann-example">
        Exemplo de referência
        <select
          id="riemann-example"
          defaultValue=""
          onChange={(event) => {
            const example = RIEMANN_EXAMPLES.find(
              (item) => item.id === event.currentTarget.value,
            )
            if (example) onExampleSelect(example)
            event.currentTarget.value = ''
          }}
        >
          <option value="">Escolha uma integral conhecida…</option>
          {RIEMANN_EXAMPLES.map((example) => (
            <option key={example.id} value={example.id}>
              {example.label}
            </option>
          ))}
        </select>
      </label>

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
        id="riemann-calculate"
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
          <label className="riemann-field" htmlFor="riemann-scene-mode">
            Camadas da cena 3D
            <select
              id="riemann-scene-mode"
              value={sceneMode}
              onChange={(event) => {
                const mode = event.currentTarget.value as RiemannSceneMode
                onSceneModeChange(mode)
              }}
            >
              <option value="surface">Superfície</option>
              <option value="prisms">Superfície + prismas</option>
              <option value="solid">Superfície + sólido</option>
              <option value="both">Superfície + prismas + sólido</option>
            </select>
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
            {exactValue !== null && (
              <div>
                <dt>Valor exato do exemplo</dt>
                <dd>{formatValue(exactValue)}</dd>
              </div>
            )}
            <div>
              <dt>Erro absoluto |S − I₆₄|</dt>
              <dd>{formatValue(result.absoluteError)}</dd>
            </div>
            {exactValue !== null && (
              <div>
                <dt>Erro da soma em relação ao exato</dt>
                <dd>{formatValue(Math.abs(result.value - exactValue))}</dd>
              </div>
            )}
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
          <section
            className="riemann-convergence"
            aria-labelledby="convergence-heading"
          >
            <div className="riemann-convergence-heading">
              <h3 id="convergence-heading">Convergência</h3>
              <span>
                ordem observada{' '}
                {result.observedOrder === null
                  ? 'indisponível'
                  : `≈ ${formatValue(result.observedOrder)}`}
              </span>
            </div>
            <ConvergenceChart result={result} />
            <p className="riemann-help">
              Erro em escala log-log para n igual nas duas direções. A ordem é uma
              regressão das amostras mostradas, não uma garantia teórica; a regra
              aleatória pode oscilar.
            </p>
          </section>
          <p className="riemann-disclaimer">
            A referência usa quadratura de Gauss–Legendre 64×64, não um valor simbólico
            nem certificado. O sólido é construído da malha refinada e representa o
            volume assinado entre a superfície e z = 0; é uma aproximação geométrica.
          </p>
        </>
      )}
    </section>
  )
}

function ConvergenceChart({ result }: { readonly result: RiemannCalculationResult }) {
  const points = result.convergence.filter(
    ({ subdivisions, error }) =>
      subdivisions > 0 && error > 0 && Number.isFinite(error),
  )
  if (points.length < 2) {
    return (
      <p className="riemann-help" role="status">
        A referência e a soma coincidem na precisão numérica disponível; não há pontos
        suficientes para traçar o log do erro.
      </p>
    )
  }

  const width = 320
  const height = 152
  const left = 38
  const right = 12
  const top = 12
  const bottom = 28
  const xValues = points.map(({ subdivisions }) => Math.log10(subdivisions))
  const yValues = points.map(({ error }) => Math.log10(error))
  const xMin = Math.min(...xValues)
  const xMax = Math.max(...xValues)
  const yMin = Math.min(...yValues)
  const yMax = Math.max(...yValues)
  const xSpan = xMax - xMin || 1
  const ySpan = yMax - yMin || 1
  const coordinate = (index: number) => ({
    x: left + ((xValues[index]! - xMin) / xSpan) * (width - left - right),
    y: top + ((yMax - yValues[index]!) / ySpan) * (height - top - bottom),
  })
  const plotPoints = points.map((_, index) => coordinate(index))
  const line = plotPoints.map(({ x, y }) => `${x},${y}`).join(' ')

  return (
    <svg
      className="riemann-convergence-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Gráfico log-log do erro absoluto em função do número de subdivisões"
    >
      <line x1={left} y1={top} x2={left} y2={height - bottom} />
      <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} />
      <polyline points={line} />
      {plotPoints.map(({ x, y }, index) => (
        <g key={points[index]!.subdivisions}>
          <circle cx={x} cy={y} r="3" />
          <text x={x} y={height - 10} textAnchor="middle">
            {points[index]!.subdivisions}
          </text>
        </g>
      ))}
      <text x="5" y="13">
        erro
      </text>
      <text x={width - 16} y={height - 2}>
        n
      </text>
    </svg>
  )
}
