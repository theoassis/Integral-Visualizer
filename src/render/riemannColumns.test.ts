import { Matrix4, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { buildRiemannColumns } from './riemannColumns'
import type { RiemannGridData } from '../core/quad/riemann'

const grid: RiemannGridData = {
  rule: 'midpoint',
  xMin: 2,
  yMin: -1,
  deltaX: 1,
  deltaY: 2,
  xSubdivisions: 2,
  ySubdivisions: 1,
  values: new Float64Array([2, -3]),
  sampleX: new Float64Array([2.5, 3.5]),
  sampleY: new Float64Array([0, 0]),
}

describe('buildRiemannColumns', () => {
  it('places positive and negative columns on the correct side of z=0', () => {
    const { mesh } = buildRiemannColumns(grid, 'viridis')
    const first = new Matrix4()
    const second = new Matrix4()
    const firstPosition = new Vector3()
    const firstScale = new Vector3()
    const secondPosition = new Vector3()
    const secondScale = new Vector3()
    mesh.getMatrixAt(0, first)
    mesh.getMatrixAt(1, second)
    first.decompose(firstPosition, new Quaternion(), firstScale)
    second.decompose(secondPosition, new Quaternion(), secondScale)

    expect(mesh.count).toBe(2)
    expect(firstPosition.x).toBeCloseTo(2.5, 6)
    expect(firstPosition.y).toBeCloseTo(0, 6)
    expect(firstPosition.z).toBeCloseTo(1, 6)
    expect(firstScale.x).toBeCloseTo(0.96, 6)
    expect(firstScale.y).toBeCloseTo(1.92, 6)
    expect(firstScale.z).toBeCloseTo(2, 6)
    expect(secondPosition.x).toBeCloseTo(3.5, 6)
    expect(secondPosition.y).toBeCloseTo(0, 6)
    expect(secondPosition.z).toBeCloseTo(-1.5, 6)
    expect(secondScale.x).toBeCloseTo(0.96, 6)
    expect(secondScale.y).toBeCloseTo(1.92, 6)
    expect(secondScale.z).toBeCloseTo(3, 6)
    mesh.geometry.dispose()
    mesh.material.dispose()
  })

  it('maps instance IDs back to row-major cell indices and omits unsafe heights', () => {
    const data: RiemannGridData = {
      ...grid,
      xSubdivisions: 3,
      values: new Float64Array([1, 1e7, -2]),
      sampleX: new Float64Array([2.5, 3.5, 4.5]),
      sampleY: new Float64Array([0, 0, 0]),
    }
    const { mesh, cellIndices, omittedCount } = buildRiemannColumns(data, 'atlas')

    expect(mesh.count).toBe(2)
    expect([...cellIndices]).toEqual([0, 2])
    expect(omittedCount).toBe(1)
    mesh.geometry.dispose()
    mesh.material.dispose()
  })

  it('omite células fora da região e escala a base pela fração estimada', () => {
    const data: RiemannGridData = {
      ...grid,
      cellFractions: new Float32Array([0.25, 0]),
    }
    const { mesh, cellIndices, omittedCount } = buildRiemannColumns(data, 'atlas')
    const matrix = new Matrix4()
    const scale = new Vector3()
    mesh.getMatrixAt(0, matrix)
    matrix.decompose(new Vector3(), new Quaternion(), scale)

    expect(mesh.count).toBe(1)
    expect([...cellIndices]).toEqual([0])
    expect(omittedCount).toBe(1)
    expect(scale.x).toBeCloseTo(0.48, 6)
    expect(scale.y).toBeCloseTo(0.96, 6)
    mesh.geometry.dispose()
    mesh.material.dispose()
  })
})
