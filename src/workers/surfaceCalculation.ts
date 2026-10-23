import { createExpressionFunction } from '../core/functions/expressionFunction'
import type { VisualizableFunction } from '../core/functions/types'
import { createSurfaceGridAsync } from '../render/surfaceGrid'

export interface SurfaceCalculationRequest {
  jobId: number
  expression: string
  parameters: Record<string, number>
  domain: VisualizableFunction['domain']
  segments: number
}

export interface SurfaceCalculationResult {
  jobId: number
  range: VisualizableFunction['range']
  grid: NonNullable<Awaited<ReturnType<typeof createSurfaceGridAsync>>>
}

export async function calculateSurface(
  request: SurfaceCalculationRequest,
  shouldCancel: () => boolean = () => false,
): Promise<SurfaceCalculationResult | null> {
  const func = createExpressionFunction(
    request.expression,
    request.parameters,
    request.domain,
  )
  const grid = await createSurfaceGridAsync(func, request.segments, shouldCancel)
  if (!grid || shouldCancel()) return null

  return { jobId: request.jobId, range: func.range, grid }
}

/** Keeps the worker responsive and lets callers explicitly cancel a pending job by id. */
export class SurfaceCalculationService {
  private readonly cancelledJobs = new Set<number>()

  ready(): boolean {
    return true
  }

  async calculate(
    request: SurfaceCalculationRequest,
  ): Promise<SurfaceCalculationResult | null> {
    const shouldCancel = () => this.cancelledJobs.has(request.jobId)
    try {
      return await calculateSurface(request, shouldCancel)
    } finally {
      this.cancelledJobs.delete(request.jobId)
    }
  }

  cancel(jobId: number): void {
    this.cancelledJobs.add(jobId)
  }
}

export interface SurfaceWorkerApi {
  ready(): boolean
  calculate(
    request: SurfaceCalculationRequest,
  ): Promise<SurfaceCalculationResult | null>
  cancel(jobId: number): void
}
