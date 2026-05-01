'use client'

import { 
  MousePointer2, 
  Move, 
  RotateCcw, 
  Maximize2, 
  Box, 
  Grid3X3,
  Undo2,
  Redo2,
  Save,
  Settings,
  Eye,
  Layers,
  Sun,
  Play,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore, Tool, EditorMode } from '@/core/stores/editor-store'
import { useSceneStore } from '@/core/stores/scene-store'
import { useViewerStore } from '@/core/stores/viewer-store'
import Link from 'next/link'

const tools: { id: Tool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'move', icon: Move, label: 'Move', shortcut: 'G' },
  { id: 'rotate', icon: RotateCcw, label: 'Rotate', shortcut: 'R' },
  { id: 'scale', icon: Maximize2, label: 'Scale', shortcut: 'S' },
]

const modes: { id: EditorMode; icon: typeof Box; label: string }[] = [
  { id: '3d', icon: Box, label: '3D View' },
  { id: '2d', icon: Grid3X3, label: '2D Floor Plan' },
  { id: 'walkthrough', icon: Play, label: 'Walkthrough' },
]

export function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const setTool = useEditorStore((s) => s.setTool)
  const mode = useEditorStore((s) => s.mode)
  const setMode = useEditorStore((s) => s.setMode)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled)
  
  const projectName = useSceneStore((s) => s.projectName)
  const isDirty = useSceneStore((s) => s.isDirty)
  
  const showGrid = useViewerStore((s) => s.showGrid)
  const setShowGrid = useViewerStore((s) => s.setShowGrid)
  const showAxes = useViewerStore((s) => s.showAxes)
  const setShowAxes = useViewerStore((s) => s.setShowAxes)

  const canUndo = useSceneStore.temporal.getState().pastStates.length > 0
  const canRedo = useSceneStore.temporal.getState().futureStates.length > 0

  return (
    <div className="flex items-center h-12 px-2 border-b border-border bg-sidebar gap-1">
      {/* Home button */}
      <Link 
        href="/dashboard"
        className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
      >
        <Home className="w-4 h-4" />
      </Link>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Project name */}
      <div className="flex items-center gap-2 px-2">
        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
          {projectName}
        </span>
        {isDirty && <span className="text-xs text-muted-foreground">(unsaved)</span>}
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => useSceneStore.temporal.getState().undo()}
          disabled={!canUndo}
          className={cn(
            "p-2 rounded hover:bg-accent transition-colors",
            !canUndo && "opacity-50 cursor-not-allowed"
          )}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => useSceneStore.temporal.getState().redo()}
          disabled={!canRedo}
          className={cn(
            "p-2 rounded hover:bg-accent transition-colors",
            !canRedo && "opacity-50 cursor-not-allowed"
          )}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Tools */}
      <div className="flex items-center gap-0.5">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            className={cn(
              "p-2 rounded transition-colors",
              activeTool === tool.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            )}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <tool.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Mode selector */}
      <div className="flex items-center gap-0.5">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "p-2 rounded transition-colors",
              mode === m.id
                ? "bg-secondary text-secondary-foreground"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            )}
            title={m.label}
          >
            <m.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* View options */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={cn(
            "p-2 rounded transition-colors",
            showGrid
              ? "bg-secondary text-secondary-foreground"
              : "hover:bg-accent text-muted-foreground"
          )}
          title="Toggle Grid"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowAxes(!showAxes)}
          className={cn(
            "p-2 rounded transition-colors",
            showAxes
              ? "bg-secondary text-secondary-foreground"
              : "hover:bg-accent text-muted-foreground"
          )}
          title="Toggle Axes"
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={cn(
            "p-2 rounded transition-colors",
            snapEnabled
              ? "bg-secondary text-secondary-foreground"
              : "hover:bg-accent text-muted-foreground"
          )}
          title="Toggle Snap"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Actions */}
      <button
        className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
        title="Save"
      >
        <Save className="w-4 h-4" />
      </button>
      <button
        className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
        title="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  )
}
