import { parse } from 'mathjs'
import type {
  ConstantNode,
  FunctionNode,
  MathNode,
  OperatorNode,
  OperatorNodeFn,
  OperatorNodeOp,
  ParenthesisNode,
  SymbolNode,
} from 'mathjs'

const MAX_SOURCE_LENGTH = 512
const MAX_NODE_COUNT = 256
const MAX_TREE_DEPTH = 64

export type VariableScope =
  Readonly<Record<string, number>> | ReadonlyMap<string, number>

export type ExpressionErrorCode =
  | 'empty-expression'
  | 'expression-too-long'
  | 'syntax-error'
  | 'unsupported-operation'
  | 'unknown-function'
  | 'wrong-arity'
  | 'missing-variable'
  | 'invalid-variable-value'
  | 'expression-too-complex'

export class ExpressionError extends Error {
  readonly code: ExpressionErrorCode
  readonly position: number | undefined

  constructor(code: ExpressionErrorCode, message: string, position?: number) {
    super(message)
    this.name = 'ExpressionError'
    this.code = code
    this.position = position
  }
}

export interface CompiledExpression {
  readonly source: string
  readonly variables: readonly string[]
  evaluate(scope?: VariableScope): number
}

type Evaluator = (scope: VariableScope) => number
type NumericFunction = (args: readonly number[]) => number

interface FunctionDefinition {
  readonly minArguments: number
  readonly maxArguments: number
  readonly evaluate: NumericFunction
}

const FUNCTION_DEFINITIONS = new Map<string, FunctionDefinition>([
  [
    'sin',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.sin(x ?? Number.NaN) },
  ],
  [
    'cos',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.cos(x ?? Number.NaN) },
  ],
  [
    'tan',
    {
      minArguments: 1,
      maxArguments: 1,
      evaluate: ([x]) => evaluateTangent(x ?? Number.NaN),
    },
  ],
  [
    'asin',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.asin(x ?? Number.NaN) },
  ],
  [
    'acos',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.acos(x ?? Number.NaN) },
  ],
  [
    'atan',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.atan(x ?? Number.NaN) },
  ],
  [
    'atan2',
    {
      minArguments: 2,
      maxArguments: 2,
      evaluate: ([y, x]) => Math.atan2(y ?? Number.NaN, x ?? Number.NaN),
    },
  ],
  [
    'sinh',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.sinh(x ?? Number.NaN) },
  ],
  [
    'cosh',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.cosh(x ?? Number.NaN) },
  ],
  [
    'tanh',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.tanh(x ?? Number.NaN) },
  ],
  [
    'exp',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.exp(x ?? Number.NaN) },
  ],
  [
    'log',
    {
      minArguments: 1,
      maxArguments: 2,
      evaluate: ([value, base]) =>
        base === undefined
          ? Math.log(value ?? Number.NaN)
          : Math.log(value ?? Number.NaN) / Math.log(base),
    },
  ],
  [
    'ln',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.log(x ?? Number.NaN) },
  ],
  [
    'sqrt',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.sqrt(x ?? Number.NaN) },
  ],
  [
    'abs',
    { minArguments: 1, maxArguments: 1, evaluate: ([x]) => Math.abs(x ?? Number.NaN) },
  ],
  [
    'min',
    {
      minArguments: 1,
      maxArguments: Number.POSITIVE_INFINITY,
      evaluate: (args) => Math.min(...args),
    },
  ],
  [
    'max',
    {
      minArguments: 1,
      maxArguments: Number.POSITIVE_INFINITY,
      evaluate: (args) => Math.max(...args),
    },
  ],
  [
    'pow',
    {
      minArguments: 2,
      maxArguments: 2,
      evaluate: ([x, y]) => Math.pow(x ?? Number.NaN, y ?? Number.NaN),
    },
  ],
  [
    'floor',
    {
      minArguments: 1,
      maxArguments: 1,
      evaluate: ([x]) => Math.floor(x ?? Number.NaN),
    },
  ],
])

const FUNCTION_ALIASES = new Map<string, string>([
  ['sen', 'sin'],
  ['tg', 'tan'],
])
const SHORTHAND_FUNCTIONS = [
  'atan2',
  'sinh',
  'cosh',
  'tanh',
  'asin',
  'acos',
  'atan',
  'sqrt',
  'abs',
  'exp',
  'log',
  'sin',
  'cos',
  'tan',
  'sen',
  'tg',
]

