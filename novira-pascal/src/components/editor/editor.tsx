'use client'

import { useEffect, useCallback } from 'react'
import { Viewer } from '@/components/viewer/viewer'
import { Toolbar } from './toolbar'
import { LeftSidebar } from './left-sidebar'
import { RightSidebar } from './right-sidebar'
import { useEditorStore } from '@/core/stores/editor-store'
import { useSceneStore } from '@/core/stores/scene-store'

export function Editor() {
  const setShiftPressed = useEditorStore((s) => s.setShiftPressed)
  const setCtrlPressed = useEditorStore((s) => s.setCtrlPressed)
  const setAltPressed = useEditorStore((s) => s.setAltPressed)
  const leftPanelOpen = useEditorStore((s) => s.leftPanelOpen)
  const rightPanelOpen = useEditorStore((s) => s.rightPanelOpen)
  const deleteNode = useSceneStore((s) => s.deleteNode)
  const selectedNodeIds = useSceneStore((s) => s.selectedNodeIds)
  const duplicateNode = useSceneStore((s) => s.duplicateNode)
  const selectNode = useSceneStore((s) => s.selectNode)

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Update modifier states
    setShiftPressed(e.shiftKey)
    setCtrlPressed(e.ctrlKey || e.metaKey)
    setAltPressed(e.altKey)

    // Don't handle shortcuts when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    // Delete selected nodes
    if (e.key === 'Delete' || e.key === 'Backspace') {
      selectedNodeIds.forEach(deleteNode)
    }

    // Duplicate (Ctrl+D)
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault()
      selectedNodeIds.forEach((id) => {
        const newId = duplicateNode(id)
        if (newId) selectNode(newId)
      })
    }

    // Undo (Ctrl+Z)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      useSceneStore.temporal.getState().undo()
    }

    // Redo (Ctrl+Shift+Z or Ctrl+Y)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      useSceneStore.temporal.getState().redo()
    }

    // Tool shortcuts
    if (e.key === 'v' || e.key === 'Escape') useEditorStore.getState().setTool('select')
    if (e.key === 'g') useEditorStore.getState().setTool('move')
    if (e.key === 'r') useEditorStore.getState().setTool('rotate')
    if (e.key === 's' && !e.ctrlKey && !e.metaKey) useEditorStore.getState().setTool('scale')

  }, [selectedNodeIds, deleteNode, duplicateNode, selectNode, setShiftPressed, setCtrlPressed, setAltPressed])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    setShiftPressed(e.shiftKey)
    setCtrlPressed(e.ctrlKey || e.metaKey)
    setAltPressed(e.altKey)
  }, [setShiftPressed, setCtrlPressed, setAltPressed])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        {leftPanelOpen && <LeftSidebar />}

        {/* 3D Viewport */}
        <div className="flex-1 relative editor-canvas">
          <Viewer />
        </div>

        {/* Right sidebar */}
        {rightPanelOpen && <RightSidebar />}
      </div>
    </div>
  )
}
