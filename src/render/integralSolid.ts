import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { SurfaceGrid } from './surfaceGrid'

/** Builds a triangulated, signed solid between the sampled graph and z = 0. */
export function buildIntegralSolidGeometry(grid: SurfaceGrid): BufferGeometry {
  const side = grid.segments + 1
  const vertexCount = side * side
  if (
    !Number.isSafeInteger(grid.segments) ||
    grid.segments < 1 ||
    grid.positions.length !== vertexCount * 3 ||
    grid.heights.length !== vertexCount ||
    grid.validVertices.length !== vertexCount
  ) {
    throw new RangeError('A malha do sólido contém dimensões inválidas.')
  }

  const positions: number[] = []
  const appendTriangle = (a: number[], b: number[], c: number[]): void => {
    positions.push(...a, ...b, ...c)
  }
  const point = (index: number, onBase = false): number[] => {
    const offset = index * 3
    const height = grid.heights[index]!
    if (
      grid.validVertices[index] !== 1 ||
      !Number.isFinite(height) ||
      !Number.isFinite(grid.positions[offset]) ||
      !Number.isFinite(grid.positions[offset + 1])
    ) {
      throw new RangeError('A malha do sólido contém um vértice inválido.')
    }
    return [grid.positions[offset]!, grid.positions[offset + 1]!, onBase ? 0 : height]
  }

  const appendPrism = (a: number, b: number, c: number): void => {
    if (
      grid.validVertices[a] !== 1 ||
      grid.validVertices[b] !== 1 ||
      grid.validVertices[c] !== 1
    ) {
      return
    }
    const topA = point(a)
    const topB = point(b)
    const topC = point(c)
    const baseA = point(a, true)
    const baseB = point(b, true)
    const baseC = point(c, true)
    const negative = (grid.heights[a]! + grid.heights[b]! + grid.heights[c]!) / 3 < 0
    if (negative) {
      appendTriangle(topC, topB, topA)
      appendTriangle(baseA, baseB, baseC)
    } else {
      appendTriangle(topA, topB, topC)
      appendTriangle(baseC, baseB, baseA)
    }
  }

  for (let index = 0; index < grid.indices.length; index += 3) {
    appendPrism(
      grid.indices[index]!,
      grid.indices[index + 1]!,
      grid.indices[index + 2]!,
    )
  }

  const appendSide = (
    first: number,
    second: number,
    boundaryReversed: boolean,
  ): void => {
    if (grid.validVertices[first] !== 1 || grid.validVertices[second] !== 1) return
    const topFirst = point(first)
    const topSecond = point(second)
    const baseFirst = point(first, true)
    const baseSecond = point(second, true)
    const negative = (grid.heights[first]! + grid.heights[second]!) / 2 < 0
    if (boundaryReversed !== negative) {
      appendTriangle(topFirst, topSecond, baseFirst)
      appendTriangle(topSecond, baseSecond, baseFirst)
    } else {
      appendTriangle(topFirst, baseFirst, topSecond)
      appendTriangle(topSecond, baseFirst, baseSecond)
    }
  }

  for (let index = 0; index < grid.segments; index += 1) {
    appendSide(index, index + 1, true)
    appendSide(grid.segments * side + index, grid.segments * side + index + 1, false)
    appendSide(index * side, (index + 1) * side, false)
    appendSide(index * side + grid.segments, (index + 1) * side + grid.segments, true)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
