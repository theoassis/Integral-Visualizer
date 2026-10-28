import { compileExpression } from '../core/expr/codegen'
import { parseDomainBound } from './domainBound'
import type { IntegralCalculatorDraft } from './regionCalculator'

interface RegionPreviewProps {
  readonly draft: IntegralCalculatorDraft
}

const WIDTH = 320
const HEIGHT = 160
const PADDING = 14
const SAMPLE_COUNT = 64
const POLAR_SECTORS = 48

function toPoint(
  x: number,
  y: number,
  bounds: readonly [number, number, number, number],
) {
  const [xMin, xMax, yMin, yMax] = bounds
  return {
    x: PADDING + ((x - xMin) / (xMax - xMin)) * (WIDTH - PADDING * 2),
    y: HEIGHT - PADDING - ((y - yMin) / (yMax - yMin)) * (HEIGHT - PADDING * 2),
  }
}

function polygonPoints(draft: IntegralCalculatorDraft): string {
  const xMin = parseDomainBound(draft.xMin)
  const xMax = parseDomainBound(draft.xMax)
  const yMin = parseDomainBound(draft.yMin)
  const yMax = parseDomainBound(draft.yMax)
  const bounds = [xMin, xMax, yMin, yMax] as const
  if (draft.kind === 'rectangle') {
    return [
      toPoint(xMin, yMin, bounds),
      toPoint(xMax, yMin, bounds),
      toPoint(xMax, yMax, bounds),
      toPoint(xMin, yMax, bounds),
    ]
      .map(({ x, y }) => `${x},${y}`)
      .join(' ')
  }

  const variable = draft.kind === 'typeI' ? 'x' : 'y'
  const lower = compileExpression(draft.lowerExpression)
  const upper = compileExpression(draft.upperExpression)
  const outerMin = draft.kind === 'typeI' ? xMin : yMin
  const outerMax = draft.kind === 'typeI' ? xMax : yMax
  const upperPoints: Array<{ x: number; y: number }> = []
  const lowerPoints: Array<{ x: number; y: number }> = []

  for (let index = 0; index <= SAMPLE_COUNT; index += 1) {
    const outer = outerMin + ((outerMax - outerMin) * index) / SAMPLE_COUNT
    const scope = { [variable]: outer }
    const lowerValue = lower.evaluate(scope)
    const upperValue = upper.evaluate(scope)
    if (
      !Number.isFinite(lowerValue) ||
      !Number.isFinite(upperValue) ||
      lowerValue > upperValue
    ) {
      throw new RangeError('Limites internos inválidos para desenhar a região.')
    }
    upperPoints.push(
      draft.kind === 'typeI'
        ? toPoint(outer, upperValue, bounds)
        : toPoint(upperValue, outer, bounds),
    )
    lowerPoints.push(
      draft.kind === 'typeI'
        ? toPoint(outer, lowerValue, bounds)
        : toPoint(lowerValue, outer, bounds),
    )
  }

  return [...upperPoints, ...lowerPoints.reverse()]
    .map(({ x, y }) => `${x},${y}`)
    .join(' ')
}

export default function RegionPreview({ draft }: RegionPreviewProps) {
  if (draft.kind === 'polar') {
    const polar = (() => {
      try {
        const radius = parseDomainBound(draft.rMax)
        const innerRadius = parseDomainBound(draft.rMin)
        const thetaMin = parseDomainBound(draft.thetaMin)
        const thetaMax = parseDomainBound(draft.thetaMax)
        if (
          radius <= 0 ||
          innerRadius < 0 ||
          innerRadius >= radius ||
          thetaMax <= thetaMin ||
          thetaMax - thetaMin > 2 * Math.PI
        )
          return null
        const center = { x: WIDTH / 2, y: HEIGHT / 2 }
        const scale = (Math.min(WIDTH, HEIGHT) / 2 - PADDING) / radius
        const pointAt = (r: number, theta: number) => ({
          x: center.x + r * scale * Math.cos(theta),
          y: center.y - r * scale * Math.sin(theta),
        })
        const wedges = Array.from({ length: POLAR_SECTORS }, (_, index) => {
          const start = thetaMin + ((thetaMax - thetaMin) * index) / POLAR_SECTORS
          const end = thetaMin + ((thetaMax - thetaMin) * (index + 1)) / POLAR_SECTORS
          const outer = [pointAt(radius, start), pointAt(radius, end)]
          const inner =
            innerRadius === 0
              ? [center]
              : [pointAt(innerRadius, end), pointAt(innerRadius, start)]
          return [...outer, ...inner].map(({ x, y }) => `${x},${y}`).join(' ')
        })
        return {
          center,
          radius: radius * scale,
          innerRadius: innerRadius * scale,
          wedges,
        }
      } catch {
        return null
      }
    })()
    return (
      <svg
        className="region-preview polar-region-preview"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={
          polar
            ? 'Prévia polar da região com decomposição animada em setores'
            : 'Prévia polar aguardando limites válidos'
        }
      >
        <line x1={PADDING} y1={HEIGHT / 2} x2={WIDTH - PADDING} y2={HEIGHT / 2} />
        <line x1={WIDTH / 2} y1={PADDING} x2={WIDTH / 2} y2={HEIGHT - PADDING} />
        {polar?.wedges.map((points, index) => (
          <polygon
            className="polar-sector"
            style={{ animationDelay: `${index * 18}ms` }}
            key={index}
            points={points}
          />
        ))}
        {polar && (
          <circle
            className="polar-boundary"
            cx={polar.center.x}
            cy={polar.center.y}
            r={polar.radius}
          />
        )}
        {polar && polar.innerRadius > 0 && (
          <circle
            className="polar-boundary"
            cx={polar.center.x}
            cy={polar.center.y}
            r={polar.innerRadius}
          />
        )}
        <text x={WIDTH - PADDING} y={HEIGHT / 2 - 4} textAnchor="end">
          x
        </text>
        <text x={WIDTH / 2 + 6} y={PADDING + 8}>
          y
        </text>
      </svg>
    )
  }
  const points = (() => {
    try {
      return polygonPoints(draft)
    } catch {
      return null
    }
  })()

  return (
    <svg
      className="region-preview"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={
        points
          ? `Prévia bidimensional da região ${draft.kind}`
          : 'Prévia aguardando limites válidos'
      }
    >
      <line
        x1={PADDING}
        y1={HEIGHT - PADDING}
        x2={WIDTH - PADDING}
        y2={HEIGHT - PADDING}
      />
      <line x1={PADDING} y1={PADDING} x2={PADDING} y2={HEIGHT - PADDING} />
      {points && <polygon points={points} />}
      <text x={WIDTH - PADDING} y={HEIGHT - 2} textAnchor="end">
        {draft.kind === 'typeII' ? 'y' : 'x'}
      </text>
      <text x={4} y={PADDING}>
        {draft.kind === 'typeII' ? 'x' : 'y'}
      </text>
    </svg>
  )
}
