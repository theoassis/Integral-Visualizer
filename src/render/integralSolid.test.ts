import { describe, expect, it } from 'vitest'
import { buildIntegralSolidGeometry } from './integralSolid'
import type { SurfaceGrid } from './surfaceGrid'

function makeGrid(heights: number[], validVertices?: number[]): SurfaceGrid {
  const positions = new Float32Array(heights.length * 3)
  heights.forEach((height, index) => {
    const row = Math.floor(index / 2)
    const column = index % 2
    positions[index * 3] = row
    positions[index * 3 + 1] = column
    positions[index * 3 + 2] = height
  })
  return {
    segments: 1,
    stepX: 1,
    stepY: 1,
    positions,
    heights: new Float64Array(heights),
    validVertices: new Uint8Array(validVertices ?? heights.map(() => 1)),
    gradientX: new Float32Array(heights.length),
    gradientY: new Float32Array(heights.length),
    indices: [0, 2, 1, 2, 3, 1],
    invalidSampleCount: 0,
  }
}

function signedVolume(geometry: ReturnType<typeof buildIntegralSolidGeometry>): number {
  const positions = geometry.getAttribute('position')
  let volume = 0
  for (let index = 0; index < positions.count; index += 3) {
    const ax = positions.getX(index)
    const ay = positions.getY(index)
    const az = positions.getZ(index)
    const bx = positions.getX(index + 1)
    const by = positions.getY(index + 1)
    const bz = positions.getZ(index + 1)
    const cx = positions.getX(index + 2)
    const cy = positions.getY(index + 2)
    const cz = positions.getZ(index + 2)
    volume +=
      (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) /
      6
  }
  return volume
}

describe('buildIntegralSolidGeometry', () => {
  it('closes the sampled surface down to z=0 for positive and negative heights', () => {
    const positive = buildIntegralSolidGeometry(makeGrid([2, 2, 2, 2]))
    const negative = buildIntegralSolidGeometry(makeGrid([-3, -3, -3, -3]))
    const positiveZ = positive.getAttribute('position').array as Float32Array
    const negativeZ = negative.getAttribute('position').array as Float32Array

    expect(Math.min(...positiveZ.filter((_, index) => index % 3 === 2))).toBe(0)
    expect(Math.max(...positiveZ.filter((_, index) => index % 3 === 2))).toBe(2)
    expect(Math.min(...negativeZ.filter((_, index) => index % 3 === 2))).toBe(-3)
    expect(Math.max(...negativeZ.filter((_, index) => index % 3 === 2))).toBe(0)
    expect(positiveZ.length).toBe(negativeZ.length)
    expect(signedVolume(positive)).toBeCloseTo(2, 6)
    expect(signedVolume(negative)).toBeCloseTo(3, 6)
    positive.dispose()
    negative.dispose()
  })

  it('omits top triangles that touch invalid vertices', () => {
    const geometry = buildIntegralSolidGeometry(makeGrid([1, 1, 1, 1], [1, 1, 1, 0]))

    expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
    for (const value of geometry.getAttribute('position').array) {
      expect(Number.isFinite(value)).toBe(true)
    }
    geometry.dispose()
  })
})
