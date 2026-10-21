import { useState } from 'react'
import type { VisualizableFunction } from '../core/functions/types'
import {
  MFn,
  MPartial,
  MSqrt,
  MSub,
  MSup,
  MVar,
  MathAlign,
  MathBlock,
  MathSystem,
  MathText,
} from './MathView'

interface MathAnalysisPanelProps {
  func: VisualizableFunction
  onHighlightElement?: (
    element: 'surface' | 'gradient' | 'criticalPoints' | 'axes',
  ) => void
}

export default function MathAnalysisPanel({
  func,
  onHighlightElement,
}: MathAnalysisPanelProps) {
  const [activeStep, setActiveStep] = useState<number>(0)

  const steps = [
    {
      id: 0,
      title: 'Função e Domínio',
      subtitle: 'Definição analítica e intervalo de exploração',
      target: 'surface' as const,
      render: () => (
        <div className="step-paper">
          <p className="step-prose">
            A superfície tridimensional é o gráfico da função real{' '}
            <MathText>
              <MVar>z</MVar> = <MVar>f</MVar>(<MVar>x</MVar>, <MVar>y</MVar>)
            </MathText>
            :
          </p>
          <MathBlock>
            <MVar>z</MVar> = <MFn>sin</MFn>(<MVar>x</MVar>) · <MFn>cos</MFn>(
            <MVar>y</MVar>)
          </MathBlock>
          <p className="step-prose">
            definida sobre o domínio fechado{' '}
            <MathText>
              <MVar>D</MVar> = [−π, π] × [−π, π]
            </MathText>{' '}
            ({func.domainLabel}):
          </p>
          <MathBlock>
            −π ≤ <MVar>x</MVar> ≤ π, &emsp; −π ≤ <MVar>y</MVar> ≤ π
          </MathBlock>
          <p className="step-prose">
            Como os fatores trigonométricos oscilam entre −1 e 1, a cota vertical{' '}
            <MathText>
              <MVar>z</MVar>
            </MathText>{' '}
            permanece limitada a:
          </p>
          <MathBlock>
            −1 ≤ <MVar>z</MVar> ≤ +1
          </MathBlock>
          <p className="step-note">
            A forma resultante é uma malha ondulada suave de cristas e vales periódicos
            (estrutura conhecida no cálculo como caixa de ovos).
          </p>
        </div>
      ),
    },
    {
      id: 1,
      title: 'Derivadas Parciais',
      subtitle: 'Taxas de variação ao longo das direções x e y',
      target: 'surface' as const,
      render: () => (
        <div className="step-paper">
          <p className="step-prose">
            Ao derivar em relação a{' '}
            <MathText>
              <MVar>x</MVar>
            </MathText>
            , mantemos{' '}
            <MathText>
              <MVar>y</MVar>
            </MathText>{' '}
            constante (a derivada de{' '}
            <MathText>
              <MFn>sin</MFn>(<MVar>x</MVar>)
            </MathText>{' '}
            é{' '}
            <MathText>
              <MFn>cos</MFn>(<MVar>x</MVar>)
            </MathText>
            ):
          </p>
          <MathBlock>
            <MPartial num="f" den="x" /> = <MFn>cos</MFn>(<MVar>x</MVar>) ·{' '}
            <MFn>cos</MFn>(<MVar>y</MVar>)
          </MathBlock>
          <p className="step-prose">
            Ao derivar em relação a{' '}
            <MathText>
              <MVar>y</MVar>
            </MathText>
            , mantemos{' '}
            <MathText>
              <MVar>x</MVar>
            </MathText>{' '}
            constante (a derivada de{' '}
            <MathText>
              <MFn>cos</MFn>(<MVar>y</MVar>)
            </MathText>{' '}
            é{' '}
            <MathText>
              −<MFn>sin</MFn>(<MVar>y</MVar>)
            </MathText>
            ):
          </p>
          <MathBlock>
            <MPartial num="f" den="y" /> = −<MFn>sin</MFn>(<MVar>x</MVar>) ·{' '}
            <MFn>sin</MFn>(<MVar>y</MVar>)
          </MathBlock>
          <p className="step-note">
            Essas duas expressões determinam a inclinação tangencial instantânea do
            terreno em qualquer coordenada.
          </p>
        </div>
      ),
    },
    {
      id: 2,
      title: 'Vetor Gradiente (∇f)',
      subtitle: 'Direção e intensidade da subida mais rápida',
      target: 'gradient' as const,
      render: () => (
        <div className="step-paper">
          <p className="step-prose">O vetor gradiente reúne as derivadas parciais:</p>
          <MathBlock>
            ∇<MVar>f</MVar> = (
            <MPartial num="f" den="x" />, &thinsp;
            <MPartial num="f" den="y" />)
          </MathBlock>
          <MathBlock>
            ∇<MVar>f</MVar> = (<MFn>cos</MFn>(<MVar>x</MVar>)<MFn>cos</MFn>(
            <MVar>y</MVar>), &thinsp;−
            <MFn>sin</MFn>(<MVar>x</MVar>)<MFn>sin</MFn>(<MVar>y</MVar>))
          </MathBlock>
          <p className="step-prose">
            A norma euclidiana mede a intensidade da taxa de subida:
          </p>
          <MathBlock>
            ‖∇<MVar>f</MVar>‖ ={' '}
            <MSqrt>
              <MSub base={<MVar>f</MVar>} sub="x" />
              <sup className="math-sup">2</sup> + <MSub base={<MVar>f</MVar>} sub="y" />
              <sup className="math-sup">2</sup>
            </MSqrt>
          </MathBlock>
          <MathBlock>
            ‖∇<MVar>f</MVar>‖ ={' '}
            <MSqrt>
              <MSup base={<MFn>cos</MFn>} sup="2" />(<MVar>x</MVar>)
              <MSup base={<MFn>cos</MFn>} sup="2" />(<MVar>y</MVar>) +{' '}
              <MSup base={<MFn>sin</MFn>} sup="2" />(<MVar>x</MVar>)
              <MSup base={<MFn>sin</MFn>} sup="2" />(<MVar>y</MVar>)
            </MSqrt>
          </MathBlock>
          <p className="step-note">
            <strong>Sentido geométrico:</strong> O vetor aponta sempre no rumo de maior
            crescimento de{' '}
            <MathText>
              <MVar>f</MVar>
            </MathText>
            . Em cristas, vales e pontos de sela, a taxa se anula e temos{' '}
            <MathText>
              ‖∇<MVar>f</MVar>‖ = 0
            </MathText>
            .
          </p>
        </div>
      ),
    },
    {
      id: 3,
      title: 'Pontos Críticos',
      subtitle: 'Condição de gradiente nulo: ∇f = (0, 0)',
      target: 'criticalPoints' as const,
      render: () => (
        <div className="step-paper">
          <p className="step-prose">
            Os pontos críticos são as raízes simultâneas do sistema:
          </p>
          <MathBlock>
            <MathSystem>
              <span>
                <MFn>cos</MFn>(<MVar>x</MVar>) · <MFn>cos</MFn>(<MVar>y</MVar>) = 0
              </span>
              <span>
                <MFn>sin</MFn>(<MVar>x</MVar>) · <MFn>sin</MFn>(<MVar>y</MVar>) = 0
              </span>
            </MathSystem>
          </MathBlock>
          <p className="step-prose">
            Da 1ª equação,{' '}
            <MathText>
              <MFn>cos</MFn>(<MVar>x</MVar>) = 0
            </MathText>{' '}
            ou{' '}
            <MathText>
              <MFn>cos</MFn>(<MVar>y</MVar>) = 0
            </MathText>
            :
          </p>
          <ul className="step-list">
            <li>
              <strong>
                Família A [
                <MathText>
                  <MFn>cos</MFn>(<MVar>x</MVar>) = 0
                </MathText>
                ]:
              </strong>{' '}
              <MathText>
                <MVar>x</MVar> = ±π/2
              </MathText>
              . Pela 2ª equação, como{' '}
              <MathText>
                <MFn>sin</MFn>(±π/2) ≠ 0
              </MathText>
              , exige{' '}
              <MathText>
                <MFn>sin</MFn>(<MVar>y</MVar>) = 0
              </MathText>{' '}
              ⇒{' '}
              <MathText>
                <MVar>y</MVar> ∈ {`{−π, 0, π}`}
              </MathText>
              .
              <br />
              <span className="step-subtext">
                Fornece 6 extremos com{' '}
                <MathText>
                  <MVar>z</MVar> = ±1
                </MathText>
                .
              </span>
            </li>
            <li>
              <strong>
                Família B [
                <MathText>
                  <MFn>cos</MFn>(<MVar>y</MVar>) = 0
                </MathText>
                ]:
              </strong>{' '}
              <MathText>
                <MVar>y</MVar> = ±π/2
              </MathText>
              . Pela 2ª equação,{' '}
              <MathText>
                <MFn>sin</MFn>(<MVar>x</MVar>) = 0
              </MathText>{' '}
              ⇒{' '}
              <MathText>
                <MVar>x</MVar> ∈ {`{−π, 0, π}`}
              </MathText>
              .
              <br />
              <span className="step-subtext">
                Fornece 6 selas com{' '}
                <MathText>
                  <MVar>z</MVar> = 0
                </MathText>
                .
              </span>
            </li>
          </ul>
          <p className="step-note">
            Totalizam exatamente <strong>12 pontos críticos</strong> no domínio [−π,
            π]².
          </p>
        </div>
      ),
    },
    {
      id: 4,
      title: 'Classificação pela Hessiana',
      subtitle: 'Matriz Hessiana e teste da segunda derivada',
      target: 'criticalPoints' as const,
      render: () => (
        <div className="step-paper">
          <p className="step-prose">Derivadas parciais de segunda ordem:</p>
          <MathBlock>
            <MathAlign
              rows={[
                <>
                  <MSub base={<MVar>f</MVar>} sub="xx" /> = −<MFn>sin</MFn>(
                  <MVar>x</MVar>)<MFn>cos</MFn>(<MVar>y</MVar>) = −<MVar>f</MVar>
                </>,
                <>
                  <MSub base={<MVar>f</MVar>} sub="yy" /> = −<MFn>sin</MFn>(
                  <MVar>x</MVar>)<MFn>cos</MFn>(<MVar>y</MVar>) = −<MVar>f</MVar>
                </>,
                <>
                  <MSub base={<MVar>f</MVar>} sub="xy" /> = −<MFn>cos</MFn>(
                  <MVar>x</MVar>)<MFn>sin</MFn>(<MVar>y</MVar>)
                </>,
              ]}
            />
          </MathBlock>
          <p className="step-prose">
            O discriminante Hessiano{' '}
            <MathText>
              <MVar>D</MVar> = det(<MVar>H</MVar>)
            </MathText>{' '}
            é:
          </p>
          <MathBlock>
            <MVar>D</MVar> = <MSub base={<MVar>f</MVar>} sub="xx" />
            <MSub base={<MVar>f</MVar>} sub="yy" /> − (
            <MSub base={<MVar>f</MVar>} sub="xy" />)<sup className="math-sup">2</sup> ={' '}
            <MSup base={<MVar>f</MVar>} sup="2" /> −{' '}
            <MSup base={<MFn>cos</MFn>} sup="2" />(<MVar>x</MVar>)
            <MSup base={<MFn>sin</MFn>} sup="2" />(<MVar>y</MVar>)
          </MathBlock>
          <div className="classification-card-grid">
            <div className="class-item class-max">
              <span className="class-badge badge-max">Máximo Local (z = 1)</span>
              <p>
                <MathText>
                  <MVar>D</MVar> = 1 &gt; 0
                </MathText>{' '}
                e{' '}
                <MathText>
                  <MSub base={<MVar>f</MVar>} sub="xx" /> = −1 &lt; 0
                </MathText>
              </p>
              <span className="class-coords">(π/2, 0), (−π/2, −π), (−π/2, π)</span>
            </div>
            <div className="class-item class-min">
              <span className="class-badge badge-min">Mínimo Local (z = −1)</span>
              <p>
                <MathText>
                  <MVar>D</MVar> = 1 &gt; 0
                </MathText>{' '}
                e{' '}
                <MathText>
                  <MSub base={<MVar>f</MVar>} sub="xx" /> = +1 &gt; 0
                </MathText>
              </p>
              <span className="class-coords">(−π/2, 0), (π/2, −π), (π/2, π)</span>
            </div>
            <div className="class-item class-saddle">
              <span className="class-badge badge-saddle">Ponto de Sela (z = 0)</span>
              <p>
                <MathText>
                  <MVar>D</MVar> = −1 &lt; 0
                </MathText>{' '}
                (curvaturas principais opostas)
              </p>
              <span className="class-coords">
                <MVar>x</MVar> ∈ {`{−π, 0, π}`}, <MVar>y</MVar> ∈ {`{−π/2, π/2}`}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      title: 'Curvatura e Equação de Helmholtz',
      subtitle: 'Relação harmônica intrínseca da superfície',
      target: 'surface' as const,
      render: () => (
        <div className="step-paper">
          <p className="step-prose">
            O operador Laplaciano{' '}
            <MathText>
              Δ<MVar>f</MVar> = ∇²<MVar>f</MVar>
            </MathText>{' '}
            soma as derivadas segundas retilíneas:
          </p>
          <MathBlock>
            Δ<MVar>f</MVar> = <MPartial num="f" den="x" order={2} /> +{' '}
            <MPartial num="f" den="y" order={2} /> = −2<MVar>f</MVar>
          </MathBlock>
          <p className="step-prose">
            Reorganizando, obtemos a célebre equação diferencial de Helmholtz:
          </p>
          <MathBlock>
            Δ<MVar>f</MVar> + 2<MVar>f</MVar> = 0
          </MathBlock>
          <p className="step-note">
            Isso demonstra que a superfície é uma autofunção do Laplaciano com autovalor{' '}
            <MathText>λ = −2</MathText>, o que formaliza a sua harmonia e perfeita
            regularidade em todo o espaço tridimensional.
          </p>
        </div>
      ),
    },
  ]

  return (
    <section className="math-analysis-wrapper" aria-labelledby="analysis-heading">
      <div className="analysis-header-row">
        <span className="card-label" id="analysis-heading">
          ANÁLISE MATEMÁTICA PASSO A PASSO
        </span>
        <span className="step-counter">
          Passo {activeStep + 1} de {steps.length}
        </span>
      </div>

      {/* Tabs navigation */}
      <div
        className="step-tabs-container"
        role="tablist"
        aria-label="Passos da demonstração"
      >
        {steps.map((st, idx) => (
          <button
            key={st.id}
            role="tab"
            aria-selected={activeStep === idx}
            aria-controls={`step-panel-${idx}`}
            id={`step-tab-${idx}`}
            className={`step-tab-button ${activeStep === idx ? 'active' : ''}`}
            onClick={() => {
              setActiveStep(idx)
              onHighlightElement?.(st.target)
            }}
            type="button"
          >
            <span className="step-tab-num">{idx + 1}</span>
            <span className="step-tab-text">{st.title}</span>
          </button>
        ))}
      </div>

      {/* Active step presentation */}
      <div
        id={`step-panel-${activeStep}`}
        role="tabpanel"
        aria-labelledby={`step-tab-${activeStep}`}
        className="active-step-panel"
      >
        <div className="step-panel-title-row">
          <div>
            <h3 className="step-panel-title">{steps[activeStep]?.title}</h3>
            <p className="step-panel-subtitle">{steps[activeStep]?.subtitle}</p>
          </div>
          {onHighlightElement && steps[activeStep]?.target && (
            <button
              className="step-focus-button"
              type="button"
              onClick={() => onHighlightElement(steps[activeStep]!.target)}
              title="Destacar elementos deste passo na cena 3D"
            >
              Focar na cena
            </button>
          )}
        </div>

        {/* Math paper content */}
        {steps[activeStep]?.render()}

        {/* Step pager footer */}
        <div className="step-pager">
          <button
            className="pager-btn"
            disabled={activeStep === 0}
            onClick={() => {
              const next = activeStep - 1
              setActiveStep(next)
              onHighlightElement?.(steps[next]!.target)
            }}
            type="button"
          >
            ← Anterior
          </button>
          <div className="pager-dots">
            {steps.map((_, i) => (
              <button
                key={i}
                aria-current={i === activeStep ? 'step' : undefined}
                aria-label={`Ir para a etapa ${i + 1}: ${steps[i]?.title}`}
                className={`pager-dot ${i === activeStep ? 'active' : ''}`}
                onClick={() => {
                  setActiveStep(i)
                  onHighlightElement?.(steps[i]!.target)
                }}
                type="button"
              />
            ))}
          </div>
          <button
            className="pager-btn"
            disabled={activeStep === steps.length - 1}
            onClick={() => {
              const next = activeStep + 1
              setActiveStep(next)
              onHighlightElement?.(steps[next]!.target)
            }}
            type="button"
          >
            Próximo →
          </button>
        </div>
      </div>
    </section>
  )
}
