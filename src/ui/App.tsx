import { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import HelloSurface from '../render/HelloSurface'
import type { PointInfo, SurfaceDiagnostics } from '../render/HelloSurface'
import {
  createExpressionFunction,
  getExpressionParameters,
  sinCosFunction,
} from '../core/functions'
import type { VisualizableFunction } from '../core/functions'
import MathAnalysisPanel from './MathAnalysisPanel'
import { MathText, MFn, MVar, MathBlock } from './MathView'

const fn = sinCosFunction
const DEFAULT_EXPRESSION = 'sin(x)*cos(y)'

const axisLegend = [
  { axis: 'x', color: 'axis-x', direction: 'horizontal' },
  { axis: 'y', color: 'axis-y', direction: 'profundidade' },
  { axis: 'z', color: 'axis-z', direction: 'vertical' },
]

const criticalKindBadge: Record<string, { label: string; badgeClass: string }> = {
  maximum: { label: 'Máximo Global (f = 1)', badgeClass: 'badge-max' },
  minimum: { label: 'Mínimo Global (f = −1)', badgeClass: 'badge-min' },
  saddle: { label: 'Ponto de Sela (f = 0)', badgeClass: 'badge-saddle' },
}

export default function App() {
  const [activeFunction, setActiveFunction] = useState<VisualizableFunction>(fn)
  const [parameterValues, setParameterValues] = useState<Record<string, number>>({})
  const [formulaDraft, setFormulaDraft] = useState(DEFAULT_EXPRESSION)
  const [appliedExpression, setAppliedExpression] = useState<string | null>(null)
  const [formulaError, setFormulaError] = useState<string | null>(null)
  const [surfaceDiagnostics, setSurfaceDiagnostics] =
    useState<SurfaceDiagnostics | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [showCriticalPoints, setShowCriticalPoints] = useState(true)
  const [showGradient, setShowGradient] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [showAxes, setShowAxes] = useState(true)
  const [highlightedElement, setHighlightedElement] = useState<
    'surface' | 'gradient' | 'criticalPoints' | 'axes' | null
  >(null)
  const [hoveredPoint, setHoveredPoint] = useState<PointInfo | null>(null)

  const handlePointHover = useCallback((info: PointInfo | null) => {
    setHoveredPoint(info)
  }, [])

  const handleSurfaceDiagnostics = useCallback((diagnostics: SurfaceDiagnostics) => {
    setSurfaceDiagnostics(diagnostics)
  }, [])

  const handleApplyFormula = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const parameters = getExpressionParameters(formulaDraft)
      const nextParameterValues = Object.fromEntries(
        parameters.map((name) => [name, 1]),
      )
      const nextFunction = createExpressionFunction(formulaDraft, nextParameterValues)
      setActiveFunction(nextFunction)
      setParameterValues(nextParameterValues)
      setAppliedExpression(formulaDraft.trim())
      setFormulaError(null)
      setSurfaceDiagnostics(null)
      setShowCriticalPoints(false)
      setShowGradient(false)
      setHoveredPoint(null)
    } catch (error) {
      setFormulaError(
        error instanceof Error
          ? error.message
          : 'Não foi possível aplicar essa expressão matemática.',
      )
    }
  }

  const handleRestoreExample = () => {
    setActiveFunction(fn)
    setParameterValues({})
    setFormulaDraft(DEFAULT_EXPRESSION)
    setAppliedExpression(null)
    setFormulaError(null)
    setSurfaceDiagnostics(null)
    setShowCriticalPoints(true)
    setShowGradient(false)
    setHoveredPoint(null)
  }

  const handleParameterChange = (name: string, value: number) => {
    const nextValues = { ...parameterValues, [name]: value }
    setParameterValues(nextValues)
    if (appliedExpression) {
      setActiveFunction(createExpressionFunction(appliedExpression, nextValues))
    }
  }

  const handleHighlight = useCallback(
    (element: 'surface' | 'gradient' | 'criticalPoints' | 'axes') => {
      setHighlightedElement(element)
      if (element === 'gradient') setShowGradient(true)
      if (element === 'criticalPoints') setShowCriticalPoints(true)
      setTimeout(() => setHighlightedElement(null), 1800)
    },
    [],
  )

  const formatNum = (n: number, decimals: number = 3): string => {
    return n.toFixed(decimals)
  }

  const isCustomFunction = activeFunction.id !== fn.id
  const surfaceWarning =
    isCustomFunction && surfaceDiagnostics && surfaceDiagnostics.invalidSampleCount > 0
      ? surfaceDiagnostics.invalidSampleCount === surfaceDiagnostics.totalSampleCount
        ? 'Nenhum ponto da malha tem valor real e finito nesta janela.'
        : `${surfaceDiagnostics.invalidSampleCount} amostras sem valor real finito ou fora da faixa gráfica foram omitidas como buracos.`
      : null

  return (
    <main className="prototype-shell">
      <header className="app-header">
        <a className="brand" href="#inicio" aria-label="Integral Visualizer, início">
          <span className="brand-mark" aria-hidden="true">
            ∫V
          </span>
          <span className="brand-name">
            Integral <strong>Visualizer</strong>
          </span>
        </a>
        <div className="header-context" aria-label="Seção atual">
          <span>MATEMÁTICA</span>
          <span className="header-divider">/</span>
          <strong>Superfícies</strong>
        </div>
        <span className="prototype-tag">
          <i /> FASE 1 · CÁLCULO MULTIVARIÁVEL
        </span>
      </header>

      <section className="workspace" id="inicio">
        <aside className="info-panel" aria-label="Painel de controle e matemática">
          <div className="section-kicker">
            <span /> SUPERFÍCIE MATEMÁTICA
          </div>
          <h1>{isCustomFunction ? 'Função personalizada' : 'Seno × cosseno'}</h1>
          <p className="panel-description">
            {isCustomFunction
              ? 'A expressão aplicada é desenhada sobre o domínio cartesiano padrão.'
              : 'Uma função de duas variáveis, explorada em três dimensões.'}
          </p>

          {/* Formula Card com tipografia de livro/papel */}
          <div className="formula-card">
            <span className="card-label">FUNÇÃO EM ESTUDO</span>
            <form className="formula-editor" onSubmit={handleApplyFormula}>
              <label htmlFor="formula-input">Digite uma fórmula para z = f(x, y)</label>
              <div className="formula-input-row">
                <span aria-hidden="true">z =</span>
                <input
                  id="formula-input"
                  name="formula"
                  type="text"
                  value={formulaDraft}
                  onChange={(event) => {
                    setFormulaDraft(event.target.value)
                    setFormulaError(null)
                  }}
                  aria-invalid={formulaError !== null}
                  aria-describedby={formulaError ? 'formula-error' : 'formula-help'}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="x^2 + y^2"
                />
                <button type="submit">Aplicar</button>
              </div>
              <p id="formula-help" className="formula-help">
                Use x e y, operações + − × ÷ ^ e funções da lista matemática.
              </p>
              {formulaError && (
                <p id="formula-error" className="formula-error" role="alert">
                  {formulaError} A superfície anterior foi mantida.
                </p>
              )}
              {isCustomFunction && (
                <button
                  className="restore-example-button"
                  type="button"
                  onClick={handleRestoreExample}
                >
                  Restaurar exemplo
                </button>
              )}
            </form>

            <MathBlock className="formula-main-paper formula-applied">
              <MVar>z</MVar> ={' '}
              {appliedExpression ? (
                <span className="formula-source">{appliedExpression}</span>
              ) : (
                <>
                  <MFn>sin</MFn>(<MVar>x</MVar>) · <MFn>cos</MFn>(<MVar>y</MVar>)
                </>
              )}
            </MathBlock>
            {Object.keys(parameterValues).length > 0 && (
              <div className="parameter-controls" aria-label="Parâmetros da função">
                {Object.entries(parameterValues).map(([name, value]) => (
                  <label
                    className="parameter-control"
                    key={name}
                    htmlFor={`parameter-${name}`}
                  >
                    <span>
                      Parâmetro <MVar>{name}</MVar>
                    </span>
                    <input
                      id={`parameter-${name}`}
                      type="range"
                      min="-3"
                      max="3"
                      step="0.05"
                      value={value}
                      onChange={(event) =>
                        handleParameterChange(name, Number(event.currentTarget.value))
                      }
                      aria-label={`Valor do parâmetro ${name}`}
                    />
                    <output htmlFor={`parameter-${name}`}>{value.toFixed(2)}</output>
                  </label>
                ))}
              </div>
            )}
            <div className="formula-subinfo">
              <span>
                Domínio: <MathText>{activeFunction.domainLabel}</MathText>
              </span>
              <span>
                {isCustomFunction ? 'Escala da cena:' : 'Imagem:'}{' '}
                <MathText>
                  [{formatNum(activeFunction.range.min, 2)},{' '}
                  {formatNum(activeFunction.range.max, 2)}]
                </MathText>
              </span>
            </div>
            {surfaceWarning && (
              <p className="surface-warning" role="status">
                {surfaceWarning}
              </p>
            )}
          </div>

          {/* Layer toggles */}
          <fieldset className="layer-toggles">
            <legend className="card-label">CAMADAS VISUAIS</legend>
            <div className="toggles-grid">
              {activeFunction.criticalPoints.length > 0 && (
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={showCriticalPoints}
                    onChange={(e) => setShowCriticalPoints(e.target.checked)}
                  />
                  <span className="toggle-indicator" />
                  <span className="legend-dot critical-max" />
                  <span>Pontos críticos</span>
                </label>
              )}

              {activeFunction.gradient && (
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={showGradient}
                    onChange={(e) => setShowGradient(e.target.checked)}
                  />
                  <span className="toggle-indicator" />
                  <span className="legend-dot gradient-dot" />
                  <span>Campo do gradiente</span>
                </label>
              )}

              <label className="toggle-option">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                <span className="toggle-indicator" />
                <span className="legend-dot grid-dot" />
                <span>Grade de referência</span>
              </label>

              <label className="toggle-option">
                <input
                  type="checkbox"
                  checked={showAxes}
                  onChange={(e) => setShowAxes(e.target.checked)}
                />
                <span className="toggle-indicator" />
                <span className="legend-dot axes-dot" />
                <span>Eixos cartesianos</span>
              </label>
            </div>
          </fieldset>

          {/* Gradient legend */}
          {showGradient && (
            <div className="gradient-legend">
              <span className="card-label">VETOR GRADIENTE (∇f)</span>
              <p>
                As setas indicam a direção de <strong>subida mais íngreme</strong> na
                superfície tridimensional. O comprimento das setas é padronizado para
                evitar distorções de perspectiva; a <strong>cor</strong> indica a
                intensidade real do gradiente:
              </p>
              <div className="gradient-scale">
                <div className="gradient-bar" />
                <div className="gradient-labels">
                  <span>‖∇f‖ ≈ 0 (Plano)</span>
                  <span>‖∇f‖ ≈ 1 (Máxima subida)</span>
                </div>
              </div>
            </div>
          )}

          {/* Axis explanation */}
          <div className="axis-section">
            <span className="card-label">REFERÊNCIA CARTESIANA · Z PARA CIMA</span>
            <ul className="axis-list">
              {axisLegend.map(({ axis, color, direction }) => (
                <li key={axis}>
                  <span className={`axis-dot ${color}`} />
                  <strong>Eixo {axis}</strong>
                  <span>{direction}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Orbit controls button */}
          <div className="controls-row">
            <button
              className="control-button"
              onClick={() => setAutoRotate((r) => !r)}
              type="button"
              aria-label={
                autoRotate ? 'Pausar rotação automática' : 'Retomar rotação automática'
              }
            >
              <span
                className={autoRotate ? 'pause-icon' : 'play-icon'}
                aria-hidden="true"
              />
              {autoRotate ? 'Pausar rotação' : 'Iniciar rotação'}
            </button>
          </div>

          <p className="interaction-hint">
            Arraste com o mouse para orbitar · Role para zoom · Passe o cursor para
            inspecionar
          </p>
        </aside>

        {/* 3D Scene viewport */}
        <section
          className="scene-panel"
          aria-label="Visualização tridimensional da superfície"
        >
          <div className="scene-topline">
            <span>
              <span className="live-dot" /> GRÁFICO DA SUPERFÍCIE
            </span>
            <span>COORDENADAS CARTESIANAS · RADIANOS</span>
          </div>

          <HelloSurface
            func={activeFunction}
            autoRotate={autoRotate}
            showCriticalPoints={showCriticalPoints}
            showGradient={showGradient}
            showGrid={showGrid}
            showAxes={showAxes}
            highlightedElement={highlightedElement}
            onPointHover={handlePointHover}
            onSurfaceDiagnostics={handleSurfaceDiagnostics}
          />

          <div className="scene-caption">
            <span>
              <MathText>
                {appliedExpression ? (
                  <>
                    <MVar>z</MVar> ={' '}
                    <span className="formula-source">{appliedExpression}</span>
                  </>
                ) : (
                  <>
                    <MVar>f</MVar>(<MVar>x</MVar>, <MVar>y</MVar>) = <MFn>sin</MFn>(
                    <MVar>x</MVar>)<MFn>cos</MFn>(<MVar>y</MVar>)
                  </>
                )}
              </MathText>
            </span>
            <span>{activeFunction.domainLabel}</span>
          </div>

          {/* Point inspector stays anchored inside the scene. */}
          {hoveredPoint && (
            <div className="point-tooltip" role="tooltip" aria-live="polite">
              {hoveredPoint.criticalPoint && (
                <span
                  className={`tooltip-badge ${criticalKindBadge[hoveredPoint.criticalPoint.kind]?.badgeClass ?? ''}`}
                >
                  {criticalKindBadge[hoveredPoint.criticalPoint.kind]?.label}
                </span>
              )}
              <div className="tooltip-coords">
                <span className="tooltip-coord-row">
                  <MVar>x</MVar> = <strong>{formatNum(hoveredPoint.x)}</strong> rad
                </span>
                <span className="tooltip-coord-row">
                  <MVar>y</MVar> = <strong>{formatNum(hoveredPoint.y)}</strong> rad
                </span>
                <span className="tooltip-coord-row">
                  <MVar>z</MVar> = <strong>{formatNum(hoveredPoint.z)}</strong>
                </span>
              </div>
              {hoveredPoint.gradient && (
                <div className="tooltip-gradient">
                  <div className="tooltip-grad-row">
                    <span>
                      ∇<MVar>f</MVar>
                    </span>
                    <span>
                      ({formatNum(hoveredPoint.gradient[0])},{' '}
                      {formatNum(hoveredPoint.gradient[1])})
                    </span>
                  </div>
                  <div className="tooltip-mag-row">
                    <span>
                      ‖∇<MVar>f</MVar>‖
                    </span>
                    <span>{formatNum(hoveredPoint.gradientMagnitude ?? 0)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <aside
          className="analysis-column"
          aria-label="Análise matemática passo a passo"
        >
          <div className="analysis-column-heading">
            <span className="section-kicker">LEITURA MATEMÁTICA</span>
            <h2>Da função à forma</h2>
            <p>Explore a derivação e relacione cada ideia à geometria.</p>
          </div>
          {isCustomFunction ? (
            <div className="analysis-placeholder" role="status">
              <span className="card-label">EXPRESSÃO APLICADA</span>
              <p>
                A superfície representa a fórmula digitada. A análise simbólica e a
                classificação de pontos críticos serão conectadas em etapas posteriores.
              </p>
            </div>
          ) : (
            <MathAnalysisPanel
              func={activeFunction}
              onHighlightElement={handleHighlight}
            />
          )}
        </aside>
      </section>
    </main>
  )
}
