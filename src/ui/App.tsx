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
import { SURFACE_COLOR_MAPS, type SurfaceColorMap } from '../render/colorMaps'
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
import { parseDomainBound } from './domainBound'

const fn = sinCosFunction
const DEFAULT_EXPRESSION = 'sin(x)*cos(y)'
const DEFAULT_DOMAIN_DRAFT = {
  xMin: '-pi',
  xMax: 'pi',
  yMin: '-pi',
  yMax: 'pi',
}
type DomainField = keyof typeof DEFAULT_DOMAIN_DRAFT
type CalculatorTab = '123' | 'f(x)' | 'ABC'
type CalculatorKey = {
  label: string
  token: string
  kind?:
    'template' | 'utility' | 'operation' | 'navigation' | 'navigation-start' | 'submit'
  cursorOffset?: number
}
const CALCULATOR_TABS: CalculatorTab[] = ['123', 'f(x)', 'ABC']
const CALCULATOR_KEYS: Record<CalculatorTab, CalculatorKey[]> = {
  '123': [
    { label: 'x', token: 'x' },
    { label: 'y', token: 'y' },
    { label: 'π', token: 'pi' },
    { label: 'e', token: 'e' },
    { label: '(', token: '(' },
    { label: ')', token: ')' },
    { label: 'x²', token: '^2', kind: 'template' },
    { label: 'xʸ', token: '^()', kind: 'template', cursorOffset: 2 },
    { label: '√', token: 'sqrt()', kind: 'template', cursorOffset: 5 },
    { label: '|x|', token: 'abs()', kind: 'template', cursorOffset: 4 },
    { label: ',', token: ',' },
    { label: '.', token: '.' },
    { label: '7', token: '7' },
    { label: '8', token: '8' },
    { label: '9', token: '9' },
    { label: '÷', token: '/', kind: 'operation' },
    { label: '×', token: '*', kind: 'operation' },
    { label: '−', token: '-', kind: 'operation' },
    { label: '4', token: '4' },
    { label: '5', token: '5' },
    { label: '6', token: '6' },
    { label: '+', token: '+', kind: 'operation' },
    { label: 'C', token: 'clear', kind: 'utility' },
    { label: '⌫', token: 'backspace', kind: 'utility' },
    { label: '1', token: '1' },
    { label: '2', token: '2' },
    { label: '3', token: '3' },
    { label: '0', token: '0' },
    { label: '←', token: 'left', kind: 'navigation-start' },
    { label: '→', token: 'right', kind: 'navigation' },
    { label: 'Aplicar ↵', token: 'enter', kind: 'submit' },
  ],
  'f(x)': [
    { label: 'sen', token: 'sin()', kind: 'template', cursorOffset: 4 },
    { label: 'cos', token: 'cos()', kind: 'template', cursorOffset: 4 },
    { label: 'tan', token: 'tan()', kind: 'template', cursorOffset: 4 },
    { label: 'senh', token: 'sinh()', kind: 'template', cursorOffset: 5 },
    { label: 'cosh', token: 'cosh()', kind: 'template', cursorOffset: 5 },
    { label: 'tanh', token: 'tanh()', kind: 'template', cursorOffset: 5 },
    { label: '√', token: 'sqrt()', kind: 'template', cursorOffset: 5 },
    { label: '|x|', token: 'abs()', kind: 'template', cursorOffset: 4 },
    { label: 'sen⁻¹', token: 'asin()', kind: 'template', cursorOffset: 5 },
    { label: 'cos⁻¹', token: 'acos()', kind: 'template', cursorOffset: 5 },
    { label: 'tan⁻¹', token: 'atan()', kind: 'template', cursorOffset: 5 },
    { label: 'ln', token: 'ln()', kind: 'template', cursorOffset: 3 },
    { label: 'log', token: 'log()', kind: 'template', cursorOffset: 4 },
    { label: 'exp', token: 'exp()', kind: 'template', cursorOffset: 4 },
    { label: 'min', token: 'min(,)', kind: 'template', cursorOffset: 4 },
    { label: 'max', token: 'max(,)', kind: 'template', cursorOffset: 4 },
    { label: 'pow', token: 'pow(,)', kind: 'template', cursorOffset: 4 },
    { label: 'atan2', token: 'atan2(,)', kind: 'template', cursorOffset: 6 },
    { label: 'floor', token: 'floor()', kind: 'template', cursorOffset: 6 },
    { label: '⌫', token: 'backspace', kind: 'utility' },
    { label: 'C', token: 'clear', kind: 'utility' },
  ],
  ABC: 'abcdefghijklmnopqrstuvwxyz'
    .split('')
    .map((letter) => ({ label: letter, token: letter })),
}
/*
 * Keyboard tokens deliberately match the safe expression parser's whitelist.
 * Differential and integral operators belong to their dedicated tools; placing
 * them in this surface-function editor would suggest unsupported syntax.
 */
