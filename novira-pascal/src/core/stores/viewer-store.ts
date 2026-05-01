import { create } from 'zustand'

interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

interface ViewerState {
  // Camera
  camera: CameraState
  setCameraPosition: (position: [number, number, number]) => void
  setCameraTarget: (target: [number, number, number]) => void
  setCameraFov: (fov: number) => void
  resetCamera: () => void

  // View options
  showGrid: boolean
  showAxes: boolean
  showStats: boolean
  showWireframe: boolean
  setShowGrid: (show: boolean) => void
  setShowAxes: (show: boolean) => void
  setShowStats: (show: boolean) => void
  setShowWireframe: (show: boolean) => void

  // Environment
  hdriUrl: string | null
  backgroundColor: string
  ambientIntensity: number
  setHdriUrl: (url: string | null) => void
  setBackgroundColor: (color: string) => void
  setAmbientIntensity: (intensity: number) => void

  // Rendering
  shadowsEnabled: boolean
  antialiasEnabled: boolean
  setShadowsEnabled: (enabled: boolean) => void
  setAntialiasEnabled: (enabled: boolean) => void

  // Performance
  isRendering: boolean
  fps: number
  setIsRendering: (rendering: boolean) => void
  setFps: (fps: number) => void
}

const DEFAULT_CAMERA: CameraState = {
  position: [10, 10, 10],
  target: [0, 0, 0],
  fov: 50,
}

export const useViewerStore = create<ViewerState>((set) => ({
  // Camera
  camera: DEFAULT_CAMERA,
  setCameraPosition: (position) =>
    set((state) => ({ camera: { ...state.camera, position } })),
  setCameraTarget: (target) =>
    set((state) => ({ camera: { ...state.camera, target } })),
  setCameraFov: (fov) =>
    set((state) => ({ camera: { ...state.camera, fov } })),
  resetCamera: () => set({ camera: DEFAULT_CAMERA }),

  // View options
  showGrid: true,
  showAxes: true,
  showStats: false,
  showWireframe: false,
  setShowGrid: (show) => set({ showGrid: show }),
  setShowAxes: (show) => set({ showAxes: show }),
  setShowStats: (show) => set({ showStats: show }),
  setShowWireframe: (show) => set({ showWireframe: show }),

  // Environment
  hdriUrl: null,
  backgroundColor: '#1a1a2e',
  ambientIntensity: 0.5,
  setHdriUrl: (url) => set({ hdriUrl: url }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setAmbientIntensity: (intensity) => set({ ambientIntensity: intensity }),

  // Rendering
  shadowsEnabled: true,
  antialiasEnabled: true,
  setShadowsEnabled: (enabled) => set({ shadowsEnabled: enabled }),
  setAntialiasEnabled: (enabled) => set({ antialiasEnabled: enabled }),

  // Performance
  isRendering: false,
  fps: 0,
  setIsRendering: (rendering) => set({ isRendering: rendering }),
  setFps: (fps) => set({ fps }),
}))
