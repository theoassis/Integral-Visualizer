import { useCallback, useEffect, useRef } from 'react'
import {
  AmbientLight,
  ArrowHelper,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { CriticalPointData, VisualizableFunction } from '../core/functions/types'
import type { RiemannCellSample, RiemannGridData } from '../core/quad/riemann'
import { estimateGridGradient, SURFACE_SEGMENTS, type SurfaceGrid } from './surfaceGrid'
import { evaluateHeightColor, type SurfaceColorMap } from './colorMaps'
import { buildRiemannColumns, type RiemannColumnsObject } from './riemannColumns'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PointInfo {
  x: number
  y: number
  z: number
  gradient?: [number, number]
  gradientMagnitude?: number
  criticalPoint?: CriticalPointData
  screenX: number
  screenY: number
}

export interface SurfaceDiagnostics {
  invalidSampleCount: number
  totalSampleCount: number
}

interface HelloSurfaceProps {
  func: VisualizableFunction
  calculatedGrid: SurfaceGrid | null
  autoRotate: boolean
  showCriticalPoints: boolean
  showGradient: boolean
  showGrid: boolean
  showAxes: boolean
  colorMap: SurfaceColorMap
  riemannGrid: RiemannGridData | null
  showRiemannColumns: boolean
  highlightedElement?: 'surface' | 'gradient' | 'criticalPoints' | 'axes' | null
  onPointSelect?: (info: PointInfo | null) => void
  onRiemannCellHover?: (cell: RiemannCellSample | null) => void
  onRiemannOmittedChange?: (count: number) => void
  onSurfaceDiagnostics?: (diagnostics: SurfaceDiagnostics) => void
}

/* ------------------------------------------------------------------ */
/*  Constants & Color Palette                                          */
/* ------------------------------------------------------------------ */

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const BG_COLOR = '#0c1116'
const GRID_COLOR = '#283139'
const AXIS_X_COLOR = '#d79c9d'
const AXIS_Y_COLOR = '#8bb6a2'
const AXIS_Z_COLOR = '#a9bfd0'
/* ------------------------------------------------------------------ */
/*  Shader for smooth, cinematic surface formation                     */
/* ------------------------------------------------------------------ */

const SURFACE_VERTEX_SHADER = `
  attribute vec3 color;
  uniform float uProgress;
  uniform float uTime;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vColor = color;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;
    // Radial formation wave expanding smoothly from center
    float dist = length(pos.xy) / 4.4;
    float wave = smoothstep(dist - 0.2, dist + 0.1, uProgress);
    pos.z *= wave;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const SURFACE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uProgress;
  uniform float uHighlight;

  void main() {
    // Elegant two-point studio lighting with rim
    vec3 keyDir = normalize(vec3(-0.4, -0.6, 1.0));
    vec3 fillDir = normalize(vec3(0.6, 0.4, 0.5));
    vec3 rimDir = normalize(vec3(0.0, 0.8, -0.3));

    float keyDiff = max(dot(vNormal, keyDir), 0.0);
    float fillDiff = max(dot(vNormal, fillDir), 0.0);
    float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);

    vec3 litColor = vColor * (0.38 + keyDiff * 0.52 + fillDiff * 0.22) + vec3(0.12, 0.16, 0.28) * rim * 0.45;

    // Subtle highlight pulse when focusing on surface
    if (uHighlight > 0.01) {
      litColor += vec3(0.12, 0.16, 0.28) * uHighlight;
    }

    float alpha = smoothstep(0.0, 0.2, uProgress);
    gl_FragColor = vec4(litColor, alpha);
  }
`

/* ------------------------------------------------------------------ */
/*  HelloSurface Component                                             */
/* ------------------------------------------------------------------ */

export default function HelloSurface({
  func,
  calculatedGrid,
  autoRotate,
  showCriticalPoints,
  showGradient,
  showGrid,
  showAxes,
  colorMap,
  riemannGrid,
  showRiemannColumns,
  highlightedElement,
  onPointSelect,
  onRiemannCellHover,
  onRiemannOmittedChange,
  onSurfaceDiagnostics,
}: HelloSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const autoRotateRef = useRef(autoRotate)
  const criticalPointsVisibleRef = useRef(showCriticalPoints)
  const gradientVisibleRef = useRef(showGradient)
  const gridVisibleRef = useRef(showGrid)
  const axesVisibleRef = useRef(showAxes)
  const sceneRef = useRef<Scene | null>(null)
  const cameraRef = useRef<PerspectiveCamera | null>(null)
  const criticalPointsRef = useRef<Group | null>(null)
  const gradientRef = useRef<Group | null>(null)
  const gridRef = useRef<LineSegments | null>(null)
  const axesRef = useRef<Group | null>(null)
  const surfaceMeshRef = useRef<Mesh | null>(null)
  const surfaceMaterialRef = useRef<ShaderMaterial | null>(null)
  const riemannColumnsRef = useRef<RiemannColumnsObject | null>(null)
  const riemannGridRef = useRef(riemannGrid)
  const showRiemannColumnsRef = useRef(showRiemannColumns)
  const onRiemannCellHoverRef = useRef(onRiemannCellHover)
  const onRiemannOmittedChangeRef = useRef(onRiemannOmittedChange)
  const hoveredRiemannCellRef = useRef<{
    mesh: InstancedMesh
    instanceId: number
    color: Color
  } | null>(null)
  const onPointSelectRef = useRef(onPointSelect)
  const onSurfaceDiagnosticsRef = useRef(onSurfaceDiagnostics)
  const funcRef = useRef(func)
  const colorMapRef = useRef(colorMap)
  const calculatedGridRef = useRef(calculatedGrid)
  const lastAppliedFunctionRef = useRef<VisualizableFunction | null>(null)
  const lastAppliedGridRef = useRef<SurfaceGrid | null>(null)
  const lastAppliedColorMapRef = useRef<SurfaceColorMap | null>(null)
  const sceneRangeRef = useRef<VisualizableFunction['range'] | null>(null)
  const hasCalculatedGrid = calculatedGrid !== null

  useEffect(() => {
    riemannGridRef.current = riemannGrid
  }, [riemannGrid])

  useEffect(() => {
    showRiemannColumnsRef.current = showRiemannColumns
    if (riemannColumnsRef.current) {
      riemannColumnsRef.current.mesh.visible = showRiemannColumns
    }
    if (!showRiemannColumns) onRiemannCellHoverRef.current?.(null)
  }, [showRiemannColumns])

  useEffect(() => {
    onRiemannCellHoverRef.current = onRiemannCellHover
  }, [onRiemannCellHover])

  useEffect(() => {
    onRiemannOmittedChangeRef.current = onRiemannOmittedChange
  }, [onRiemannOmittedChange])

  useEffect(() => {
    funcRef.current = func
  }, [func])

  useEffect(() => {
    colorMapRef.current = colorMap
  }, [colorMap])

  useEffect(() => {
    calculatedGridRef.current = calculatedGrid
  }, [calculatedGrid])

  useEffect(() => {
    onPointSelectRef.current = onPointSelect
  }, [onPointSelect])

  useEffect(() => {
    onSurfaceDiagnosticsRef.current = onSurfaceDiagnostics
  }, [onSurfaceDiagnostics])

  useEffect(() => {
    autoRotateRef.current = autoRotate
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
    }
  }, [autoRotate])

  useEffect(() => {
    criticalPointsVisibleRef.current = showCriticalPoints
    if (criticalPointsRef.current) {
      criticalPointsRef.current.visible = showCriticalPoints
    }
  }, [showCriticalPoints])

  useEffect(() => {
    gradientVisibleRef.current = showGradient
    if (gradientRef.current) {
      gradientRef.current.visible = showGradient
    }
  }, [showGradient])

  useEffect(() => {
    gridVisibleRef.current = showGrid
    if (gridRef.current) {
      gridRef.current.visible = showGrid
    }
  }, [showGrid])

  useEffect(() => {
    axesVisibleRef.current = showAxes
    if (axesRef.current) {
      axesRef.current.visible = showAxes
    }
  }, [showAxes])

  useEffect(() => {
    if (surfaceMaterialRef.current) {
      const uHighlight = surfaceMaterialRef.current.uniforms['uHighlight']
      if (uHighlight) {
        uHighlight.value = highlightedElement === 'surface' ? 0.35 : 0.0
      }
    }
  }, [highlightedElement])

  const handleCanvasEvent = useCallback(
    (
      event: MouseEvent,
      camera: PerspectiveCamera,
      renderer: WebGLRenderer,
      surfaceMesh: Mesh,
      criticalGroup: Group,
    ) => {
      if (!onPointSelectRef.current) return

      const rect = renderer.domElement.getBoundingClientRect()
      const mouse = new Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )

      const raycaster = new Raycaster()
      raycaster.setFromCamera(mouse, camera)
      const gradientDetails = (
        x: number,
        y: number,
      ): Partial<Pick<PointInfo, 'gradient' | 'gradientMagnitude'>> => {
        const gradient = funcRef.current.gradient?.(x, y)
        if (!gradient || !gradient.every(Number.isFinite)) return {}
        const gradientMagnitude = Math.hypot(gradient[0], gradient[1])
        if (!Number.isFinite(gradientMagnitude)) return {}
        return { gradient, gradientMagnitude }
      }

      // 1. Raycast critical points with high priority
      if (criticalPointsVisibleRef.current) {
        const criticalHits = raycaster.intersectObjects(criticalGroup.children, true)
        const hit = criticalHits[0]
        if (hit) {
          let targetObj = hit.object
          while (
            targetObj.parent &&
            !targetObj.userData['criticalPoint'] &&
            targetObj !== criticalGroup
          ) {
            targetObj = targetObj.parent
          }
          const cpData = targetObj.userData['criticalPoint'] as
            CriticalPointData | undefined
          if (cpData) {
            onPointSelectRef.current({
              x: cpData.x,
              y: cpData.y,
              z: cpData.z,
              ...gradientDetails(cpData.x, cpData.y),
              criticalPoint: cpData,
              screenX: event.clientX,
              screenY: event.clientY,
            })
            return
          }
        }
      }

      // 2. Raycast surface
      const surfaceHits = raycaster.intersectObject(surfaceMesh)
      const hitSurface = surfaceHits[0]
      if (hitSurface) {
        const point = hitSurface.point
        const z = funcRef.current.evaluate(point.x, point.y)
        if (!Number.isFinite(z)) {
          onPointSelectRef.current(null)
          return
        }
        onPointSelectRef.current({
          x: point.x,
          y: point.y,
          z,
          ...gradientDetails(point.x, point.y),
          screenX: event.clientX,
          screenY: event.clientY,
        })
      } else {
        onPointSelectRef.current(null)
      }
    },
    [],
  )

  useEffect(() => {
    const container = containerRef.current
    const initialFunction = funcRef.current
    const initialGrid = calculatedGridRef.current
    if (!container || !hasCalculatedGrid || !initialGrid) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
    } catch {
      const message = document.createElement('p')
      message.className = 'scene-error'
      message.setAttribute('role', 'alert')
      message.textContent =
        'Não foi possível iniciar o WebGL neste navegador. Verifique se a aceleração gráfica está ativa.'
      container.replaceChildren(message)
      return
    }

    const scene = new Scene()
    sceneRef.current = scene
    scene.background = new Color(BG_COLOR)

    const domainSpan = Math.max(
      initialFunction.domain.x.max - initialFunction.domain.x.min,
      initialFunction.domain.y.max - initialFunction.domain.y.min,
    )
    const rangeSpan = initialFunction.range.max - initialFunction.range.min
    const sceneScale = Math.max(domainSpan, rangeSpan, 1)
    const cameraDistance = sceneScale * 2.55
    const camera = new PerspectiveCamera(38, 1, 0.1, sceneScale * 20)
    cameraRef.current = camera
    camera.up.set(0, 0, 1)
    camera.position.set(
      cameraDistance * 0.55,
      -cameraDistance * 0.66,
      cameraDistance * 0.5,
    )
    const targetZ = (initialFunction.range.min + initialFunction.range.max) / 2
    camera.lookAt(0, 0, targetZ)

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(BG_COLOR)
    renderer.domElement.className = 'scene-webgl'
    renderer.domElement.setAttribute('tabindex', '0')
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.setAttribute('aria-label', initialFunction.formulaPlain)
    container.replaceChildren(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.target.set(0, 0, targetZ)
    controls.enableDamping = true
    controls.dampingFactor = 0.055
    controls.autoRotate = autoRotateRef.current
    controls.autoRotateSpeed = 0.38
    controls.screenSpacePanning = false
    controls.minDistance = sceneScale * 0.72
    controls.maxDistance = sceneScale * 4.5
    controls.maxPolarAngle = Math.PI * 0.85
    controls.update()

    // Lighting setup
    scene.add(new AmbientLight('#dbeafe', 0.55))
    const keyLight = new DirectionalLight('#ffffff', 1.9)
    keyLight.position.set(-4, -6, 11)
    scene.add(keyLight)
    const fillLight = new DirectionalLight('#818cf8', 0.45)
    fillLight.position.set(6, 5, 2.5)
    scene.add(fillLight)
    const rimLight = new DirectionalLight('#38bdf8', 0.25)
    rimLight.position.set(-2, 6, -3)
    scene.add(rimLight)

    // Build scene objects decoupled from hardcoding
    const {
      mesh: surfaceMesh,
      material: surfaceMaterial,
      diagnostics,
    } = createSurfaceMesh(initialFunction, initialGrid, true, colorMapRef.current)
    onSurfaceDiagnosticsRef.current?.(diagnostics)
    surfaceMeshRef.current = surfaceMesh
    surfaceMaterialRef.current = surfaceMaterial
    lastAppliedFunctionRef.current = initialFunction
    lastAppliedGridRef.current = initialGrid
    lastAppliedColorMapRef.current = colorMapRef.current
    sceneRangeRef.current = initialFunction.range
    scene.add(surfaceMesh)

    const criticalPoints = createRefinedCriticalPoints(initialFunction.criticalPoints)
    criticalPoints.visible = criticalPointsVisibleRef.current
    criticalPointsRef.current = criticalPoints
    scene.add(criticalPoints)

    const gradient = createRefinedGradientField(initialFunction)
    gradient.visible = gradientVisibleRef.current
    gradientRef.current = gradient
    scene.add(gradient)

    const grid = createFloorGrid(initialFunction.domain, initialFunction.range)
    grid.visible = gridVisibleRef.current
    gridRef.current = grid
    scene.add(grid)

    const axesGroup = createRefinedAxesGroup(initialFunction)
    axesGroup.visible = axesVisibleRef.current
    axesRef.current = axesGroup
    scene.add(axesGroup)

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect()
      if (width === 0 || height === 0) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    })
    resizeObserver.observe(container)

    const onCanvasClick = (e: MouseEvent) => {
      handleCanvasEvent(
        e,
        camera,
        renderer,
        surfaceMeshRef.current ?? surfaceMesh,
        criticalPointsRef.current ?? criticalPoints,
      )
    }
    renderer.domElement.addEventListener('click', onCanvasClick)

    const pointerRaycaster = new Raycaster()
    const pointerCoordinates = new Vector2()
    const clearRiemannHover = () => {
      const previous = hoveredRiemannCellRef.current
      if (previous) {
        previous.mesh.setColorAt(previous.instanceId, previous.color)
        if (previous.mesh.instanceColor) previous.mesh.instanceColor.needsUpdate = true
        hoveredRiemannCellRef.current = null
      }
      renderer.domElement.style.cursor = 'grab'
      onRiemannCellHoverRef.current?.(null)
    }

    const onPointerMove = (event: PointerEvent) => {
      const columns = riemannColumnsRef.current
      const data = riemannGridRef.current
      if (
        !showRiemannColumnsRef.current ||
        !columns ||
        !data ||
        !columns.mesh.visible
      ) {
        clearRiemannHover()
        return
      }

      const rect = renderer.domElement.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      pointerCoordinates.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      pointerRaycaster.setFromCamera(pointerCoordinates, camera)
      const hit = pointerRaycaster.intersectObject(columns.mesh, false)[0]
      const instanceId = hit?.instanceId
      if (instanceId === undefined) {
        clearRiemannHover()
        return
      }

      renderer.domElement.style.cursor = 'pointer'
      const previous = hoveredRiemannCellRef.current
      if (previous?.mesh !== columns.mesh || previous.instanceId !== instanceId) {
        if (previous) previous.mesh.setColorAt(previous.instanceId, previous.color)
        const originalColor = new Color()
        columns.mesh.getColorAt(instanceId, originalColor)
        columns.mesh.setColorAt(instanceId, new Color('#fff0c2'))
        if (columns.mesh.instanceColor) columns.mesh.instanceColor.needsUpdate = true
        hoveredRiemannCellRef.current = {
          mesh: columns.mesh,
          instanceId,
          color: originalColor,
        }

        const cellIndex = columns.cellIndices[instanceId]
        if (cellIndex === undefined) return
        const row = Math.floor(cellIndex / data.ySubdivisions)
        const column = cellIndex % data.ySubdivisions
        const value = data.values[cellIndex]!
        onRiemannCellHoverRef.current?.({
          row,
          column,
          x: data.sampleX[cellIndex]!,
          y: data.sampleY[cellIndex]!,
          value,
          deltaArea: Math.abs(data.deltaX * data.deltaY),
          contribution: value * data.deltaX * data.deltaY,
        })
      }
    }

    const onPointerLeave = () => clearRiemannHover()
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)

    // Animation loop: smooth initial surface emergence
    const animationDuration = REDUCED_MOTION ? 0.001 : 2.0
    const startTime = performance.now()
    let animationComplete = false

    renderer.setAnimationLoop(() => {
      controls.update()

      if (!animationComplete) {
        const elapsed = (performance.now() - startTime) / 1000
        const progress = Math.min(elapsed / animationDuration, 1.0)
        const eased = 1 - Math.pow(1 - progress, 4)

        const pUniform = surfaceMaterial.uniforms['uProgress']
        const tUniform = surfaceMaterial.uniforms['uTime']
        if (pUniform) pUniform.value = eased
        if (tUniform) tUniform.value = elapsed

        if (progress >= 1.0) {
          animationComplete = true
        }
      }

      renderer.render(scene, camera)
    })

    return () => {
      renderer.setAnimationLoop(null)
      renderer.domElement.removeEventListener('click', onCanvasClick)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      clearRiemannHover()
      resizeObserver.disconnect()
      controls.dispose()
      controlsRef.current = null
      criticalPointsRef.current = null
      gradientRef.current = null
      gridRef.current = null
      axesRef.current = null
      surfaceMeshRef.current = null
      surfaceMaterialRef.current = null
      riemannColumnsRef.current = null
      sceneRef.current = null
      cameraRef.current = null
      lastAppliedFunctionRef.current = null
      lastAppliedGridRef.current = null
      lastAppliedColorMapRef.current = null
      sceneRangeRef.current = null
      scene.traverse((object) => {
        if (
          object instanceof Mesh ||
          object instanceof Line ||
          object instanceof LineSegments ||
          object instanceof Sprite
        ) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material]
          for (const mat of materials) {
            if (mat instanceof SpriteMaterial) mat.map?.dispose()
            mat.dispose()
          }
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [hasCalculatedGrid, handleCanvasEvent])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !riemannGrid) return

    const columns = buildRiemannColumns(riemannGrid, colorMap)
    columns.mesh.visible = showRiemannColumnsRef.current
    riemannColumnsRef.current = columns
    scene.add(columns.mesh)
    onRiemannOmittedChangeRef.current?.(columns.omittedCount)

    return () => {
      scene.remove(columns.mesh)
      disposeObject(columns.mesh)
      if (riemannColumnsRef.current === columns) riemannColumnsRef.current = null
      if (hoveredRiemannCellRef.current?.mesh === columns.mesh) {
        hoveredRiemannCellRef.current = null
        onRiemannCellHoverRef.current?.(null)
      }
    }
  }, [riemannGrid, colorMap])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !calculatedGrid) return
    if (
      lastAppliedGridRef.current === calculatedGrid &&
      lastAppliedColorMapRef.current === colorMap
    )
      return

    const nextSurface = createSurfaceMesh(func, calculatedGrid, false, colorMap)
    const previousSurface = surfaceMeshRef.current
    if (previousSurface) {
      scene.remove(previousSurface)
      disposeObject(previousSurface)
    }
    surfaceMeshRef.current = nextSurface.mesh
    surfaceMaterialRef.current = nextSurface.material
    const highlight = nextSurface.material.uniforms['uHighlight']
    if (highlight) highlight.value = highlightedElement === 'surface' ? 0.35 : 0
    scene.add(nextSurface.mesh)

    const replaceObject = <T extends Group | LineSegments>(
      current: T | null,
      next: T,
      assign: (value: T) => void,
    ) => {
      if (current) {
        scene.remove(current)
        disposeObject(current)
      }
      assign(next)
      scene.add(next)
    }

    containerRef.current
      ?.querySelector('canvas')
      ?.setAttribute('aria-label', func.formulaPlain)
    onSurfaceDiagnosticsRef.current?.(nextSurface.diagnostics)

    const previousFunction = lastAppliedFunctionRef.current
    const domainChanged =
      !previousFunction ||
      previousFunction.domain.x.min !== func.domain.x.min ||
      previousFunction.domain.x.max !== func.domain.x.max ||
      previousFunction.domain.y.min !== func.domain.y.min ||
      previousFunction.domain.y.max !== func.domain.y.max
    const functionChanged = !previousFunction || previousFunction.id !== func.id
    const cachedRange = sceneRangeRef.current
    const rangeMargin = cachedRange
      ? Math.max((cachedRange.max - cachedRange.min) * 0.08, 0.1)
      : 0
    const rangeExpanded =
      !cachedRange ||
      func.range.min < cachedRange.min - rangeMargin ||
      func.range.max > cachedRange.max + rangeMargin

    if (functionChanged || domainChanged || rangeExpanded) {
      const criticalPoints = createRefinedCriticalPoints(func.criticalPoints)
      criticalPoints.visible = criticalPointsVisibleRef.current
      replaceObject(criticalPointsRef.current, criticalPoints, (value) => {
        criticalPointsRef.current = value
      })

      const gradient = createRefinedGradientField(func)
      gradient.visible = gradientVisibleRef.current
      replaceObject(gradientRef.current, gradient, (value) => {
        gradientRef.current = value
      })

      const floorGrid = createFloorGrid(func.domain, func.range)
      floorGrid.visible = gridVisibleRef.current
      replaceObject(gridRef.current, floorGrid, (value) => {
        gridRef.current = value
      })

      const axes = createRefinedAxesGroup(func)
      axes.visible = axesVisibleRef.current
      replaceObject(axesRef.current, axes, (value) => {
        axesRef.current = value
      })

      sceneRangeRef.current =
        functionChanged || domainChanged
          ? func.range
          : {
              min: Math.min(cachedRange?.min ?? func.range.min, func.range.min),
              max: Math.max(cachedRange?.max ?? func.range.max, func.range.max),
            }
    }

    if (cameraRef.current && controlsRef.current) {
      const camera = cameraRef.current
      const controls = controlsRef.current
      const domainSpan = Math.max(
        func.domain.x.max - func.domain.x.min,
        func.domain.y.max - func.domain.y.min,
      )
      const sceneScale = Math.max(domainSpan, func.range.max - func.range.min, 1)
      if (functionChanged || domainChanged) {
        const direction = camera.position.clone().sub(controls.target)
        if (direction.lengthSq() === 0) direction.set(1, -1, 1)
        direction.normalize()
        const targetZ = (func.range.min + func.range.max) / 2
        controls.target.set(0, 0, targetZ)
        camera.position
          .copy(controls.target)
          .addScaledVector(direction, sceneScale * 2.55)
        camera.near = 0.1
        controls.minDistance = sceneScale * 0.72
        controls.maxDistance = sceneScale * 4.5
        controls.update()
      }
      if (rangeExpanded) {
        camera.far = Math.max(camera.far, sceneScale * 20)
        camera.updateProjectionMatrix()
      }
    }

    lastAppliedFunctionRef.current = func
    lastAppliedGridRef.current = calculatedGrid
    lastAppliedColorMapRef.current = colorMap
  }, [func, calculatedGrid, highlightedElement, colorMap])

  return <div className="scene-canvas" ref={containerRef} />
}

