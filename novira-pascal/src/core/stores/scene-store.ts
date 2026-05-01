import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { temporal } from 'zundo'
import { produce } from 'immer'
import { generateId } from '@/lib/utils'
import type { AnyNode, SceneDocument, Transform, Material, Item } from '@/core/schema'

interface SceneState {
  // Scene data
  nodes: Record<string, AnyNode>
  rootNodeIds: string[]
  activeLevelId: string | null
  settings: SceneDocument['settings']

  // Selection state
  selectedNodeIds: string[]
  hoveredNodeId: string | null

  // Dirty tracking for performance
  dirtyNodeIds: Set<string>

  // Project metadata
  projectId: string | null
  projectName: string
  isDirty: boolean
  lastSavedAt: Date | null

  // Actions
  // Node CRUD
  createNode: (node: Omit<AnyNode, 'id'>, parentId?: string | null) => string
  updateNode: (id: string, updates: Partial<AnyNode>) => void
  deleteNode: (id: string) => void
  duplicateNode: (id: string) => string | null

  // Transform
  setNodeTransform: (id: string, transform: Partial<Transform>) => void
  setNodePosition: (id: string, position: [number, number, number]) => void
  setNodeRotation: (id: string, rotation: number) => void
  setNodeScale: (id: string, scale: [number, number, number]) => void

  // Materials
  setNodeMaterial: (id: string, material: Material) => void
  setNodeMaterialSlot: (id: string, slot: string, material: Material) => void

  // Selection
  selectNode: (id: string, additive?: boolean) => void
  selectNodes: (ids: string[]) => void
  deselectAll: () => void
  setHoveredNode: (id: string | null) => void

  // Hierarchy
  reparentNode: (id: string, newParentId: string | null) => void
  moveNodeUp: (id: string) => void
  moveNodeDown: (id: string) => void

  // Scene management
  loadScene: (document: SceneDocument, projectId: string, projectName: string) => void
  clearScene: () => void
  getSceneDocument: () => SceneDocument

  // Dirty tracking
  markDirty: (id: string) => void
  clearDirty: () => Set<string>

  // Project state
  setProjectId: (id: string) => void
  setProjectName: (name: string) => void
  markSaved: () => void
}

const DEFAULT_SETTINGS: SceneDocument['settings'] = {
  gridSize: 1,
  snapToGrid: true,
  units: 'meters',
  ambientLight: { color: '#ffffff', intensity: 0.5 },
  environment: { backgroundColor: '#1a1a2e', showGrid: true },
}

