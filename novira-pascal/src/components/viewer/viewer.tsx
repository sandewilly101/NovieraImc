'use client'

import { Suspense, useRef, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  GizmoHelper, 
  GizmoViewport,
  Stats,
  TransformControls,
  useGLTF
} from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '@/core/stores/scene-store'
import { useEditorStore } from '@/core/stores/editor-store'
import { useViewerStore } from '@/core/stores/viewer-store'
import type { AnyNode, Item, Primitive, Light } from '@/core/schema'

// Scene content component
function SceneContent() {
  const nodes = useSceneStore((s) => s.nodes)
  const rootNodeIds = useSceneStore((s) => s.rootNodeIds)
  const selectedNodeIds = useSceneStore((s) => s.selectedNodeIds)
  const selectNode = useSceneStore((s) => s.selectNode)
  const setHoveredNode = useSceneStore((s) => s.setHoveredNode)

  const renderNode = (nodeId: string): React.ReactNode => {
    const node = nodes[nodeId]
    if (!node || !node.visible) return null

    return (
      <NodeRenderer
        key={node.id}
        node={node}
        isSelected={selectedNodeIds.includes(node.id)}
        onSelect={(e) => {
          e.stopPropagation()
          selectNode(node.id, e.shiftKey)
        }}
        onPointerOver={() => setHoveredNode(node.id)}
        onPointerOut={() => setHoveredNode(null)}
      >
        {node.childIds.map(renderNode)}
      </NodeRenderer>
    )
  }

  return <>{rootNodeIds.map(renderNode)}</>
}

// Individual node renderer
function NodeRenderer({ 
  node, 
  isSelected, 
  onSelect, 
  onPointerOver, 
  onPointerOut,
  children 
}: { 
  node: AnyNode
  isSelected: boolean
  onSelect: (e: THREE.Event) => void
  onPointerOver: () => void
  onPointerOut: () => void
  children?: React.ReactNode
}) {
  const groupRef = useRef<THREE.Group>(null)

  const transform = 'transform' in node ? node.transform : { position: [0, 0, 0] as [number, number, number], rotation: 0, scale: [1, 1, 1] as [number, number, number] }

  return (
    <group
      ref={groupRef}
      position={transform.position}
      rotation={[0, transform.rotation, 0]}
      scale={transform.scale}
    >
      {node.type === 'item' && (
        <ItemMesh 
          node={node as Item} 
          isSelected={isSelected}
          onSelect={onSelect}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        />
      )}
      {node.type === 'primitive' && (
        <PrimitiveMesh 
          node={node as Primitive} 
          isSelected={isSelected}
          onSelect={onSelect}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        />
      )}
      {node.type === 'light' && (
        <LightComponent node={node as Light} />
      )}
      {children}
    </group>
  )
}

// Item (GLTF model) mesh
function ItemMesh({ 
  node, 
  isSelected,
  onSelect,
  onPointerOver,
  onPointerOut
}: { 
  node: Item
  isSelected: boolean
  onSelect: (e: THREE.Event) => void
  onPointerOver: () => void
  onPointerOut: () => void
}) {
  return (
    <Suspense fallback={<LoadingBox />}>
      <GLTFModel 
        url={node.asset.src} 
        isSelected={isSelected}
        onSelect={onSelect}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        castShadow={node.castShadow}
        receiveShadow={node.receiveShadow}
      />
    </Suspense>
  )
}

// GLTF model loader
function GLTFModel({ 
  url, 
  isSelected,
  onSelect,
  onPointerOver,
  onPointerOut,
  castShadow,
  receiveShadow
}: { 
  url: string
  isSelected: boolean
  onSelect: (e: THREE.Event) => void
  onPointerOver: () => void
  onPointerOut: () => void
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const { scene } = useGLTF(url)
  const clonedScene = scene.clone()

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = castShadow ?? true
        child.receiveShadow = receiveShadow ?? true
      }
    })
  }, [clonedScene, castShadow, receiveShadow])

  return (
    <primitive 
      object={clonedScene} 
      onClick={onSelect}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    />
  )
}

// Loading placeholder
function LoadingBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#666" wireframe />
    </mesh>
  )
}

// Primitive shapes
function PrimitiveMesh({ 
  node, 
  isSelected,
  onSelect,
  onPointerOver,
  onPointerOut
}: { 
  node: Primitive
  isSelected: boolean
  onSelect: (e: THREE.Event) => void
  onPointerOver: () => void
  onPointerOut: () => void
}) {
  const { shape, dimensions, material } = node

  const geometry = (() => {
    switch (shape) {
      case 'box':
        return <boxGeometry args={[dimensions.width ?? 1, dimensions.height ?? 1, dimensions.depth ?? 1]} />
      case 'sphere':
        return <sphereGeometry args={[dimensions.radius ?? 0.5, 32, 32]} />
      case 'cylinder':
        return <cylinderGeometry args={[dimensions.radiusTop ?? 0.5, dimensions.radiusBottom ?? 0.5, dimensions.height ?? 1, 32]} />
      case 'cone':
        return <coneGeometry args={[dimensions.radius ?? 0.5, dimensions.height ?? 1, 32]} />
      case 'plane':
        return <planeGeometry args={[dimensions.width ?? 1, dimensions.height ?? 1]} />
      case 'torus':
        return <torusGeometry args={[dimensions.radius ?? 0.5, dimensions.tube ?? 0.2, 16, 32]} />
      default:
        return <boxGeometry args={[1, 1, 1]} />
    }
  })()

  return (
    <mesh
      castShadow
      receiveShadow
      onClick={onSelect}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {geometry}
      <meshStandardMaterial
        color={material?.color ?? '#ffffff'}
        roughness={material?.roughness ?? 0.5}
        metalness={material?.metalness ?? 0}
        transparent={material?.transparent}
        opacity={material?.opacity ?? 1}
      />
      {isSelected && (
        <lineSegments>
          <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(1.02, 1.02, 1.02)]} />
          <lineBasicMaterial attach="material" color="#2563eb" />
        </lineSegments>
      )}
    </mesh>
  )
}