/* ------------------------------------------------------------------ */
/*  Surface Generation (Decoupled from specific formula)               */
/* ------------------------------------------------------------------ */

function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    if (
      child instanceof Mesh ||
      child instanceof Line ||
      child instanceof LineSegments ||
      child instanceof Sprite
    ) {
      child.geometry.dispose()
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]
      for (const material of materials) {
        if (material instanceof SpriteMaterial) material.map?.dispose()
        material.dispose()
      }
    }
  })
}

function createSurfaceMesh(
  func: VisualizableFunction,
  grid: SurfaceGrid,
  animateIn = false,
  colorMap: SurfaceColorMap = 'atlas',
): {
  mesh: Mesh<BufferGeometry, ShaderMaterial>
  material: ShaderMaterial
  diagnostics: SurfaceDiagnostics
} {
  const sideLength = SURFACE_SEGMENTS + 1
  const colors = new Float32Array(grid.validVertices.length * 3)
  const normals = new Float32Array(grid.validVertices.length * 3)
  const rangeSpan = Math.max(func.range.max - func.range.min, 0.001)

  for (let index = 0; index < grid.validVertices.length; index += 1) {
    const valid = grid.validVertices[index] === 1
    let fx = grid.gradientX[index]!
    let fy = grid.gradientY[index]!
    if (!Number.isFinite(fx) || !Number.isFinite(fy) || !valid) {
      const estimated = estimateGridGradient(
        grid,
        Math.floor(index / sideLength),
        index % sideLength,
      )
      fx = estimated[0]
      fy = estimated[1]
    }

    let nx = -fx
    let ny = -fy
    let len = Math.hypot(nx, ny, 1)
    if (!Number.isFinite(len)) {
      nx = 0
      ny = 0
      len = 1
    }
    normals[index * 3] = nx / len
    normals[index * 3 + 1] = ny / len
    normals[index * 3 + 2] = 1 / len

    const z = grid.heights[index]!
    const t = valid ? (z - func.range.min) / rangeSpan : 0.5
    const [red, green, blue] = evaluateHeightColor(t, colorMap)
    colors[index * 3] = red
    colors[index * 3 + 1] = green
    colors[index * 3 + 2] = blue
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(grid.positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.setIndex(grid.indices)

  const material = new ShaderMaterial({
    vertexShader: SURFACE_VERTEX_SHADER,
    fragmentShader: SURFACE_FRAGMENT_SHADER,
    uniforms: {
      uProgress: { value: REDUCED_MOTION || !animateIn ? 1.0 : 0.0 },
      uTime: { value: 0.0 },
      uHighlight: { value: 0.0 },
    },
    side: DoubleSide,
    transparent: true,
  })

  const mesh = new Mesh(geometry, material)
  mesh.name = 'surface'
  return {
    mesh,
    material,
    diagnostics: {
      invalidSampleCount: grid.invalidSampleCount,
      totalSampleCount: grid.validVertices.length,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Refined, Elegant Critical Points (No more "bola grande e feia"!)   */
/* ------------------------------------------------------------------ */

function createRefinedCriticalPoints(points: CriticalPointData[]): Group {
  const root = new Group()
  root.name = 'critical-points-layer'

  // Micro-scaled, high-precision geometry:
  const sphereGeo = new SphereGeometry(0.045, 20, 16)
  const octaGeo = new OctahedronGeometry(0.048, 0)
  const ringGeo = new TorusGeometry(0.082, 0.0045, 10, 36)
  const pinGeo = new CylinderGeometry(0.003, 0.003, 0.045, 8)
  const hitGeo = new SphereGeometry(0.16, 10, 8) // Invisible hit target for comfortable mouse interaction

  // Subtle jewel-like materials with gentle luminous reflections
  const maxMat = new MeshStandardMaterial({
    color: '#d79c9d',
    emissive: '#6b343b',
    emissiveIntensity: 0.28,
    roughness: 0.34,
    metalness: 0.16,
  })
  const minMat = new MeshStandardMaterial({
    color: '#8bb6a2',
    emissive: '#305742',
    emissiveIntensity: 0.28,
    roughness: 0.34,
    metalness: 0.16,
  })
  const saddleMat = new MeshStandardMaterial({
    color: '#d5b879',
    emissive: '#655025',
    emissiveIntensity: 0.26,
    roughness: 0.36,
    metalness: 0.14,
  })
  const ringMat = new MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.45,
  })
  const hitMat = new MeshBasicMaterial({
    visible: false,
  })

  for (const cp of points) {
    const pointGroup = new Group()
    pointGroup.position.set(cp.x, cp.y, cp.z)
    pointGroup.userData['criticalPoint'] = cp

    // 1. Invisible generous hit-test sphere for effortless mouse interaction
    const hitMesh = new Mesh(hitGeo, hitMat)
    hitMesh.name = `hit-critical-${cp.kind}`
    pointGroup.add(hitMesh)

    // 2. Visible elegant marker tailored to point type
    if (cp.kind === 'maximum') {
      // Sleek ruby beacon + fine tangent ring flat at z=1
      const jewel = new Mesh(sphereGeo, maxMat)
      jewel.name = `marker-max`
      pointGroup.add(jewel)

      const halo = new Mesh(ringGeo, ringMat)
      halo.name = 'halo'
      pointGroup.add(halo)

      const pin = new Mesh(pinGeo, maxMat)
      pin.position.z = -0.02
      pointGroup.add(pin)
    } else if (cp.kind === 'minimum') {
      // Sleek emerald bead + fine ground ring nestled in valley
      const jewel = new Mesh(sphereGeo, minMat)
      jewel.name = `marker-min`
      pointGroup.add(jewel)

      const halo = new Mesh(ringGeo, ringMat)
      halo.name = 'halo'
      pointGroup.add(halo)

      const pin = new Mesh(pinGeo, minMat)
      pin.position.z = 0.02
      pointGroup.add(pin)
    } else {
      // Refined golden octahedron (diamond) reflecting hyperbolic saddle curvature
      const diamond = new Mesh(octaGeo, saddleMat)
      diamond.name = `marker-saddle`
      diamond.rotation.set(Math.PI / 4, 0, Math.PI / 4)
      pointGroup.add(diamond)
    }

    root.add(pointGroup)
  }

  return root
}

/* ------------------------------------------------------------------ */
/*  Refined Gradient Field (Consistent arrow length + magnitude color) */
/* ------------------------------------------------------------------ */

function createRefinedGradientField(func: VisualizableFunction): Group {
  const group = new Group()
  group.name = 'gradient-field-layer'
  const evaluateGradient = func.gradient
  if (!evaluateGradient) return group

  const spacing = 0.72
  const xMin = func.domain.x.min
  const xMax = func.domain.x.max
  const yMin = func.domain.y.min
  const yMax = func.domain.y.max

  const countX = Math.floor((xMax - xMin) / spacing)
  const countY = Math.floor((yMax - yMin) / spacing)

  let maxMag = 0.0001
  const entries: {
    x: number
    y: number
    z: number
    fx: number
    fy: number
    mag: number
  }[] = []

  for (let i = 0; i <= countX; i++) {
    const x = xMin + (i + 0.5) * spacing
    if (x > xMax) continue
    for (let j = 0; j <= countY; j++) {
      const y = yMin + (j + 0.5) * spacing
      if (y > yMax) continue

      const [fx, fy] = evaluateGradient(x, y)
      const mag = Math.hypot(fx, fy)
      if (mag < 0.09) continue // Near-zero gradient (near critical points) omitted to prevent clutter

      const z = func.evaluate(x, y)
      entries.push({ x, y, z, fx, fy, mag })
      if (mag > maxMag) maxMag = mag
    }
  }

  for (const { x, y, z, fx, fy, mag } of entries) {
    // Lift gradient onto the tangent plane: r(x,y) = (x, y, f(x,y))
    // Direction along tangent plane is (fx, fy, fx^2 + fy^2)
    const dz = fx * fx + fy * fy
    const direction = new Vector3(fx, fy, dz).normalize()
    const origin = new Vector3(x, y, z + 0.035)

    // Sleek constant-length arrows (avoids misleading scale); color conveys magnitude!
    const arrowLength = 0.32
    const normMag = mag / maxMag
    const arrowColor = getGradientColor(normMag)

    const arrow = new ArrowHelper(
      direction,
      origin,
      arrowLength,
      arrowColor,
      0.08,
      0.045,
    )
    arrow.name = 'gradient-arrow'
    group.add(arrow)
  }

  return group
}

function getGradientColor(t: number): string {
  // Dim indigo (slow ascent) -> bright amber-orange (steepest ascent)
  const r = Math.round(90 + t * 165)
  const g = Math.round(110 + t * 65 - t * t * 45)
  const b = Math.round(210 - t * 160)
  return `rgb(${r},${g},${b})`
}

/* ------------------------------------------------------------------ */
/*  Floor Grid & Axes                                                  */
/* ------------------------------------------------------------------ */

function createFloorGrid(
  domain: VisualizableFunction['domain'],
  range: VisualizableFunction['range'],
): LineSegments<BufferGeometry, LineBasicMaterial> {
  const positions: number[] = []
  const divisions = 14
  const xMin = domain.x.min
  const xMax = domain.x.max
  const yMin = domain.y.min
  const yMax = domain.y.max
  const stepX = (xMax - xMin) / divisions
  const stepY = (yMax - yMin) / divisions
  const floorZ = Math.min(0, range.min) - Math.max((range.max - range.min) * 0.08, 0.1)

  for (let i = 0; i <= divisions; i += 1) {
    const x = xMin + i * stepX
    if (Math.abs(x) < 0.02) continue
    positions.push(x, yMin, floorZ, x, yMax, floorZ)
  }
  for (let j = 0; j <= divisions; j += 1) {
    const y = yMin + j * stepY
    if (Math.abs(y) < 0.02) continue
    positions.push(xMin, y, floorZ, xMax, y, floorZ)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  const material = new LineBasicMaterial({
    color: GRID_COLOR,
    transparent: true,
    opacity: 0.65,
  })
  return new LineSegments(geometry, material)
}

function createRefinedAxesGroup(func: VisualizableFunction): Group {
  const group = new Group()
  group.name = 'axes-layer'

  const configs: {
    dir: Vector3
    color: string
    label: string
    min: number
    max: number
    piLabels: boolean
    pointAt: (value: number) => Vector3
    tickStart: (value: number) => Vector3
    tickEnd: (value: number) => Vector3
    labelAt: (value: number) => Vector3
  }[] = [
    {
      dir: new Vector3(1, 0, 0),
      color: AXIS_X_COLOR,
      label: 'x',
      min: func.domain.x.min,
      max: func.domain.x.max,
      piLabels: true,
      pointAt: (value) => new Vector3(value, 0, 0),
      tickStart: (value) => new Vector3(value, 0, -0.055),
      tickEnd: (value) => new Vector3(value, 0, 0.055),
      labelAt: (value) => new Vector3(value, -0.2, 0.06),
    },
    {
      dir: new Vector3(0, 1, 0),
      color: AXIS_Y_COLOR,
      label: 'y',
      min: func.domain.y.min,
      max: func.domain.y.max,
      piLabels: true,
      pointAt: (value) => new Vector3(0, value, 0),
      tickStart: (value) => new Vector3(0, value, -0.055),
      tickEnd: (value) => new Vector3(0, value, 0.055),
      labelAt: (value) => new Vector3(-0.2, value, 0.06),
    },
    {
      dir: new Vector3(0, 0, 1),
      color: AXIS_Z_COLOR,
      label: 'z',
      min: func.range.min,
      max: func.range.max,
      piLabels: false,
      pointAt: (value) => new Vector3(0, 0, value),
      tickStart: (value) => new Vector3(-0.055, 0, value),
      tickEnd: (value) => new Vector3(0.055, 0, value),
      labelAt: (value) => new Vector3(0.19, 0, value),
    },
  ]

  for (const config of configs) {
    const { dir, color, label, min, max, piLabels } = config
    const axisLineGeometry = new BufferGeometry().setFromPoints([
      config.pointAt(min),
      config.pointAt(max),
    ])
    const axisLine = new Line(
      axisLineGeometry,
      new LineBasicMaterial({ color, transparent: true, opacity: 0.58 }),
    )
    axisLine.name = `axis-line-${label}`
    group.add(axisLine)

    // ArrowHelper contributes only its arrowhead; the thin axis line spans both signs.
    if (max > 0) {
      const arrow = new ArrowHelper(dir, new Vector3(0, 0, 0), max, color, 0.14, 0.07)
      arrow.line.visible = false
      arrow.name = `axis-direction-${label}`
      group.add(arrow)
    }

    const axisLabel = createTextSprite(label, color, 38, 0.36)
    axisLabel.position.copy(config.pointAt(max).addScaledVector(dir, 0.35))
    axisLabel.name = `axis-label-${label}`
    group.add(axisLabel)

    const tickPositions: number[] = []
    for (const tick of createAxisTicks(min, max, piLabels)) {
      tickPositions.push(...config.tickStart(tick.value).toArray())
      tickPositions.push(...config.tickEnd(tick.value).toArray())

      if (Math.abs(tick.value) < 1e-8 && label !== 'z') continue
      const tickLabel = createTextSprite(tick.label, '#c0c9c8', 24, 0.4)
      tickLabel.position.copy(config.labelAt(tick.value))
      tickLabel.name = `tick-label-${label}-${tick.label}`
      group.add(tickLabel)
    }

    const tickGeometry = new BufferGeometry()
    tickGeometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(tickPositions), 3),
    )
    const tickLines = new LineSegments(
      tickGeometry,
      new LineBasicMaterial({ color, transparent: true, opacity: 0.52 }),
    )
    tickLines.name = `axis-ticks-${label}`
    group.add(tickLines)
  }

  return group
}

function createAxisTicks(
  min: number,
  max: number,
  preferPiLabels: boolean,
): { value: number; label: string }[] {
  const span = max - min
  if (!Number.isFinite(span) || span <= 0) return []

  if (preferPiLabels && Math.max(Math.abs(min), Math.abs(max)) <= Math.PI * 4) {
    const piStep = Math.PI / 2
    const alignedMin = Math.abs(min / piStep - Math.round(min / piStep)) < 1e-6
    const alignedMax = Math.abs(max / piStep - Math.round(max / piStep)) < 1e-6
    const first = Math.ceil((min - 1e-8) / piStep)
    const last = Math.floor((max + 1e-8) / piStep)
    if (alignedMin && alignedMax && last - first >= 2 && last - first <= 8) {
      return Array.from({ length: last - first + 1 }, (_, index) => {
        const multiple = first + index
        return {
          value: multiple * piStep,
          label: formatPiMultiple(multiple),
        }
      })
    }
  }

  const roughStep = span / 4
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const normalizedStep = roughStep / magnitude
  const niceFactor =
    normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10
  const step = niceFactor * magnitude
  const first = Math.ceil((min - step * 1e-8) / step) * step
  const ticks: { value: number; label: string }[] = []

  for (
    let value = first;
    value <= max + step * 1e-8 && ticks.length < 10;
    value += step
  ) {
    const rounded = Number(value.toPrecision(8))
    ticks.push({ value: rounded, label: formatAxisNumber(rounded) })
  }
  return ticks
}

function formatPiMultiple(multiple: number): string {
  if (multiple === 0) return '0'
  const sign = multiple < 0 ? '−' : ''
  const absolute = Math.abs(multiple)
  if (absolute === 1) return `${sign}π/2`
  if (absolute === 2) return `${sign}π`
  return `${sign}${absolute / 2}π`
}

function formatAxisNumber(value: number): string {
  if (Math.abs(value) < 1e-8) return '0'
  const formatted = Number(value.toPrecision(3)).toString()
  return value < 0 ? `−${formatted.slice(1)}` : formatted
}

function createTextSprite(
  text: string,
  color: string,
  fontSize: number,
  scale: number = 0.5,
): Sprite {
  const canvas = document.createElement('canvas')
  const size = 128
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = color
    ctx.font = `600 ${fontSize}px "DM Mono", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, size / 2, size / 2)
  }

  const texture = new CanvasTexture(canvas)
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  })
  const sprite = new Sprite(material)
  sprite.scale.set(scale, scale, 1)
  return sprite
}