function evaluateTangent(value: number): number {
  const poleIndex = Math.round((value - Math.PI / 2) / Math.PI)
  const pole = Math.PI / 2 + poleIndex * Math.PI
  const poleTolerance = Number.EPSILON * Math.max(1, Math.abs(value)) * 4
  if (Math.abs(value - pole) <= poleTolerance) return Number.NaN
  return Math.tan(value)
}

type CompileContext = {
  readonly variables: Set<string>
  nodeCount: number
}

function unsupportedOperation(): never {
  throw new ExpressionError(
    'unsupported-operation',
    'A expressão contém uma operação que não é permitida.',
  )
}

function readVariable(scope: VariableScope, name: string): number {
  if (scope instanceof Map) {
    if (!scope.has(name)) {
      throw new ExpressionError(
        'missing-variable',
        `A variável "${name}" não foi informada.`,
      )
    }

    const value = scope.get(name)
    if (typeof value !== 'number') {
      throw new ExpressionError(
        'invalid-variable-value',
        `O valor da variável "${name}" precisa ser numérico.`,
      )
    }

    return value
  }

  const record = scope as Readonly<Record<string, number>>
  if (!Object.hasOwn(record, name)) {
    throw new ExpressionError(
      'missing-variable',
      `A variável "${name}" não foi informada.`,
    )
  }

  const value = record[name]
  if (typeof value !== 'number') {
    throw new ExpressionError(
      'invalid-variable-value',
      `O valor da variável "${name}" precisa ser numérico.`,
    )
  }

  return value
}

function compileNode(node: MathNode, context: CompileContext, depth = 0): Evaluator {
  context.nodeCount += 1
  if (context.nodeCount > MAX_NODE_COUNT || depth > MAX_TREE_DEPTH) {
    throw new ExpressionError(
      'expression-too-complex',
      'A expressão é complexa demais para ser processada com segurança.',
    )
  }

  switch (node.type) {
    case 'ConstantNode': {
      const value = (node as ConstantNode).value
      if (typeof value !== 'number' || !Number.isFinite(value))
        return unsupportedOperation()
      return () => value
    }

    case 'SymbolNode': {
      const name = (node as SymbolNode).name
      if (name === 'pi') return () => Math.PI
      if (name === 'e') return () => Math.E
      if (!/^[a-z]+$/.test(name)) return unsupportedOperation()

      const factors: Evaluator[] = []
      for (let index = 0; index < name.length;) {
        if (name.startsWith('pi', index)) {
          factors.push(() => Math.PI)
          index += 2
          continue
        }

        const variable = name[index]!
        if (variable === 'e') {
          factors.push(() => Math.E)
        } else {
          context.variables.add(variable)
          factors.push((scope) => readVariable(scope, variable))
        }
        index += 1
      }

      return (scope) =>
        factors.reduce((product, evaluateFactor) => product * evaluateFactor(scope), 1)
    }

    case 'ParenthesisNode':
      return compileNode((node as ParenthesisNode).content, context, depth + 1)

    case 'FunctionNode': {
      const functionNode = node as FunctionNode
      if (functionNode.fn.type !== 'SymbolNode') return unsupportedOperation()

      const sourceName = (functionNode.fn as SymbolNode).name
      const name = FUNCTION_ALIASES.get(sourceName) ?? sourceName
      const definition = FUNCTION_DEFINITIONS.get(name)
      if (!definition) {
        throw new ExpressionError(
          'unknown-function',
          `Função "${sourceName}" não permitida.`,
        )
      }

      const argumentCount = functionNode.args.length
      if (
        argumentCount < definition.minArguments ||
        argumentCount > definition.maxArguments
      ) {
        const expectedArguments =
          definition.minArguments === definition.maxArguments
            ? `${definition.minArguments} ${definition.minArguments === 1 ? 'argumento' : 'argumentos'}`
            : Number.isFinite(definition.maxArguments)
              ? `${definition.minArguments} ou ${definition.maxArguments} argumentos`
              : `pelo menos ${definition.minArguments} argumento`
        const receivedArguments = `${argumentCount} ${argumentCount === 1 ? 'argumento' : 'argumentos'}`
        throw new ExpressionError(
          'wrong-arity',
          `A função "${sourceName}" espera ${expectedArguments}, mas recebeu ${receivedArguments}.`,
        )
      }

      const evaluateArguments = functionNode.args.map((argument) =>
        compileNode(argument, context, depth + 1),
      )
      return (scope) =>
        definition.evaluate(
          evaluateArguments.map((evaluateArgument) => evaluateArgument(scope)),
        )
    }

    case 'OperatorNode': {
      const operator = node as OperatorNode<OperatorNodeOp, OperatorNodeFn>
      const argumentEvaluators = operator.args.map((argument) =>
        compileNode(argument, context, depth + 1),
      )

      if (
        operator.fn === 'unaryMinus' &&
        operator.op === '-' &&
        argumentEvaluators.length === 1
      ) {
        return (scope) => -argumentEvaluators[0]!(scope)
      }
      if (
        operator.fn === 'unaryPlus' &&
        operator.op === '+' &&
        argumentEvaluators.length === 1
      ) {
        return (scope) => argumentEvaluators[0]!(scope)
      }
      if (argumentEvaluators.length !== 2) return unsupportedOperation()

      const left = argumentEvaluators[0]!
      const right = argumentEvaluators[1]!
      switch (operator.fn) {
        case 'add':
          if (operator.op === '+') return (scope) => left(scope) + right(scope)
          break
        case 'subtract':
          if (operator.op === '-') return (scope) => left(scope) - right(scope)
          break
        case 'multiply':
          if (operator.op === '*') return (scope) => left(scope) * right(scope)
          break
        case 'divide':
          if (operator.op === '/') return (scope) => left(scope) / right(scope)
          break
        case 'pow':
          if (operator.op === '^') return (scope) => Math.pow(left(scope), right(scope))
          break
        default:
          break
      }
      return unsupportedOperation()
    }

    default:
      return unsupportedOperation()
  }
}

