import { useState, useCallback, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import * as Comlink from 'comlink'
import HelloSurface from '../render/HelloSurface'
import type { PointInfo, SurfaceDiagnostics } from '../render/HelloSurface'
import {
  createExpressionFunction,
  getExpressionParameters,
  sinCosFunction,
} from '../core/functions'
import type { VisualizableFunction } from '../core/functions'
import type { SurfaceGrid } from '../render/surfaceGrid'
import { SURFACE_SEGMENTS } from '../render/surfaceGrid'
import type {
  SurfaceCalculationRequest,
  SurfaceCalculationResult,
  SurfaceWorkerApi,
} from '../workers/surfaceCalculation'
import {
  getAnimatedParameterValue,
  PARAMETER_SLIDER_MAX,
  PARAMETER_SLIDER_MIN,
  PARAMETER_SLIDER_STEP,
} from './parameterAnimation'
import MathAnalysisPanel from './MathAnalysisPanel'
import { MathText, MFn, MVar, MathBlock } from './MathView'

const fn = sinCosFunction
const DEFAULT_EXPRESSION = 'sin(x)*cos(y)'
const DEFAULT_DOMAIN_DRAFT = {
  xMin: String(-Math.PI),
  xMax: String(Math.PI),
  yMin: String(-Math.PI),
  yMax: String(Math.PI),
}
const CALCULATOR_KEYS = [
  { label: 'sen(', token: 'sen(' },
  { label: 'cos(', token: 'cos(' },
  { label: 'tan(', token: 'tan(' },
  { label: '√(', token: 'sqrt(' },
  { label: 'asin(', token: 'asin(' },
  { label: 'acos(', token: 'acos(' },
  { label: 'atan(', token: 'atan(' },
  { label: 'atan2(', token: 'atan2(' },
  { label: 'sinh(', token: 'sinh(' },
  { label: 'cosh(', token: 'cosh(' },
  { label: 'tanh(', token: 'tanh(' },
  { label: 'exp(', token: 'exp(' },
  { label: 'tg(', token: 'tg(' },
  { label: 'abs(', token: 'abs(' },
  { label: 'log(', token: 'log(' },
  { label: 'ln(', token: 'ln(' },
  { label: 'min(', token: 'min(' },
  { label: 'max(', token: 'max(' },
  { label: 'pow(', token: 'pow(' },
  { label: 'floor(', token: 'floor(' },
  { label: 'π', token: 'pi' },
  { label: 'e', token: 'e' },
  { label: 'x', token: 'x' },
  { label: 'y', token: 'y' },
  { label: '(', token: '(' },
  { label: ')', token: ')' },
  { label: ',', token: ',' },
  { label: '^', token: '^' },
  { label: '÷', token: '/' },
  { label: '7', token: '7' },
  { label: '8', token: '8' },
  { label: '9', token: '9' },
  { label: '×', token: '*' },
  { label: '4', token: '4' },
  { label: '5', token: '5' },
  { label: '6', token: '6' },
  { label: '−', token: '-' },
  { label: '1', token: '1' },
  { label: '2', token: '2' },
  { label: '3', token: '3' },
  { label: '+', token: '+' },
  { label: '0', token: '0' },
  { label: '.', token: '.' },
  { label: '⌫', token: 'backspace' },
  { label: 'C', token: 'clear' },
]

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
  const [parameterAnimation, setParameterAnimation] = useState<{
    name: string
    startValue: number
  } | null>(null)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [formulaDraft, setFormulaDraft] = useState(DEFAULT_EXPRESSION)
  const [domainDraft, setDomainDraft] = useState(DEFAULT_DOMAIN_DRAFT)
  const [appliedExpression, setAppliedExpression] = useState<string | null>(null)
  const [formulaError, setFormulaError] = useState<string | null>(null)
  const [workerReady, setWorkerReady] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [calculatedGrid, setCalculatedGrid] = useState<SurfaceGrid | null>(null)
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
  const formulaInputRef = useRef<HTMLInputElement>(null)
  const parameterValuesRef = useRef(parameterValues)
  const activeFunctionRef = useRef(activeFunction)
  const workerRef = useRef<Comlink.Remote<SurfaceWorkerApi> | null>(null)
  const activeJobIdRef = useRef(0)
  const nextJobIdRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRequestRef = useRef<
    Map<
      number,
      {
        expression: string
        parameters: Record<string, number>
        domain: VisualizableFunction['domain']
        apply: boolean
        restoreExample: boolean
      }
    >
  >(new Map())

  const requestSurfaceCalculation = useCallback(
    (
      expression: string,
      parameters: Record<string, number>,
      domain: VisualizableFunction['domain'],
      apply: boolean,
      debounceMs = 180,
      restoreExample = false,
    ) => {
      const worker = workerRef.current
      if (!worker) {
        setFormulaError(
          'O calculador em segundo plano ainda está iniciando. Tente novamente em instantes.',
        )
        return
      }

      if (debounceRef.current) clearTimeout(debounceRef.current)
      const previousJobId = activeJobIdRef.current
      if (previousJobId) void worker.cancel(previousJobId)
      const jobId = ++nextJobIdRef.current
      activeJobIdRef.current = jobId
      pendingRequestRef.current.clear()
      pendingRequestRef.current.set(jobId, {
        expression,
        parameters,
        domain,
        apply,
        restoreExample,
      })
      setCalculating(true)
      setFormulaError(null)

      const request: SurfaceCalculationRequest = {
        jobId,
        expression,
        parameters,
        domain,
        segments: SURFACE_SEGMENTS,
      }
      debounceRef.current = setTimeout(() => {
        void worker.calculate(request).then(
          (result: SurfaceCalculationResult | null) => {
            if (!result || result.jobId !== activeJobIdRef.current) return
            const pending = pendingRequestRef.current.get(result.jobId)
            if (!pending) return
            pendingRequestRef.current.delete(result.jobId)
            setCalculatedGrid(result.grid)
            setCalculating(false)
            if (pending.apply) {
              const nextFunction = createExpressionFunction(
                pending.expression,
                pending.parameters,
                pending.domain,
                result.range,
              )
              setActiveFunction(pending.restoreExample ? fn : nextFunction)
              setParameterValues(pending.restoreExample ? {} : pending.parameters)
              parameterValuesRef.current = pending.restoreExample
                ? {}
                : pending.parameters
              activeFunctionRef.current = pending.restoreExample ? fn : nextFunction
              setFormulaDraft(nextFunction.formulaPlain.replace(/^z =\s*/, ''))
              setAppliedExpression(
                pending.restoreExample ? null : pending.expression.trim(),
              )
              setSurfaceDiagnostics(null)
              setShowCriticalPoints(pending.restoreExample)
              setShowGradient(false)
              setHoveredPoint(null)
            }
          },
          (error: unknown) => {
            if (jobId !== activeJobIdRef.current) return
            pendingRequestRef.current.delete(jobId)
            setCalculating(false)
            setParameterAnimation(null)
            setFormulaError(
              error instanceof Error
                ? error.message
                : 'Não foi possível calcular esta superfície.',
            )
          },
        )
      }, debounceMs)
      return jobId
    },
    [],
  )

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/surface.worker.ts', import.meta.url),
      {
        type: 'module',
      },
    )
    const api = Comlink.wrap<SurfaceWorkerApi>(worker)
    workerRef.current = api
    void api.ready().then(() => setWorkerReady(true))
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const activeJobId = activeJobIdRef.current
      if (activeJobId) void api.cancel(activeJobId)
      void api[Comlink.releaseProxy]()
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!workerReady || calculatedGrid) return
    requestSurfaceCalculation(
      DEFAULT_EXPRESSION,
      {},
      {
        x: { min: -Math.PI, max: Math.PI },
        y: { min: -Math.PI, max: Math.PI },
      },
      false,
      0,
    )
  }, [workerReady, calculatedGrid, requestSurfaceCalculation])

  useEffect(() => {
    if (!parameterAnimation || !appliedExpression) return

    const startedAt = performance.now()
    let lastSubmittedAt = Number.NEGATIVE_INFINITY
    let animationFrame = 0
    const tick = (now: number) => {
      if (now - lastSubmittedAt >= 120) {
        const value = getAnimatedParameterValue(
          parameterAnimation.startValue,
          now - startedAt,
          animationSpeed,
        )
        const nextValues = {
          ...parameterValuesRef.current,
          [parameterAnimation.name]: value,
        }
        parameterValuesRef.current = nextValues
        setParameterValues(nextValues)
        requestSurfaceCalculation(
          appliedExpression,
          nextValues,
          activeFunctionRef.current.domain,
          true,
          0,
        )
        lastSubmittedAt = now
      }
      animationFrame = requestAnimationFrame(tick)
    }

    animationFrame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrame)
  }, [parameterAnimation, animationSpeed, appliedExpression, requestSurfaceCalculation])

  const handlePointHover = useCallback((info: PointInfo | null) => {
    setHoveredPoint(info)
  }, [])

  const handleSurfaceDiagnostics = useCallback((diagnostics: SurfaceDiagnostics) => {
    setSurfaceDiagnostics(diagnostics)
  }, [])

  const handleApplyFormula = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setParameterAnimation(null)
    try {
      const domain = {
        x: {
          min: Number.parseFloat(domainDraft.xMin),
          max: Number.parseFloat(domainDraft.xMax),
        },
        y: {
          min: Number.parseFloat(domainDraft.yMin),
          max: Number.parseFloat(domainDraft.yMax),
        },
      }
      const parameters = getExpressionParameters(formulaDraft)
      const nextParameterValues = Object.fromEntries(
        parameters.map((name) => [name, 1]),
      )
      requestSurfaceCalculation(formulaDraft, nextParameterValues, domain, true)
    } catch (error) {
      setFormulaError(
        error instanceof Error
          ? error.message
          : 'Não foi possível aplicar essa expressão matemática.',
      )
    }
  }

  const handleRestoreExample = () => {
    setParameterAnimation(null)
    setFormulaDraft(DEFAULT_EXPRESSION)
    setDomainDraft(DEFAULT_DOMAIN_DRAFT)
    setFormulaError(null)
    setSurfaceDiagnostics(null)
    setShowCriticalPoints(true)
    setShowGradient(false)
    setHoveredPoint(null)
    requestSurfaceCalculation(
      DEFAULT_EXPRESSION,
      {},
      {
        x: { min: -Math.PI, max: Math.PI },
        y: { min: -Math.PI, max: Math.PI },
      },
      true,
      180,
      true,
    )
  }

  const handleParameterChange = (name: string, value: number) => {
    if (parameterAnimation?.name === name) setParameterAnimation(null)
    const nextValues = { ...parameterValuesRef.current, [name]: value }
    parameterValuesRef.current = nextValues
    setParameterValues(nextValues)
    if (appliedExpression) {
      requestSurfaceCalculation(
        appliedExpression,
        nextValues,
        activeFunction.domain,
        true,
        120,
      )
    }
  }

  const insertCalculatorToken = (token: string) => {
    const input = formulaInputRef.current
    const start = input?.selectionStart ?? formulaDraft.length
    const end = input?.selectionEnd ?? formulaDraft.length
    let inserted = token
    let nextDraft: string
    let cursor = start

    if (token === 'clear') {
      nextDraft = ''
      inserted = ''
    } else if (token === 'backspace') {
      const from = start === end ? Math.max(0, start - 1) : start
      nextDraft = formulaDraft.slice(0, from) + formulaDraft.slice(end)
      inserted = ''
      cursor = from
    } else {
      nextDraft = formulaDraft.slice(0, start) + token + formulaDraft.slice(end)
    }

    setFormulaDraft(nextDraft)
    setFormulaError(null)
    if (token !== 'backspace') cursor = start + inserted.length
    requestAnimationFrame(() => {
      formulaInputRef.current?.focus()
      formulaInputRef.current?.setSelectionRange(cursor, cursor)
    })
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
              ? 'A expressão aplicada é desenhada sobre o domínio configurado.'
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
                  ref={formulaInputRef}
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
                Escreva a função ou use o teclado científico. Trigonometria em radianos.
              </p>
              <p className="formula-help" role="status" aria-live="polite">
                {!workerReady
                  ? 'Iniciando calculador em segundo plano…'
                  : parameterAnimation
                    ? 'Animação ativa; malha atualizada em segundo plano.'
                    : calculating
                      ? 'Calculando a superfície em segundo plano…'
                      : 'Cálculos da malha executados em Web Worker.'}
              </p>
              <div
                className="scientific-calculator"
                aria-label="Teclado de calculadora científica"
              >
                {CALCULATOR_KEYS.map(({ label, token }) => (
                  <button
                    className={
                      ['clear', 'backspace'].includes(token) ? 'key utility-key' : 'key'
                    }
                    key={`${label}-${token}`}
                    type="button"
                    aria-label={
                      token === 'backspace'
                        ? 'Apagar caractere'
                        : token === 'clear'
                          ? 'Limpar fórmula'
                          : `Inserir ${label}`
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertCalculatorToken(token)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <fieldset className="domain-controls">
                <legend>Domínio de exploração</legend>
                <label>
                  x mínimo
                  <input
                    type="number"
                    step="any"
                    value={domainDraft.xMin}
                    onChange={(event) =>
                      setDomainDraft({ ...domainDraft, xMin: event.target.value })
                    }
                  />
                </label>
                <label>
                  x máximo
                  <input
                    type="number"
                    step="any"
                    value={domainDraft.xMax}
                    onChange={(event) =>
                      setDomainDraft({ ...domainDraft, xMax: event.target.value })
                    }
                  />
                </label>
                <label>
                  y mínimo
                  <input
                    type="number"
                    step="any"
                    value={domainDraft.yMin}
                    onChange={(event) =>
                      setDomainDraft({ ...domainDraft, yMin: event.target.value })
                    }
                  />
                </label>
                <label>
                  y máximo
                  <input
                    type="number"
                    step="any"
                    value={domainDraft.yMax}
                    onChange={(event) =>
                      setDomainDraft({ ...domainDraft, yMax: event.target.value })
                    }
                  />
                </label>
                <small>
                  Limites finitos, com inferior menor que superior (|limite| ≤ 10.000).
                </small>
              </fieldset>
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
                <div className="parameter-controls-heading">
                  <span>PARÂMETROS LIVRES</span>
                  {parameterAnimation && (
                    <span className="parameter-animation-status" role="status">
                      Animando {parameterAnimation.name}
                    </span>
                  )}
                </div>
                {Object.entries(parameterValues).map(([name, value]) => {
                  const isAnimating = parameterAnimation?.name === name
                  return (
                    <div className="parameter-control" key={name}>
                      <label htmlFor={`parameter-${name}`}>
                        Parâmetro <MVar>{name}</MVar>
                      </label>
                      <input
                        id={`parameter-${name}`}
                        type="range"
                        min={PARAMETER_SLIDER_MIN}
                        max={PARAMETER_SLIDER_MAX}
                        step={PARAMETER_SLIDER_STEP}
                        value={value}
                        onChange={(event) =>
                          handleParameterChange(name, Number(event.currentTarget.value))
                        }
                        aria-label={`Valor do parâmetro ${name}`}
                        aria-valuetext={`${value.toFixed(2)}; intervalo de ${PARAMETER_SLIDER_MIN} a ${PARAMETER_SLIDER_MAX}`}
                      />
                      <output htmlFor={`parameter-${name}`}>{value.toFixed(2)}</output>
                      <button
                        className="parameter-animation-button"
                        type="button"
                        aria-pressed={isAnimating}
                        onClick={() =>
                          setParameterAnimation(
                            isAnimating
                              ? null
                              : {
                                  name,
                                  startValue: parameterValuesRef.current[name] ?? value,
                                },
                          )
                        }
                      >
                        {isAnimating ? 'Pausar' : 'Animar'}
                      </button>
                    </div>
                  )
                })}
                <label className="parameter-animation-speed" htmlFor="animation-speed">
                  <span>Velocidade</span>
                  <input
                    id="animation-speed"
                    type="range"
                    min="0.25"
                    max="2"
                    step="0.25"
                    value={animationSpeed}
                    onChange={(event) => {
                      const nextSpeed = Number(event.currentTarget.value)
                      setAnimationSpeed(nextSpeed)
                      setParameterAnimation((current) =>
                        current
                          ? {
                              name: current.name,
                              startValue:
                                parameterValuesRef.current[current.name] ??
                                current.startValue,
                            }
                          : null,
                      )
                    }}
                    aria-label="Velocidade da animação do parâmetro"
                  />
                  <output htmlFor="animation-speed">
                    {animationSpeed.toFixed(2)}×
                  </output>
                </label>
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
            calculatedGrid={calculatedGrid}
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
                <strong>1. Defina:</strong> z = f(x, y) sobre o domínio informado.
                <br />
                <strong>2. Avalie:</strong> no centro do domínio, x ={' '}
                {formatNum(
                  (activeFunction.domain.x.min + activeFunction.domain.x.max) / 2,
                )}{' '}
                e y ={' '}
                {formatNum(
                  (activeFunction.domain.y.min + activeFunction.domain.y.max) / 2,
                )}
                , a altura é z ={' '}
                {Number.isFinite(
                  activeFunction.evaluate(
                    (activeFunction.domain.x.min + activeFunction.domain.x.max) / 2,
                    (activeFunction.domain.y.min + activeFunction.domain.y.max) / 2,
                  ),
                )
                  ? formatNum(
                      activeFunction.evaluate(
                        (activeFunction.domain.x.min + activeFunction.domain.x.max) / 2,
                        (activeFunction.domain.y.min + activeFunction.domain.y.max) / 2,
                      ),
                    )
                  : 'sem valor real finito'}
                .
                <br />
                <strong>3. Construa:</strong> a cena avalia a função em cada vértice da
                malha e liga pontos vizinhos válidos; pontos sem valor real ficam como
                buracos.
                <br />
                Derivadas simbólicas, gradiente e integrais serão acrescentados nos
                módulos de cálculo correspondentes.
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
