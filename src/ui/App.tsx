import { useState, useCallback } from 'react'
import HelloSurface from '../render/HelloSurface'
import type { PointInfo } from '../render/HelloSurface'
import { sinCosFunction } from '../core/functions'
import MathAnalysisPanel from './MathAnalysisPanel'
import { MathText, MFn, MVar, MathBlock } from './MathView'

const fn = sinCosFunction

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
          <h1>Seno × cosseno</h1>
          <p className="panel-description">
            Uma função de duas variáveis, explorada em três dimensões.
          </p>

          {/* Formula Card com tipografia de livro/papel */}
          <div className="formula-card">
            <span className="card-label">FUNÇÃO EM ESTUDO</span>
            <MathBlock className="formula-main-paper">
              <MVar>z</MVar> = <MFn>sin</MFn>(<MVar>x</MVar>) · <MFn>cos</MFn>(
              <MVar>y</MVar>)
            </MathBlock>
            <div className="formula-subinfo">
              <span>
                Domínio:{' '}
                <MathText>
                  −π ≤ <MVar>x</MVar>, <MVar>y</MVar> ≤ π
                </MathText>
              </span>
              <span>
                Imagem: <MathText>[−1, +1]</MathText>
              </span>
            </div>
          </div>

          {/* Layer toggles */}
          <fieldset className="layer-toggles">
            <legend className="card-label">CAMADAS VISUAIS</legend>
            <div className="toggles-grid">
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
            func={fn}
            autoRotate={autoRotate}
            showCriticalPoints={showCriticalPoints}
            showGradient={showGradient}
            showGrid={showGrid}
            showAxes={showAxes}
            highlightedElement={highlightedElement}
            onPointHover={handlePointHover}
          />

          <div className="scene-caption">
            <span>
              <MathText>
                <MVar>f</MVar>(<MVar>x</MVar>, <MVar>y</MVar>) = <MFn>sin</MFn>(
                <MVar>x</MVar>)<MFn>cos</MFn>(<MVar>y</MVar>)
              </MathText>
            </span>
            <span>{fn.domainLabel}</span>
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
          <MathAnalysisPanel func={fn} onHighlightElement={handleHighlight} />
        </aside>
      </section>
    </main>
  )
}