function parseSyntaxError(error: unknown): ExpressionError {
  const message = error instanceof Error ? error.message : ''
  const positionMatch = /\(char (\d+)\)/.exec(message)
  const position =
    positionMatch?.[1] === undefined ? undefined : Number(positionMatch[1])
  const location = position === undefined ? '' : ` perto do caractere ${position + 1}`
  return new ExpressionError(
    'syntax-error',
    `Não foi possível interpretar a expressão${location}. Verifique a sintaxe e os parênteses.`,
    position,
  )
}

function shorthandCallAt(
  source: string,
  start: number,
): { name: string; argument: string; end: number } | undefined {
  const name = SHORTHAND_FUNCTIONS.find((candidate) =>
    source.startsWith(candidate, start),
  )
  if (!name) return undefined

  let argumentStart = start + name.length
  while (/\s/.test(source[argumentStart] ?? '') && argumentStart < source.length) {
    argumentStart += 1
  }
  if (source[argumentStart] === '(') return undefined

  const argument = source[argumentStart]
  if (!argument || !/^[a-z]$/i.test(argument)) return undefined

  let next = argumentStart + 1
  while (/\s/.test(source[next] ?? '') && next < source.length) next += 1
  const atEnd = next >= source.length
  const atOperator = /[+\-*/^),]/.test(source[next] ?? '')
  const followedByFunction = SHORTHAND_FUNCTIONS.some((candidate) =>
    source.startsWith(candidate, next),
  )
  if (!atEnd && !atOperator && !followedByFunction) return undefined

  return { name, argument, end: argumentStart + 1 }
}

/** Converts common school notation such as `sen x tan y` to explicit calls. */
function normalizeFunctionShorthand(source: string): string {
  let normalized = ''
  let previousWasShorthand = false

  for (let index = 0; index < source.length;) {
    const call = shorthandCallAt(source, index)
    if (call) {
      if (previousWasShorthand) normalized += '*'
      normalized += `${call.name}(${call.argument})`
      index = call.end
      previousWasShorthand = true
      continue
    }

    const character = source[index]!
    normalized += character
    if (!/\s/.test(character)) previousWasShorthand = false
    index += 1
  }

  return normalized
}

export function compileExpression(source: string): CompiledExpression {
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new ExpressionError(
      'expression-too-long',
      'A expressão é longa demais (limite de 512 caracteres).',
    )
  }

  const expression = source.trim()
  if (!expression) {
    throw new ExpressionError('empty-expression', 'Digite uma expressão matemática.')
  }

  let root: MathNode
  try {
    root = parse(normalizeFunctionShorthand(expression))
  } catch (error) {
    throw parseSyntaxError(error)
  }

  const context: CompileContext = { variables: new Set(), nodeCount: 0 }
  const evaluateRoot = compileNode(root, context)
  const variables = Object.freeze([...context.variables].sort())

  return Object.freeze({
    source: expression,
    variables,
    evaluate: (scope: VariableScope = {}) => evaluateRoot(scope),
  })
}
