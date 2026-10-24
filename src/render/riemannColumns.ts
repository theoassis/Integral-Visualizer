import {
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import type { RiemannGridData } from '../core/quad/riemann'
import { evaluateHeightColor, type SurfaceColorMap } from './colorMaps'

export const MAX_RIEMANN_VISUAL_HEIGHT = 1_000_000
const COLUMN_GAP_RATIO = 0.96

export interface RiemannColumnsObject {
  readonly mesh: InstancedMesh<BoxGeometry, MeshStandardMaterial>
  /** Maps visible instance IDs back to the original row-major cell index. */
  readonly cellIndices: Uint32Array
  readonly omittedCount: number
}

/** Builds all Riemann prisms in one GPU-instanced draw call. */
export function buildRiemannColumns(
  grid: RiemannGridData,
  colorMap: SurfaceColorMap,
): RiemannColumnsObject {
  const cellCount = grid.xSubdivisions * grid.ySubdivisions
  if (
    !Number.isSafeInteger(grid.xSubdivisions) ||
    !Number.isSafeInteger(grid.ySubdivisions) ||
    grid.xSubdivisions < 1 ||
    grid.ySubdivisions < 1 ||
    !Number.isSafeInteger(cellCount) ||
    cellCount > 1_000_000 ||
    !Number.isFinite(grid.xMin) ||
    !Number.isFinite(grid.yMin) ||
    !Number.isFinite(grid.deltaX) ||
    !Number.isFinite(grid.deltaY) ||
    grid.deltaX === 0 ||
    grid.deltaY === 0 ||
    grid.values.length !== cellCount ||
    grid.sampleX.length !== cellCount ||
    grid.sampleY.length !== cellCount
  ) {
    throw new RangeError('A malha de prismas contém dimensões ou amostras inválidas.')
  }

  const visibleIndices: number[] = []
  let minHeight = Number.POSITIVE_INFINITY
  let maxHeight = Number.NEGATIVE_INFINITY
  for (let index = 0; index < grid.values.length; index += 1) {
    const value = grid.values[index]!
    if (
      !Number.isFinite(value) ||
      !Number.isFinite(grid.sampleX[index]!) ||
      !Number.isFinite(grid.sampleY[index]!)
    ) {
      throw new RangeError('A malha de prismas contém amostras não finitas.')
    }
    if (Math.abs(value) > MAX_RIEMANN_VISUAL_HEIGHT) continue
    visibleIndices.push(index)
    minHeight = Math.min(minHeight, value)
    maxHeight = Math.max(maxHeight, value)
  }

  const geometry = new BoxGeometry(1, 1, 1)
  const material = new MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.42,
    metalness: 0.04,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  })
  const mesh = new InstancedMesh(geometry, material, visibleIndices.length)
  mesh.name = 'riemann-prisms'
  mesh.instanceMatrix.setUsage(DynamicDrawUsage)
  mesh.renderOrder = 2
  mesh.frustumCulled = false

  const cellIndices = new Uint32Array(visibleIndices.length)
  const position = new Vector3()
  const scale = new Vector3()
  const rotation = new Quaternion()
  const matrix = new Matrix4()
  const color = new Color()
  const range = maxHeight - minHeight

  visibleIndices.forEach((cellIndex, instanceIndex) => {
    const row = Math.floor(cellIndex / grid.ySubdivisions)
    const column = cellIndex % grid.ySubdivisions
    const value = grid.values[cellIndex]!
    const x = grid.xMin + grid.deltaX * (row + 0.5)
    const y = grid.yMin + grid.deltaY * (column + 0.5)
    position.set(x, y, value / 2)
    scale.set(
      Math.abs(grid.deltaX) * COLUMN_GAP_RATIO,
      Math.abs(grid.deltaY) * COLUMN_GAP_RATIO,
      Math.abs(value),
    )
    matrix.compose(position, rotation, scale)
    mesh.setMatrixAt(instanceIndex, matrix)

    const normalizedHeight = range === 0 ? 0.5 : (value - minHeight) / range
    const [red, green, blue] = evaluateHeightColor(normalizedHeight, colorMap)
    color.setRGB(red, green, blue)
    mesh.setColorAt(instanceIndex, color)
    cellIndices[instanceIndex] = cellIndex
  })

  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingBox()
  mesh.computeBoundingSphere()

  return {
    mesh,
    cellIndices,
    omittedCount: cellCount - visibleIndices.length,
  }
}
