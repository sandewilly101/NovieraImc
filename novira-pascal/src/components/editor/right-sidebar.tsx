'use client'

import { ChevronRight } from 'lucide-react'
import { useEditorStore } from '@/core/stores/editor-store'
import { useSceneStore, selectFirstSelectedNode } from '@/core/stores/scene-store'
import { PropertiesPanel } from '../panels/properties-panel'

export function RightSidebar() {
  const setRightPanelOpen = useEditorStore((s) => s.setRightPanelOpen)
  const selectedNode = useSceneStore(selectFirstSelectedNode)
  const selectedCount = useSceneStore((s) => s.selectedNodeIds.length)

  return (
    <div className="w-72 flex flex-col border-l border-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-border">
        <span className="text-sm font-medium">
          {selectedCount === 0
            ? 'Properties'
            : selectedCount === 1
            ? selectedNode?.name || 'Selected'
            : `${selectedCount} selected`}
        </span>
        <button
          onClick={() => setRightPanelOpen(false)}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Close panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto panel-scrollbar">
        {selectedNode ? (
          <PropertiesPanel node={selectedNode} />
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Select an object to view properties
          </div>
        )}
      </div>
    </div>
  )
}
