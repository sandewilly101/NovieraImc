import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export type EditorMode = '3d' | '2d' | 'walkthrough'
export type Tool = 'select' | 'move' | 'rotate' | 'scale' | 'draw-wall' | 'draw-room' | 'place-item'
export type TransformSpace = 'world' | 'local'

interface EditorState {
  // Mode
  mode: EditorMode
  setMode: (mode: EditorMode) => void

  // Tool
  activeTool: Tool
  setTool: (tool: Tool) => void

  // Transform
  transformSpace: TransformSpace
  setTransformSpace: (space: TransformSpace) => void

  // Snapping
  snapEnabled: boolean
  snapValue: number
  rotationSnapEnabled: boolean
  rotationSnapValue: number
  setSnapEnabled: (enabled: boolean) => void
  setSnapValue: (value: number) => void
  setRotationSnapEnabled: (enabled: boolean) => void
  setRotationSnapValue: (value: number) => void

  // UI panels
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  bottomPanelOpen: boolean
  activeSidebarPanel: string | null
  setLeftPanelOpen: (open: boolean) => void
  setRightPanelOpen: (open: boolean) => void
  setBottomPanelOpen: (open: boolean) => void
  setActiveSidebarPanel: (panel: string | null) => void

  // Asset placement
  assetToPlace: {
    type: 'model' | 'primitive' | 'light'
    data: unknown
  } | null
  setAssetToPlace: (asset: { type: 'model' | 'primitive' | 'light'; data: unknown } | null) => void
  clearAssetToPlace: () => void

  // Keyboard modifiers
  shiftPressed: boolean
  ctrlPressed: boolean
  altPressed: boolean
  setShiftPressed: (pressed: boolean) => void
  setCtrlPressed: (pressed: boolean) => void
  setAltPressed: (pressed: boolean) => void

  // Clipboard
  clipboard: string[] // Node IDs
  copyNodes: (ids: string[]) => void
  clearClipboard: () => void
}

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set) => ({
    // Mode
    mode: '3d',
    setMode: (mode) => set({ mode }),

    // Tool
    activeTool: 'select',
    setTool: (tool) => set({ activeTool: tool }),

    // Transform
    transformSpace: 'world',
    setTransformSpace: (space) => set({ transformSpace: space }),

    // Snapping
    snapEnabled: true,
    snapValue: 0.25, // 25cm
    rotationSnapEnabled: true,
    rotationSnapValue: 15, // 15 degrees
    setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
    setSnapValue: (value) => set({ snapValue: value }),
    setRotationSnapEnabled: (enabled) => set({ rotationSnapEnabled: enabled }),
    setRotationSnapValue: (value) => set({ rotationSnapValue: value }),

    // UI panels
    leftPanelOpen: true,
    rightPanelOpen: true,
    bottomPanelOpen: false,
    activeSidebarPanel: 'hierarchy',
    setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
    setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
    setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),
    setActiveSidebarPanel: (panel) => set({ activeSidebarPanel: panel }),

    // Asset placement
    assetToPlace: null,
    setAssetToPlace: (asset) => set({ assetToPlace: asset, activeTool: 'place-item' }),
    clearAssetToPlace: () => set({ assetToPlace: null, activeTool: 'select' }),

    // Keyboard modifiers
    shiftPressed: false,
    ctrlPressed: false,
    altPressed: false,
    setShiftPressed: (pressed) => set({ shiftPressed: pressed }),
    setCtrlPressed: (pressed) => set({ ctrlPressed: pressed }),
    setAltPressed: (pressed) => set({ altPressed: pressed }),

    // Clipboard
    clipboard: [],
    copyNodes: (ids) => set({ clipboard: ids }),
    clearClipboard: () => set({ clipboard: [] }),
  }))
)
