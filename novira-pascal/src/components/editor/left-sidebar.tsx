'use client'

import { useState } from 'react'
import { 
  Layers, 
  Box, 
  Wand2, 
  Palette,
  Image,
  Sun,
  FolderOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/core/stores/editor-store'
import { HierarchyPanel } from '../panels/hierarchy-panel'
import { NoviraAssetPanel } from '../panels/novira-asset-panel'
import { NoviraAIPanel } from '../panels/novira-ai-panel'
import { NoviraMaterialPanel } from '../panels/novira-material-panel'
import { PrimitivesPanel } from '../panels/primitives-panel'
import { EnvironmentPanel } from '../panels/environment-panel'

const panels = [
  { id: 'hierarchy', icon: Layers, label: 'Hierarchy', component: HierarchyPanel },
  { id: 'assets', icon: FolderOpen, label: 'Online Assets', component: NoviraAssetPanel },
  { id: 'ai', icon: Wand2, label: 'AI Generate', component: NoviraAIPanel },
  { id: 'materials', icon: Palette, label: 'Materials', component: NoviraMaterialPanel },
  { id: 'primitives', icon: Box, label: 'Primitives', component: PrimitivesPanel },
  { id: 'environment', icon: Sun, label: 'Environment', component: EnvironmentPanel },
]

export function LeftSidebar() {
  const activeSidebarPanel = useEditorStore((s) => s.activeSidebarPanel)
  const setActiveSidebarPanel = useEditorStore((s) => s.setActiveSidebarPanel)
  const setLeftPanelOpen = useEditorStore((s) => s.setLeftPanelOpen)
  const [collapsed, setCollapsed] = useState(false)

  const activePanel = panels.find((p) => p.id === activeSidebarPanel)

  return (
    <div className="flex h-full border-r border-border bg-sidebar">
      {/* Icon tabs */}
      <div className="flex flex-col w-12 border-r border-border">
        {panels.map((panel) => (
          <button
            key={panel.id}
            onClick={() => {
              if (activeSidebarPanel === panel.id) {
                setCollapsed(!collapsed)
              } else {
                setActiveSidebarPanel(panel.id)
                setCollapsed(false)
              }
            }}
            className={cn(
              "flex items-center justify-center w-12 h-12 transition-colors",
              activeSidebarPanel === panel.id && !collapsed
                ? "bg-accent text-accent-foreground border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
            title={panel.label}
          >
            <panel.icon className="w-5 h-5" />
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setLeftPanelOpen(false)}
          className="flex items-center justify-center w-12 h-12 text-muted-foreground hover:text-foreground hover:bg-accent/50"
          title="Close sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Panel content */}
      {!collapsed && activePanel && (
        <div className="w-72 flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between h-10 px-3 border-b border-border">
            <span className="text-sm font-medium">{activePanel.label}</span>
          </div>
          
          {/* Panel body */}
          <div className="flex-1 overflow-y-auto panel-scrollbar">
            <activePanel.component />
          </div>
        </div>
      )}
    </div>
  )
}
