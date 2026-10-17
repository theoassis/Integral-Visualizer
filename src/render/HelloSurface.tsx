import { useEffect, useRef } from 'react'
import {
  AmbientLight,
  ArrowHelper,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

interface HelloSurfaceProps {
  autoRotate: boolean
}

const DOMAIN_MIN = -Math.PI
const DOMAIN_MAX = Math.PI
const SEGMENTS = 88

export default function HelloSurface({ autoRotate }: HelloSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const autoRotateRef = useRef(autoRotate)

  useEffect(() => {
    autoRotateRef.current = autoRotate
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
    }
  }, [autoRotate])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: false })
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
    scene.background = new Color('#080d1b')

    const camera = new PerspectiveCamera(42, 1, 0.1, 80)
    camera.up.set(0, 0, 1)
    camera.position.set(8.6, -10.5, 8.2)
    camera.lookAt(0, 0, 0)

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor('#080d1b')
    renderer.domElement.className = 'scene-webgl'
    renderer.domElement.setAttribute(
      'aria-label',
      'Superfície tridimensional z igual a seno de x vezes cosseno de y',
    )
    container.replaceChildren(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.target.set(0, 0, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.055
    controls.autoRotate = autoRotateRef.current
    controls.autoRotateSpeed = 0.45
    controls.screenSpacePanning = false
    controls.minDistance = 5
    controls.maxDistance = 27
    controls.update()

    scene.add(new AmbientLight('#ffffff', 1.5))
    const keyLight = new DirectionalLight('#ffffff', 2.2)
    keyLight.position.set(-4, -5, 10)
    scene.add(keyLight)
    const fillLight = new DirectionalLight('#718eff', 0.65)
    fillLight.position.set(5, 4, 2)
    scene.add(fillLight)

    const surface = createSurface()
    scene.add(surface)
    scene.add(createFloorGrid())
    scene.add(createAxis(1, 0, 0, '#ff718b', 3.62))
    scene.add(createAxis(0, 1, 0, '#51d9b2', 3.62))
    scene.add(createAxis(0, 0, 1, '#8da8ff', 1.62))

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect()
      if (width === 0 || height === 0) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    })
    resizeObserver.observe(container)

    renderer.setAnimationLoop(() => {
      controls.update()
      renderer.render(scene, camera)
    })

    return () => {
      renderer.setAnimationLoop(null)
      resizeObserver.disconnect()
      controls.dispose()
      controlsRef.current = null
      scene.traverse((object) => {
        if (
          object instanceof Mesh ||
          object instanceof Line ||
          object instanceof LineSegments
        ) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material]
          for (const material of materials) material.dispose()
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="scene-canvas" ref={containerRef} />
}

function createSurface(): Mesh<BufferGeometry, MeshStandardMaterial> {
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const step = (DOMAIN_MAX - DOMAIN_MIN) / SEGMENTS

  for (let i = 0; i <= SEGMENTS; i += 1) {
    const x = DOMAIN_MIN + i * step
    for (let j = 0; j <= SEGMENTS; j += 1) {
      const y = DOMAIN_MIN + j * step
      const z = Math.sin(x) * Math.cos(y)
      positions.push(x, y, z)

      const amplitude = (z + 1) / 2
      const color = new Color().setHSL(0.64 - amplitude * 0.48, 0.78, 0.54)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let i = 0; i < SEGMENTS; i += 1) {
    for (let j = 0; j < SEGMENTS; j += 1) {
      const a = i * (SEGMENTS + 1) + j
      const b = a + SEGMENTS + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.48,
    metalness: 0.04,
    side: DoubleSide,
  })
  return new Mesh(geometry, material)
}

function createFloorGrid(): LineSegments<BufferGeometry, LineBasicMaterial> {
  const positions: number[] = []
  const divisions = 16
  const step = (DOMAIN_MAX - DOMAIN_MIN) / divisions
  const floorZ = -1.12

  for (let i = 0; i <= divisions; i += 1) {
    const offset = DOMAIN_MIN + i * step
    positions.push(DOMAIN_MIN, offset, floorZ, DOMAIN_MAX, offset, floorZ)
    positions.push(offset, DOMAIN_MIN, floorZ, offset, DOMAIN_MAX, floorZ)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  const material = new LineBasicMaterial({
    color: '#29334d',
    transparent: true,
    opacity: 0.68,
  })
  return new LineSegments(geometry, material)
}

function createAxis(
  x: number,
  y: number,
  z: number,
  color: string,
  length: number,
): ArrowHelper {
  return new ArrowHelper(
    new Vector3(x, y, z),
    new Vector3(0, 0, 0),
    length,
    color,
    0.18,
    0.09,
  )
}
