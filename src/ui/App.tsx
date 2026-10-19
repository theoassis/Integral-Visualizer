import { useState } from 'react'
import HelloSurface from '../render/HelloSurface'

const axisLegend = [
  { axis: 'x', color: 'axis-x', direction: 'direita' },
  { axis: 'y', color: 'axis-y', direction: 'fundo' },
  { axis: 'z', color: 'axis-z', direction: 'cima' },
]

export default function App() {
  const [autoRotate, setAutoRotate] = useState(true)
  const [showDetails, setShowDetails] = useState(true)
  const [showCriticalPoints, setShowCriticalPoints] = useState(true)
  const [showGradient, setShowGradient] = useState(false)

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
        <span className="prototype-tag">
          Fase 0 <i /> Protótipo 3D
        </span>
      </header>

      <section className="workspace" id="inicio">
        <aside className="info-panel">
          <div className="section-kicker">
            <span /> SUPERFÍCIE DE EXEMPLO
          </div>
          <h1>Olá, superfície.</h1>
          <p className="panel-description">
            Uma primeira forma para explorar o espaço tridimensional do IV.
          </p>

          <div className="formula-card">
            <span className="card-label">FUNÇÃO</span>
            <p className="formula">z = sin(x) · cos(y)</p>
            <p className="domain">−π ≤ x, y ≤ π</p>
          </div>

          <div className="axis-section">
            <span className="card-label">EIXOS · Z PARA CIMA</span>
            <ul className="axis-list">
              {axisLegend.map(({ axis, color, direction }) => (
                <li key={axis}>
                  <span className={`axis-dot ${color}`} />
                  <strong>{axis}</strong>
                  <span>{direction}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="range-note">
            <span className="range-symbol">−1</span>
            <div>
              <strong>Altura entre −1 e 1</strong>
              <p>Os picos e vales seguem a função.</p>
            </div>
            <span className="range-symbol">+1</span>
          </div>

          <section className="math-analysis" aria-labelledby="analysis-title">
            <div className="analysis-heading">
              <span className="card-label" id="analysis-title">
                ANÁLISE MATEMÁTICA
              </span>
              <button
                className="details-toggle"
                aria-expanded={showDetails}
                aria-controls="math-details"
                onClick={() => setShowDetails((visible) => !visible)}
                type="button"
              >
                {showDetails ? 'Ocultar detalhes' : 'Mostrar detalhes'}
              </button>
            </div>

            {showDetails && (
              <div className="math-details" id="math-details">
                <label className="detail-option">
                  <input
                    checked={showCriticalPoints}
                    onChange={(event) => setShowCriticalPoints(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="legend-dot critical-max" />
                  <span>Pontos críticos</span>
                </label>
                <label className="detail-option">
                  <input
                    checked={showGradient}
                    onChange={(event) => setShowGradient(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="legend-dot gradient-dot" />
                  <span>Campo do gradiente</span>
                </label>

                {showCriticalPoints && (
                  <div className="critical-summary">
                    <p>
                      <span className="legend-dot critical-max" />
                      Máximos globais: <code>f = 1</code>
                    </p>
                    <p className="coordinates">(π/2, 0), (−π/2, ±π)</p>
                    <p>
                      <span className="legend-dot critical-min" />
                      Mínimos globais: <code>f = −1</code>
                    </p>
                    <p className="coordinates">(−π/2, 0), (π/2, ±π)</p>
                    <p>
                      <span className="legend-dot critical-saddle" />
                      Selas: <code>f = 0</code>
                    </p>
                    <p className="coordinates">
                      x ∈ {'{−π, 0, π}'}, y ∈ {'{−π/2, π/2}'}
                    </p>
                  </div>
                )}

                <div className="derivative-summary">
                  <p>
                    <strong>Gradiente</strong> ∇f = (cos x cos y, −sin x sin y)
                  </p>
                  <p>
                    Setas indicam a subida; o comprimento acompanha |∇f|. O gradiente
                    zera nos pontos críticos.
                  </p>
                  <p>
                    <strong>Hessiana</strong> D = f² − cos²x sin²y; vale 1 nos extremos
                    e −1 nas selas.
                  </p>
                  <p>
                    <strong>Curvatura</strong> f<sub>xx</sub> = f<sub>yy</sub> = −f; Δf
                    + 2f = 0
                  </p>
                </div>
              </div>
            )}
          </section>

          <button
            className="rotate-button"
            onClick={() => setAutoRotate((rotating) => !rotating)}
            type="button"
          >
            <span
              className={autoRotate ? 'pause-icon' : 'play-icon'}
              aria-hidden="true"
            />
            {autoRotate ? 'Pausar rotação' : 'Retomar rotação'}
          </button>

          <p className="interaction-hint">Arraste para orbitar · role para aproximar</p>
        </aside>

        <section className="scene-panel" aria-label="Visualização da superfície">
          <div className="scene-topline">
            <span>
              <span className="live-dot" /> VISUALIZAÇÃO INTERATIVA
            </span>
            <span>THREE.JS</span>
          </div>
          <HelloSurface
            autoRotate={autoRotate}
            showCriticalPoints={showDetails && showCriticalPoints}
            showGradient={showDetails && showGradient}
          />
          <div className="scene-caption">
            <span>f(x,y) = sin(x) · cos(y)</span>
            <span>DOMÍNIO QUADRADO</span>
          </div>
        </section>
      </section>
    </main>
  )
}