const DOMAIN_PRESETS = [
  { label: '−π', value: '-pi' },
  { label: '−π/2', value: '-pi/2' },
  { label: '0', value: '0' },
  { label: 'π/2', value: 'pi/2' },
  { label: 'π', value: 'pi' },
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
  const [formulaEditing, setFormulaEditing] = useState(false)
  const [calculatorTab, setCalculatorTab] = useState<CalculatorTab>('123')
  const [domainDraft, setDomainDraft] = useState(DEFAULT_DOMAIN_DRAFT)
  const [domainField, setDomainField] = useState<DomainField>('xMin')
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
  const [colorMap, setColorMap] = useState<SurfaceColorMap>('atlas')
  const [highlightedElement, setHighlightedElement] = useState<
    'surface' | 'gradient' | 'criticalPoints' | 'axes' | null
  >(null)
  const [selectedPoint, setSelectedPoint] = useState<PointInfo | null>(null)
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
              setFormulaEditing(false)
              setSurfaceDiagnostics(null)
              setShowCriticalPoints(pending.restoreExample)
              setShowGradient(false)
              setSelectedPoint(null)
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

  const handlePointSelect = useCallback((info: PointInfo | null) => {
    setSelectedPoint(info)
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
          min: parseDomainBound(domainDraft.xMin),
          max: parseDomainBound(domainDraft.xMax),
        },
        y: {
          min: parseDomainBound(domainDraft.yMin),
          max: parseDomainBound(domainDraft.yMax),
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
    setSelectedPoint(null)
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

  const openFormulaEditor = () => {
    setFormulaEditing(true)
    requestAnimationFrame(() => formulaInputRef.current?.focus())
  }

  const setDomainPreset = (value: string) => {
    setDomainDraft((current) => ({ ...current, [domainField]: value }))
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

  const insertCalculatorToken = (key: CalculatorKey) => {
    const { token, cursorOffset, kind } = key
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
    } else if (token === 'left' || token === 'right') {
      const nextCursor =
        start !== end
          ? token === 'left'
            ? start
            : end
          : token === 'left'
            ? Math.max(0, start - 1)
            : Math.min(formulaDraft.length, end + 1)
      nextDraft = formulaDraft
      cursor = nextCursor
    } else if (token === 'enter') {
      input?.form?.requestSubmit()
      return
    } else {
      nextDraft = formulaDraft.slice(0, start) + token + formulaDraft.slice(end)
      cursor = start + (cursorOffset ?? inserted.length)
    }

    setFormulaDraft(nextDraft)
    setFormulaError(null)
    if (kind === 'template') cursor = start + (cursorOffset ?? inserted.length)
    else if (token !== 'backspace' && token !== 'left' && token !== 'right') {
      cursor = start + inserted.length
    }
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
            {formulaEditing ? (
              <form className="formula-editor" onSubmit={handleApplyFormula}>
                <div className="formula-editor-heading">
                  <span>EDITOR DE FUNÇÃO</span>
                  <button type="button" onClick={() => setFormulaEditing(false)}>
                    Fechar
                  </button>
                </div>
                <label htmlFor="formula-input">
                  Digite uma fórmula para z = f(x, y)
                </label>
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
                  Escreva a função ou use o teclado científico. Trigonometria em
                  radianos.
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
                <div className="calculator-keyboard" aria-label="Teclado matemático">
                  <div
                    className="calculator-tabs"
                    role="tablist"
                    aria-label="Categorias do teclado"
                  >
                    {CALCULATOR_TABS.map((tab) => (
                      <button
                        key={tab}
                        id={`calculator-tab-${tab}`}
                        className="calculator-tab"
                        type="button"
                        role="tab"
                        aria-selected={calculatorTab === tab}
                        aria-controls="calculator-keys"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setCalculatorTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div
                    className={`scientific-calculator calculator-keys-${calculatorTab.replace(/[()]/g, '')}`}
                    id="calculator-keys"
                    role="tabpanel"
                    aria-labelledby={`calculator-tab-${calculatorTab}`}
                    aria-label={`Teclado ${calculatorTab}`}
                  >
                    {CALCULATOR_KEYS[calculatorTab].map((key) => (
                      <button
                        className={`key${key.kind ? ` key-${key.kind}` : ''}`}
                        key={`${key.label}-${key.token}`}
                        type="button"
                        aria-label={
                          key.token === 'backspace'
                            ? 'Apagar caractere'
                            : key.token === 'clear'
                              ? 'Limpar fórmula'
                              : key.token === 'left'
                                ? 'Mover cursor à esquerda'
                                : key.token === 'right'
                                  ? 'Mover cursor à direita'
                                  : key.token === 'enter'
                                    ? 'Aplicar expressão'
                                    : `Inserir ${key.label}`
                        }
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertCalculatorToken(key)}
                      >
                        {key.label}
                      </button>
                    ))}
                  </div>
                  <p className="calculator-keyboard-hint">
                    Modelos deixam o cursor no espaço a preencher; setas navegam e
                    Aplicar atualiza a superfície.
                  </p>
                </div>
                <fieldset className="domain-controls">
                  <legend>Domínio de exploração</legend>
                  <label>
                    x mínimo
                    <input
                      type="text"
                      inputMode="decimal"
                      value={domainDraft.xMin}
                      onFocus={() => setDomainField('xMin')}
                      onChange={(event) =>
                        setDomainDraft({ ...domainDraft, xMin: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    x máximo
                    <input
                      type="text"
                      inputMode="decimal"
                      value={domainDraft.xMax}
                      onFocus={() => setDomainField('xMax')}
                      onChange={(event) =>
                        setDomainDraft({ ...domainDraft, xMax: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    y mínimo
                    <input
                      type="text"
                      inputMode="decimal"
                      value={domainDraft.yMin}
                      onFocus={() => setDomainField('yMin')}
                      onChange={(event) =>
                        setDomainDraft({ ...domainDraft, yMin: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    y máximo
                    <input
                      type="text"
                      inputMode="decimal"
                      value={domainDraft.yMax}
                      onFocus={() => setDomainField('yMax')}
                      onChange={(event) =>
                        setDomainDraft({ ...domainDraft, yMax: event.target.value })
                      }
                    />
                  </label>
                  <small>
                    <span>
                      Digite constantes como <code>pi/2</code> ou escolha um atalho para
                      o limite selecionado:
                    </span>
                    <span className="domain-presets">
                      {DOMAIN_PRESETS.map(({ label, value }) => (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={domainDraft[domainField] === value}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setDomainPreset(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </span>
                    <span>
                      Limites finitos, com inferior menor que superior (|limite| ≤
                      10.000).
                    </span>
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
            ) : (
              <button
                className="formula-edit-trigger"
                type="button"
                onClick={openFormulaEditor}
              >
                <span>Editar função e domínio</span>
                <span aria-hidden="true">↗</span>
              </button>
            )}

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
            {isCustomFunction && !activeFunction.gradient && (
              <p className="surface-warning" role="status">
                Para esta expressão, as normais são estimadas a partir da malha porque
                alguma derivada não tem regra analítica disponível.
              </p>
            )}
          </div>

          <div className="surface-colormap">
            <label htmlFor="surface-colormap">Mapa de cores por altura</label>
            <select
              id="surface-colormap"
              value={colorMap}
              onChange={(event) =>
                setColorMap(event.currentTarget.value as SurfaceColorMap)
              }
            >
              {Object.entries(SURFACE_COLOR_MAPS).map(([key, palette]) => (
                <option key={key} value={key}>
                  {palette.label}
                </option>
              ))}
            </select>
            <div className="surface-colormap-scale">
              <small>Baixo</small>
              <span
                className="surface-colormap-preview"
                aria-hidden="true"
                style={{ backgroundImage: SURFACE_COLOR_MAPS[colorMap].css }}
              />
              <small>Alto</small>
            </div>
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
            Arraste para orbitar · Role para zoom · Clique na superfície para ler
            <MathText> (x, y, f(x,y))</MathText>
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
            colorMap={colorMap}
            highlightedElement={highlightedElement}
            onPointSelect={handlePointSelect}
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
          {selectedPoint && (
            <div className="point-tooltip" role="status" aria-label="Ponto selecionado">
              <button
                className="point-inspector-close"
                type="button"
                aria-label="Fechar inspeção do ponto"
                onClick={() => setSelectedPoint(null)}
              >
                ×
              </button>
              {selectedPoint.criticalPoint && (
                <span
                  className={`tooltip-badge ${criticalKindBadge[selectedPoint.criticalPoint.kind]?.badgeClass ?? ''}`}
                >
                  {criticalKindBadge[selectedPoint.criticalPoint.kind]?.label}
                </span>
              )}
              <div className="tooltip-coords">
                <span className="tooltip-coord-row">
                  <MVar>x</MVar> = <strong>{formatNum(selectedPoint.x)}</strong> rad
                </span>
                <span className="tooltip-coord-row">
                  <MVar>y</MVar> = <strong>{formatNum(selectedPoint.y)}</strong> rad
                </span>
                <span className="tooltip-coord-row">
                  <MVar>z</MVar> = <strong>{formatNum(selectedPoint.z)}</strong>
                </span>
              </div>
              {selectedPoint.gradient && (
                <div className="tooltip-gradient">
                  <div className="tooltip-grad-row">
                    <span>
                      ∇<MVar>f</MVar>
                    </span>
                    <span>
                      ({formatNum(selectedPoint.gradient[0])},{' '}
                      {formatNum(selectedPoint.gradient[1])})
                    </span>
                  </div>
                  <div className="tooltip-mag-row">
                    <span>
                      ‖∇<MVar>f</MVar>‖
                    </span>
                    <span>{formatNum(selectedPoint.gradientMagnitude ?? 0)}</span>
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
                <br />O gradiente analítico e as normais são calculados quando a
                expressão permite; integrais e deduções passo a passo virão com os
                módulos correspondentes.
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
