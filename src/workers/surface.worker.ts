import * as Comlink from 'comlink'
import {
  SurfaceCalculationService,
  type SurfaceCalculationResult,
  type SurfaceWorkerApi,
} from './surfaceCalculation'
import type {
  RiemannCalculationRequest,
  RiemannCalculationResult,
} from './riemannCalculation'

class TransferableSurfaceCalculationService extends SurfaceCalculationService {
  override async calculate(request: Parameters<SurfaceWorkerApi['calculate']>[0]) {
    const result: SurfaceCalculationResult | null = await super.calculate(request)
    if (!result) return null

    return Comlink.transfer(result, [
      result.grid.positions.buffer as ArrayBuffer,
      result.grid.heights.buffer as ArrayBuffer,
      result.grid.validVertices.buffer as ArrayBuffer,
      result.grid.gradientX.buffer as ArrayBuffer,
      result.grid.gradientY.buffer as ArrayBuffer,
    ])
  }

  override calculateRiemann(request: RiemannCalculationRequest) {
    const result: RiemannCalculationResult = super.calculateRiemann(request)
    return Comlink.transfer(result, [
      result.grid.values.buffer as ArrayBuffer,
      result.grid.sampleX.buffer as ArrayBuffer,
      result.grid.sampleY.buffer as ArrayBuffer,
    ])
  }
}

Comlink.expose(new TransferableSurfaceCalculationService())