// Light component
function LightComponent({ node }: { node: Light }) {
  const { lightType, color, intensity, distance, decay, angle, penumbra, castShadow } = node

  switch (lightType) {
    case 'point':
      return (
        <pointLight
          color={color}
          intensity={intensity}
          distance={distance}
          decay={decay}
          castShadow={castShadow}
        />
      )
    case 'spot':
      return (
        <spotLight
          color={color}
          intensity={intensity}
          distance={distance}
          angle={angle}
          penumbra={penumbra}
          castShadow={castShadow}
        />
      )
    case 'directional':
      return (
        <directionalLight
          color={color}
          intensity={intensity}
          castShadow={castShadow}
        />
      )
    case 'ambient':
      return <ambientLight color={color} intensity={intensity} />
    default:
      return null
  }
}

// Transform gizmo for selected objects
function TransformGizmo() {
  const selectedNodeIds = useSceneStore((s) => s.selectedNodeIds)
  const nodes = useSceneStore((s) => s.nodes)
  const setNodePosition = useSceneStore((s) => s.setNodePosition)
  const setNodeRotation = useSceneStore((s) => s.setNodeRotation)
  const setNodeScale = useSceneStore((s) => s.setNodeScale)
  const activeTool = useEditorStore((s) => s.activeTool)
  const transformRef = useRef<THREE.Object3D>(null)

  const selectedNode = selectedNodeIds.length === 1 ? nodes[selectedNodeIds[0]] : null

  const handleTransformChange = useCallback(() => {
    if (!transformRef.current || !selectedNode) return

    const obj = transformRef.current
    const nodeId = selectedNode.id

    if (activeTool === 'move') {
      setNodePosition(nodeId, [obj.position.x, obj.position.y, obj.position.z])
    } else if (activeTool === 'rotate') {
      setNodeRotation(nodeId, obj.rotation.y)
    } else if (activeTool === 'scale') {
      setNodeScale(nodeId, [obj.scale.x, obj.scale.y, obj.scale.z])
    }
  }, [selectedNode, activeTool, setNodePosition, setNodeRotation, setNodeScale])

  if (!selectedNode || !['move', 'rotate', 'scale'].includes(activeTool)) {
    return null
  }

  if (!('transform' in selectedNode)) return null

  const mode = activeTool === 'move' ? 'translate' : activeTool === 'rotate' ? 'rotate' : 'scale'

  return (
    <TransformControls
      mode={mode}
      object={transformRef.current ?? undefined}
      onObjectChange={handleTransformChange}
    >
      <mesh ref={transformRef as React.RefObject<THREE.Mesh>} position={selectedNode.transform.position}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </TransformControls>
  )
}

// Main viewer component
export function Viewer() {
  const showGrid = useViewerStore((s) => s.showGrid)
  const showAxes = useViewerStore((s) => s.showAxes)
  const showStats = useViewerStore((s) => s.showStats)
  const backgroundColor = useViewerStore((s) => s.backgroundColor)
  const hdriUrl = useViewerStore((s) => s.hdriUrl)
  const ambientIntensity = useViewerStore((s) => s.ambientIntensity)
  const shadowsEnabled = useViewerStore((s) => s.shadowsEnabled)
  const deselectAll = useSceneStore((s) => s.deselectAll)

  return (
    <div className="w-full h-full">
      <Canvas
        shadows={shadowsEnabled}
        camera={{ position: [10, 10, 10], fov: 50 }}
        onPointerMissed={() => deselectAll()}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={[backgroundColor]} />

        {/* Lighting */}
        <ambientLight intensity={ambientIntensity} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1}
          castShadow={shadowsEnabled}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />

        {/* Environment */}
        {hdriUrl ? (
          <Environment files={hdriUrl} background />
        ) : (
          <Environment preset="city" />
        )}

        {/* Grid */}
        {showGrid && (
          <Grid
            infiniteGrid
            cellSize={1}
            cellThickness={0.5}
            sectionSize={5}
            sectionThickness={1}
            fadeDistance={50}
            fadeStrength={1}
            cellColor="#404040"
            sectionColor="#606060"
          />
        )}

        {/* Scene content */}
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>

        {/* Transform gizmo */}
        <TransformGizmo />

        {/* Controls */}
        <OrbitControls makeDefault />

        {/* Helpers */}
        {showAxes && (
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport labelColor="white" axisHeadScale={1} />
          </GizmoHelper>
        )}

        {showStats && <Stats />}
      </Canvas>
    </div>
  )
}