export const useSceneStore = create<SceneState>()(
  subscribeWithSelector(
    temporal(
      (set, get) => ({
        // Initial state
        nodes: {},
        rootNodeIds: [],
        activeLevelId: null,
        settings: DEFAULT_SETTINGS,
        selectedNodeIds: [],
        hoveredNodeId: null,
        dirtyNodeIds: new Set(),
        projectId: null,
        projectName: 'Untitled Project',
        isDirty: false,
        lastSavedAt: null,

        // Create node
        createNode: (nodeData, parentId = null) => {
          const id = generateId()
          const node = { ...nodeData, id, parentId, childIds: [] } as AnyNode

          set(
            produce((state: SceneState) => {
              state.nodes[id] = node
              state.dirtyNodeIds.add(id)
              state.isDirty = true

              if (parentId && state.nodes[parentId]) {
                state.nodes[parentId].childIds.push(id)
                state.dirtyNodeIds.add(parentId)
              } else {
                state.rootNodeIds.push(id)
              }
            })
          )

          return id
        },

        // Update node
        updateNode: (id, updates) => {
          set(
            produce((state: SceneState) => {
              if (state.nodes[id]) {
                Object.assign(state.nodes[id], updates)
                state.dirtyNodeIds.add(id)
                state.isDirty = true
              }
            })
          )
        },

        // Delete node (recursive)
        deleteNode: (id) => {
          set(
            produce((state: SceneState) => {
              const deleteRecursive = (nodeId: string) => {
                const node = state.nodes[nodeId]
                if (!node) return

                // Delete children first
                for (const childId of [...node.childIds]) {
                  deleteRecursive(childId)
                }

                // Remove from parent's childIds
                if (node.parentId && state.nodes[node.parentId]) {
                  const parent = state.nodes[node.parentId]
                  parent.childIds = parent.childIds.filter((cid) => cid !== nodeId)
                  state.dirtyNodeIds.add(node.parentId)
                } else {
                  state.rootNodeIds = state.rootNodeIds.filter((rid) => rid !== nodeId)
                }

                // Remove from selection
                state.selectedNodeIds = state.selectedNodeIds.filter((sid) => sid !== nodeId)

                // Delete node
                delete state.nodes[nodeId]
                state.isDirty = true
              }

              deleteRecursive(id)
            })
          )
        },

        // Duplicate node
        duplicateNode: (id) => {
          const node = get().nodes[id]
          if (!node) return null

          const duplicateData = { ...node }
          delete (duplicateData as Record<string, unknown>).id
          duplicateData.name = `${node.name} Copy`

          return get().createNode(duplicateData, node.parentId)
        },

        // Transform helpers
        setNodeTransform: (id, transform) => {
          set(
            produce((state: SceneState) => {
              const node = state.nodes[id]
              if (node && 'transform' in node) {
                Object.assign(node.transform, transform)
                state.dirtyNodeIds.add(id)
                state.isDirty = true
              }
            })
          )
        },

        setNodePosition: (id, position) => {
          get().setNodeTransform(id, { position })
        },

        setNodeRotation: (id, rotation) => {
          get().setNodeTransform(id, { rotation })
        },

        setNodeScale: (id, scale) => {
          get().setNodeTransform(id, { scale })
        },

        // Materials
        setNodeMaterial: (id, material) => {
          set(
            produce((state: SceneState) => {
              const node = state.nodes[id]
              if (node && 'material' in node) {
                (node as { material: Material }).material = material
                state.dirtyNodeIds.add(id)
                state.isDirty = true
              }
            })
          )
        },

        setNodeMaterialSlot: (id, slot, material) => {
          set(
            produce((state: SceneState) => {
              const node = state.nodes[id]
              if (node && node.type === 'item') {
                const itemNode = node as Item
                if (!itemNode.materials) itemNode.materials = {}
                itemNode.materials[slot] = material
                state.dirtyNodeIds.add(id)
                state.isDirty = true
              }
            })
          )
        },

        // Selection
        selectNode: (id, additive = false) => {
          set(
            produce((state: SceneState) => {
              if (additive) {
                if (state.selectedNodeIds.includes(id)) {
                  state.selectedNodeIds = state.selectedNodeIds.filter((sid) => sid !== id)
                } else {
                  state.selectedNodeIds.push(id)
                }
              } else {
                state.selectedNodeIds = [id]
              }
            })
          )
        },

        selectNodes: (ids) => {
          set({ selectedNodeIds: ids })
        },

        deselectAll: () => {
          set({ selectedNodeIds: [] })
        },

        setHoveredNode: (id) => {
          set({ hoveredNodeId: id })
        },

        // Hierarchy
        reparentNode: (id, newParentId) => {
          set(
            produce((state: SceneState) => {
              const node = state.nodes[id]
              if (!node) return

              // Remove from old parent
              if (node.parentId && state.nodes[node.parentId]) {
                state.nodes[node.parentId].childIds = state.nodes[node.parentId].childIds.filter(
                  (cid) => cid !== id
                )
                state.dirtyNodeIds.add(node.parentId)
              } else {
                state.rootNodeIds = state.rootNodeIds.filter((rid) => rid !== id)
              }

              // Add to new parent
              node.parentId = newParentId
              if (newParentId && state.nodes[newParentId]) {
                state.nodes[newParentId].childIds.push(id)
                state.dirtyNodeIds.add(newParentId)
              } else {
                state.rootNodeIds.push(id)
              }

              state.dirtyNodeIds.add(id)
              state.isDirty = true
            })
          )
        },

        moveNodeUp: (id) => {
          set(
            produce((state: SceneState) => {
              const node = state.nodes[id]
              if (!node) return

              const siblings = node.parentId
                ? state.nodes[node.parentId]?.childIds
                : state.rootNodeIds

              if (!siblings) return

              const index = siblings.indexOf(id)
              if (index > 0) {
                ;[siblings[index - 1], siblings[index]] = [siblings[index], siblings[index - 1]]
                state.isDirty = true
              }
            })
          )
        },

        moveNodeDown: (id) => {
          set(
            produce((state: SceneState) => {
              const node = state.nodes[id]
              if (!node) return

              const siblings = node.parentId
                ? state.nodes[node.parentId]?.childIds
                : state.rootNodeIds

              if (!siblings) return

              const index = siblings.indexOf(id)
              if (index < siblings.length - 1) {
                ;[siblings[index], siblings[index + 1]] = [siblings[index + 1], siblings[index]]
                state.isDirty = true
              }
            })
          )
        },

        // Scene management
        loadScene: (document, projectId, projectName) => {
          set({
            nodes: document.nodes,
            rootNodeIds: document.rootNodeIds,
            activeLevelId: document.activeLevelId,
            settings: { ...DEFAULT_SETTINGS, ...document.settings },
            selectedNodeIds: [],
            hoveredNodeId: null,
            dirtyNodeIds: new Set(),
            projectId,
            projectName,
            isDirty: false,
            lastSavedAt: new Date(),
          })
        },

        clearScene: () => {
          set({
            nodes: {},
            rootNodeIds: [],
            activeLevelId: null,
            settings: DEFAULT_SETTINGS,
            selectedNodeIds: [],
            hoveredNodeId: null,
            dirtyNodeIds: new Set(),
            isDirty: false,
          })
        },

        getSceneDocument: () => {
          const state = get()
          return {
            version: 1,
            nodes: state.nodes,
            rootNodeIds: state.rootNodeIds,
            activeLevelId: state.activeLevelId,
            settings: state.settings,
          }
        },

        // Dirty tracking
        markDirty: (id) => {
          set(
            produce((state: SceneState) => {
              state.dirtyNodeIds.add(id)
            })
          )
        },

        clearDirty: () => {
          const dirty = get().dirtyNodeIds
          set({ dirtyNodeIds: new Set() })
          return dirty
        },

        // Project state
        setProjectId: (id) => set({ projectId: id }),
        setProjectName: (name) => set({ projectName: name, isDirty: true }),
        markSaved: () => set({ isDirty: false, lastSavedAt: new Date() }),
      }),
      {
        // Zundo config for undo/redo
        partialize: (state) => ({
          nodes: state.nodes,
          rootNodeIds: state.rootNodeIds,
          activeLevelId: state.activeLevelId,
          settings: state.settings,
        }),
        limit: 50,
      }
    )
  )
)

// Selectors
export const selectNode = (id: string) => (state: SceneState) => state.nodes[id]
export const selectSelectedNodes = (state: SceneState) =>
  state.selectedNodeIds.map((id) => state.nodes[id]).filter(Boolean)
export const selectFirstSelectedNode = (state: SceneState) =>
  state.selectedNodeIds.length > 0 ? state.nodes[state.selectedNodeIds[0]] : null
