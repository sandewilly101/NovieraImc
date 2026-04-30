import React, { useState, useEffect, useRef, useMemo } from 'react';
import useStore from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../utils/noviraToast';
import {
  dispatchPlannerInsertArcWalls,
  dispatchPlannerInsertRectRoomWalls,
  dispatchPlannerSelectDrawingHole,
  dispatchPlannerSnapCloseWallGap,
  dispatchRefreshPlannerRoomZones,
} from '../../utils/plannerReduxBridge';

const COMMANDS = [
  { id: 'add.box', label: 'Add Cube', category: 'Add', keys: '', action: (s) => s.addObject({ name: 'Cube', type: 'primitive', geo: 'box', color: '#e2e8f0', dimensions: [1, 1, 1] }) },
  { id: 'add.sphere', label: 'Add Sphere', category: 'Add', keys: '', action: (s) => s.addObject({ name: 'Sphere', type: 'primitive', geo: 'sphere', color: '#e2e8f0', dimensions: [1, 1, 1] }) },
  { id: 'add.cylinder', label: 'Add Cylinder', category: 'Add', keys: '', action: (s) => s.addObject({ name: 'Cylinder', type: 'primitive', geo: 'cylinder', color: '#e2e8f0', dimensions: [1, 2, 1] }) },
  { id: 'add.cone', label: 'Add Cone', category: 'Add', keys: '', action: (s) => s.addObject({ name: 'Cone', type: 'primitive', geo: 'cone', color: '#e2e8f0', dimensions: [1, 2, 1] }) },
  { id: 'add.torus', label: 'Add Torus', category: 'Add', keys: '', action: (s) => s.addObject({ name: 'Torus', type: 'primitive', geo: 'torus', color: '#e2e8f0', dimensions: [2, 2, 2] }) },
  { id: 'add.plane', label: 'Add Plane', category: 'Add', keys: '', action: (s) => s.addObject({ name: 'Plane', type: 'primitive', geo: 'plane', color: '#e2e8f0', dimensions: [2, 0.01, 2] }) },
  { id: 'add.light.point', label: 'Add Point Light', category: 'Add', keys: '', action: (s) => s.addObject({ name: 'Point Light', type: 'light', lightType: 'point', color: '#ffffff', intensity: 2, distance: 15, dimensions: [0.3, 0.3, 0.3], position: [0, 3, 0] }) },
  { id: 'add.light.spot', label: 'Add Spot Light', category: 'Add', keys: '', action: (s) => s.addObject({ name: 'Spot Light', type: 'light', lightType: 'spot', color: '#ffffff', intensity: 2, distance: 15, angle: Math.PI / 6, dimensions: [0.3, 0.3, 0.3], position: [0, 3, 0] }) },
  { id: 'add.light.dir', label: 'Add Directional Light', category: 'Add', keys: '', action: (s) => s.addObject({ name: 'Directional', type: 'light', lightType: 'directional', color: '#ffffff', intensity: 1.5, dimensions: [0.3, 0.3, 0.3], position: [0, 5, 0] }) },

  { id: 'edit.duplicate', label: 'Duplicate Selected', category: 'Edit', keys: 'Ctrl+D', action: (s) => s.duplicateSelected() },
  { id: 'edit.delete', label: 'Delete Selected', category: 'Edit', keys: 'Del', action: (s) => s.deleteSelected() },
  { id: 'edit.copy', label: 'Copy', category: 'Edit', keys: 'Ctrl+C', action: (s) => s.copySelected() },
  { id: 'edit.paste', label: 'Paste', category: 'Edit', keys: 'Ctrl+V', action: (s) => s.pasteClipboard() },
  { id: 'edit.selectall', label: 'Select All', category: 'Edit', keys: 'Ctrl+A', action: (s) => s.selectAll() },
  { id: 'edit.deselect', label: 'Deselect All', category: 'Edit', keys: 'Alt+A', action: (s) => s.deselectAll() },
  { id: 'edit.undo', label: 'Undo', category: 'Edit', keys: 'Ctrl+Z / Cmd+Z', action: (s) => { s.editorUndo(); } },
  { id: 'edit.redo', label: 'Redo', category: 'Edit', keys: 'Ctrl+Y · Ctrl+Shift+Z', action: (s) => { s.editorRedo(); } },
  { id: 'edit.group', label: 'Group Selected', category: 'Edit', keys: 'Ctrl+G', action: (s) => s.groupSelected() },
  { id: 'edit.ungroup', label: 'Ungroup', category: 'Edit', keys: 'Ctrl+Shift+G', action: (s) => s.ungroupSelected() },

  { id: 'tool.select', label: 'Select Tool', category: 'Tool', keys: 'Esc', action: (s) => s.setActiveTool('select') },
  { id: 'tool.move', label: 'Move Tool', category: 'Tool', keys: 'G', action: (s) => s.setActiveTool('move') },
  { id: 'tool.rotate', label: 'Rotate Tool', category: 'Tool', keys: 'R', action: (s) => s.setActiveTool('rotate') },
  { id: 'tool.scale', label: 'Scale Tool', category: 'Tool', keys: 'S', action: (s) => s.setActiveTool('scale') },
  { id: 'tool.focus', label: 'Focus on Selected', category: 'Tool', keys: 'F', action: (s) => s.setActiveTool('focus') },
  { id: 'tool.cursor', label: '3D Cursor Tool (spawn / import target)', category: 'Tool', keys: 'Shift+C', action: (s) => s.setActiveTool('cursor') },
  {
    id: 'ui.snapCursorMenu',
    label: 'Cursor & placement menu (like Blender Shift+S)',
    category: 'Tool',
    keys: 'Shift+S',
    action: (s) => s.setSnapCursorMenuOpen(!s.snapCursorMenuOpen),
  },
  {
    id: 'cursor.clear',
    label: 'Clear 3D cursor (viewport center for new objects)',
    category: 'Tool',
    keys: '',
    action: (s) => {
      s.clearThreeDCursor();
      showToast('3D cursor cleared.', 'ok');
    },
  },
  {
    id: 'cursor.snapGrid',
    label: 'Snap 3D cursor to 25 cm grid',
    category: 'Tool',
    keys: '',
    action: (s) => {
      if (!s.threeDCursorWorld) {
        showToast('Place the 3D cursor first.', 'warn');
        return;
      }
      if (s.objectSnapEnabled === false) {
        showToast('Turn Snap on in the status bar.', 'warn');
        return;
      }
      s.snapThreeDCursorToGrid();
      showToast('3D cursor snapped to grid.', 'ok');
    },
  },

  {
    id: 'view.isolate',
    label: 'Toggle isolate selection (solo in viewport)',
    category: 'View',
    keys: 'Ctrl+Shift+H',
    action: (s) => s.toggleIsolateSelected(),
  },
  { id: 'view.showAll', label: 'Show every object (clear all hiding)', category: 'View', keys: '', action: (s) => s.showAllSceneObjects() },
  { id: 'view.frameSelection', label: 'Frame camera on selection', category: 'View', keys: 'Home', action: (s) => s.frameCameraViewport('selection') },
  { id: 'view.frameAll', label: 'Frame camera on whole scene', category: 'View', keys: 'Shift+Home', action: (s) => s.frameCameraViewport('all') },
  {
    id: 'ui.shortcuts',
    label: 'Keyboard shortcuts (?)',
    category: 'View',
    keys: '?',
    action: () => {
      document.dispatchEvent(new CustomEvent('novira:open-shortcuts'));
    },
  },
  {
    id: 'ui.shortcutsNudge',
    label: 'Keyboard shortcuts: Nudge & transform',
    category: 'View',
    keys: '',
    action: () => {
      document.dispatchEvent(new CustomEvent('novira:open-shortcuts', { detail: { scrollToId: 'nudge' } }));
    },
  },
  {
    id: 'ui.shortcutsCamera',
    label: 'Keyboard shortcuts: Camera & frame',
    category: 'View',
    keys: '',
    action: () => {
      document.dispatchEvent(new CustomEvent('novira:open-shortcuts', { detail: { scrollToId: 'camera' } }));
    },
  },
  {
    id: 'ui.shortcutsEdit',
    label: 'Keyboard shortcuts: Copy, paste, undo',
    category: 'View',
    keys: '',
    action: () => {
      document.dispatchEvent(new CustomEvent('novira:open-shortcuts', { detail: { scrollToId: 'edit' } }));
    },
  },
  {
    id: 'ui.shortcutsCursor',
    label: 'Keyboard shortcuts: 3D cursor & Shift+S',
    category: 'View',
    keys: '',
    action: () => {
      document.dispatchEvent(new CustomEvent('novira:open-shortcuts', { detail: { scrollToId: 'cursor' } }));
    },
  },

  { id: 'nudge.xp', label: 'Nudge selection +X (25 cm)', category: 'Transform', keys: 'Alt+→', action: (s) => s.nudgeSelectedPosition(0.25, 0, 0) },
  { id: 'nudge.xn', label: 'Nudge selection −X (25 cm)', category: 'Transform', keys: 'Alt+←', action: (s) => s.nudgeSelectedPosition(-0.25, 0, 0) },
  { id: 'nudge.zp', label: 'Nudge selection +Z (25 cm)', category: 'Transform', keys: 'Alt+↑', action: (s) => s.nudgeSelectedPosition(0, 0, 0.25) },
  { id: 'nudge.zn', label: 'Nudge selection −Z (25 cm)', category: 'Transform', keys: 'Alt+↓', action: (s) => s.nudgeSelectedPosition(0, 0, -0.25) },
  { id: 'nudge.yp', label: 'Nudge selection +Y (25 cm)', category: 'Transform', keys: 'Alt+PgUp', action: (s) => s.nudgeSelectedPosition(0, 0.25, 0) },
  { id: 'nudge.yn', label: 'Nudge selection −Y (25 cm)', category: 'Transform', keys: 'Alt+PgDn', action: (s) => s.nudgeSelectedPosition(0, -0.25, 0) },

  { id: 'view.toggleWireframe', label: 'Toggle wireframe (all meshes)', category: 'View', keys: '', action: (s) => s.setWireframe(!s.wireframe) },
  {
    id: 'view.toggleAxisGizmo',
    label: 'Toggle corner X/Y/Z axis widget',
    category: 'View',
    keys: '',
    action: (s) => {
      const cur = s.viewportAxisGizmoEnabled !== false;
      s.setViewportAxisGizmoEnabled(!cur);
    },
  },
  {
    id: 'view.toggleTransformSpace',
    label: 'Toggle transform: World / Local gizmo',
    category: 'View',
    keys: 'Ctrl+,',
    action: (s) => s.toggleTransformSpace(),
  },
  { id: 'cursor.snap', label: 'Snap 3D Cursor to Selected Object', category: 'Tool', keys: '.', action: (s) => s.snapThreeDCursorToSelection() },
  {
    id: 'cursor.toggleSpawn',
    label: 'Toggle “spawn new objects at 3D cursor”',
    category: 'Tool',
    keys: '',
    action: (s) => s.setSpawnAtThreeDCursor(!s.spawnAtThreeDCursor),
  },
  {
    id: 'cursor.selectionToCursor',
    label: 'Move selection to 3D cursor (keep relative offsets)',
    category: 'Tool',
    keys: 'Ctrl+.',
    action: (s) => {
      if (!s.threeDCursorWorld) {
        showToast('Place the 3D cursor first (Shift+C, then click in the scene).', 'warn');
        return;
      }
      s.snapSelectionToThreeDCursor();
      showToast('Selection moved to 3D cursor.', 'ok');
    },
  },
  {
    id: 'cursor.cursorToOrigin',
    label: 'Snap 3D cursor to world origin (on floor)',
    category: 'Tool',
    keys: '',
    action: (s) => s.snapThreeDCursorToWorldOrigin(),
  },

  { id: 'align.x.min', label: 'Align Left (X min)', category: 'Align', keys: '', action: (s) => s.alignObjects('x', 'min') },
  { id: 'align.x.center', label: 'Align Center X', category: 'Align', keys: '', action: (s) => s.alignObjects('x', 'center') },
  { id: 'align.x.max', label: 'Align Right (X max)', category: 'Align', keys: '', action: (s) => s.alignObjects('x', 'max') },
  { id: 'align.z.min', label: 'Align Front (Z min)', category: 'Align', keys: '', action: (s) => s.alignObjects('z', 'min') },
  { id: 'align.z.center', label: 'Align Center Z', category: 'Align', keys: '', action: (s) => s.alignObjects('z', 'center') },
  { id: 'align.z.max', label: 'Align Back (Z max)', category: 'Align', keys: '', action: (s) => s.alignObjects('z', 'max') },
  { id: 'align.y.floor', label: 'Align to Floor', category: 'Align', keys: '', action: (s) => s.alignObjects('y', 'min') },
  { id: 'dist.x', label: 'Distribute Evenly X', category: 'Align', keys: '', action: (s) => s.distributeObjects('x') },
  { id: 'dist.z', label: 'Distribute Evenly Z', category: 'Align', keys: '', action: (s) => s.distributeObjects('z') },

  { id: 'layout.plan', label: 'View: 2D floor plan', category: 'View', keys: '', action: (s) => s.setStudioViewLayout('plan') },
  { id: 'layout.split', label: 'View: Split (2D + 3D)', category: 'View', keys: '', action: (s) => s.setStudioViewLayout('split') },
  { id: 'layout.scene', label: 'View: 3D scene', category: 'View', keys: '', action: (s) => s.setStudioViewLayout('scene') },
  { id: 'layout.elevation', label: 'View: Elevation (planner)', category: 'View', keys: '', action: (s) => s.setStudioViewLayout('elevation') },
  {
    id: 'view.savecamera',
    label: 'View: Save 3D camera bookmark',
    category: 'View',
    keys: '',
    action: (s) => {
      s.setStudioViewLayout(s.studioViewLayout === 'plan' || s.studioViewLayout === 'elevation' ? 'split' : s.studioViewLayout);
      document.dispatchEvent(new CustomEvent('novira:save-scene-camera'));
    },
  },

  {
    id: 'planner.detectrooms',
    label: 'Floor plan: Detect room zones',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.setStudioViewLayout('plan');
      const r = dispatchRefreshPlannerRoomZones();
      if (!r.ok) {
        showToast('Planner not ready or no layer.', 'warn');
        return;
      }
      try {
        s.persistActivePlannerStory();
      } catch {
        /* ignore */
      }
      showToast(`Room scan done (${r.areaCount ?? 0} zones on layer).`, 'ok');
    },
  },
  {
    id: 'planner.snapclose',
    label: 'Floor plan: Snap-close wall gap',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.setStudioViewLayout('plan');
      const r = dispatchPlannerSnapCloseWallGap({ maxGap: 85 });
      if (!r.ok) {
        showToast('No snap pair found — check open ends.', 'warn');
        return;
      }
      try {
        s.persistActivePlannerStory();
      } catch {
        /* ignore */
      }
      showToast('Closing wall added.', 'ok');
    },
  },
  {
    id: 'planner.arc90',
    label: 'Floor plan: Insert 90° arc walls (default center)',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.setStudioViewLayout('plan');
      const r = dispatchPlannerInsertArcWalls({
        cx: 420,
        cy: 380,
        radiusCm: 200,
        startDeg: 0,
        sweepDeg: 90,
        segments: 16,
      });
      if (!r.ok) {
        showToast('Arc insert failed — add one wall first for wall type.', 'warn');
        return;
      }
      try {
        s.persistActivePlannerStory();
      } catch {
        /* ignore */
      }
      showToast(`Arc walls inserted (${r.segments} segments).`, 'ok');
    },
  },
  {
    id: 'planner.rectroom',
    label: 'Floor plan: Insert rectangle room (4 walls)',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.setStudioViewLayout('plan');
      const r = dispatchPlannerInsertRectRoomWalls({
        x: 220,
        y: 200,
        widthCm: 500,
        heightCm: 400,
      });
      if (!r.ok) {
        showToast('Rectangle room failed — open plan tab or add one wall for wall type.', 'warn');
        return;
      }
      try {
        s.persistActivePlannerStory();
      } catch {
        /* ignore */
      }
      const z = dispatchRefreshPlannerRoomZones();
      const n = z.ok ? z.areaCount ?? 0 : 0;
      showToast(`Rectangle room inserted (${r.segments} walls). Room zones on layer: ${n}.`, 'ok');
    },
  },
  {
    id: 'planner.rectpick',
    label: 'Floor plan: Pick rectangle corners (2 clicks)',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.setStudioViewLayout('plan');
      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent('novira:planner-rect-pick-corners'));
      });
      showToast('Click two opposite corners on the plan — then Insert closed rectangle.', 'ok');
    },
  },
  {
    id: 'planner.tracepanel',
    label: 'Floor plan: Open trace import panel',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.setStudioViewLayout('plan');
      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent('novira:planner-open-trace-details'));
      });
      showToast('Trace — import PNG/JPEG; opacity saves per story.', 'ok');
    },
  },
  {
    id: 'planner.arcpick',
    label: 'Floor plan: Pick arc center on plan (click)',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.setStudioViewLayout('plan');
      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent('novira:planner-arc-pick-center'));
      });
      showToast('Click the floor plan once to set arc Cx/Cy (Select mode). Esc cancels.', 'ok');
    },
  },
  {
    id: 'planner.templates',
    label: 'Floor plan: Open scene template gallery',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.setStudioViewLayout('plan');
      document.dispatchEvent(new CustomEvent('novira:open-template-gallery'));
    },
  },
  {
    id: 'planner.hole.door',
    label: 'Floor plan: Door on wall (click wall)',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.setStudioViewLayout('plan');
      requestAnimationFrame(() => {
        const r = dispatchPlannerSelectDrawingHole('door');
        if (!r.ok) showToast('Planner not ready.', 'warn');
        else showToast('Door — click a wall segment.', 'ok');
      });
    },
  },
  {
    id: 'planner.hole.window',
    label: 'Floor plan: Window on wall (click wall)',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.setStudioViewLayout('plan');
      requestAnimationFrame(() => {
        const r = dispatchPlannerSelectDrawingHole('window');
        if (!r.ok) showToast('Planner not ready.', 'warn');
        else showToast('Window — click a wall segment.', 'ok');
      });
    },
  },
  {
    id: 'planner.terrain',
    label: 'Assist: Terrain strip preview (3D)',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.appendTerrainAssistStrip();
      showToast('Terrain strip blocks added to the 3D scene.', 'ok');
    },
  },
  {
    id: 'planner.roof',
    label: 'Assist: Roof pitched slabs preview (3D)',
    category: 'Floor plan',
    keys: '',
    action: (s) => {
      s.appendRoofAssistPreview();
      showToast('Roof preview slabs added (uses Roof ° in plan bar).', 'ok');
    },
  },

  { id: 'view.grid', label: 'Toggle Grid', category: 'View', keys: '', action: (s) => s.setGridVisible(!s.gridVisible) },
  { id: 'view.env', label: 'Toggle Environment', category: 'View', keys: '', action: (s) => s.setEnvironmentVisible(!s.environmentVisible) },
  { id: 'view.shadows', label: 'Toggle Lighting', category: 'View', keys: '', action: (s) => s.setLightingEnabled(!s.lightingEnabled) },

  { id: 'tab.assets', label: 'Switch to Objects & Assets', category: 'Workspace', keys: '', action: (s) => s.setEditorTab('Objects & Assets') },
  { id: 'tab.layout', label: 'Switch to Layout', category: 'Workspace', keys: '', action: (s) => s.setEditorTab('Layout') },
  { id: 'tab.model', label: 'Switch to Modeling', category: 'Workspace', keys: '', action: (s) => s.setEditorTab('Modeling') },
  { id: 'tab.shade', label: 'Switch to Shading', category: 'Workspace', keys: '', action: (s) => s.setEditorTab('Shading') },
  { id: 'tab.light', label: 'Switch to Lighting', category: 'Workspace', keys: '', action: (s) => s.setEditorTab('Lighting') },
  { id: 'tab.render', label: 'Switch to Rendering', category: 'Workspace', keys: '', action: (s) => s.setEditorTab('Rendering') },

  { id: 'studio.design', label: 'Studio: Design mode', category: 'Workspace', keys: '', action: (s) => { s.setCinemaChrome(false); s.setMode('build'); } },
  { id: 'studio.present', label: 'Studio: Present mode', category: 'Workspace', keys: '', action: (s) => { s.setCinemaChrome(false); s.setMode('preview'); } },
  { id: 'studio.cinema', label: 'Studio: Cinema mode', category: 'Workspace', keys: '', action: (s) => { s.setCinemaChrome(true); s.setMode('preview'); } },

  { id: 'tool.array', label: 'Array / Clone Tool', category: 'Tool', keys: '', action: () => { document.dispatchEvent(new CustomEvent('novira:open-array-tool')); } },
  { id: 'tool.ruler', label: 'Ruler / Measure Tool', category: 'Tool', keys: '', action: (s) => s.setActiveTool('ruler') },

  { id: 'scene.search', label: 'Search Objects in Scene', category: 'Edit', keys: 'Ctrl+Shift+F', action: () => { document.dispatchEvent(new CustomEvent('novira:open-scene-search')); } },

  { id: 'file.export.glb', label: 'Export Scene (GLB)', category: 'File', keys: 'Ctrl+E', action: () => { document.dispatchEvent(new CustomEvent('novira:open-export-panel')); } },
  { id: 'file.export.equirect', label: 'Export 360° equirectangular PNG', category: 'File', keys: '', action: () => {
    const st = useStore.getState();
    const safeName = (st.projectName || 'novira-360').replace(/[^\w\-]+/g, '_');
    document.dispatchEvent(new CustomEvent('novira:export-equirectangular', { detail: { cubeFaceSize: 512, center: [0, 2.4, 6], projectName: safeName } }));
  } },
  { id: 'view.webxr.enter', label: 'Enter immersive VR (WebXR)', category: 'View', keys: '', action: () => { document.dispatchEvent(new CustomEvent('novira:webxr-enter-vr')); } },
  { id: 'file.save', label: 'Save Project', category: 'File', keys: 'Ctrl+S', action: (s) => s.saveProject() },
  { id: 'file.screenshot', label: 'Screenshot (PNG)', category: 'File', keys: 'Ctrl+Shift+S', action: () => {
    const c = document.querySelector('canvas');
    if (!c) return;
    const a = document.createElement('a');
    a.download = 'novira-render.png';
    a.href = c.toDataURL('image/png');
    a.click();
  }},

  { id: 'env.apartment', label: 'HDRI: Apartment', category: 'Environment', keys: '', action: (s) => { s.setEnvPreset('apartment'); s.setEnvironmentVisible(true); } },
  { id: 'env.city', label: 'HDRI: City', category: 'Environment', keys: '', action: (s) => { s.setEnvPreset('city'); s.setEnvironmentVisible(true); } },
  { id: 'env.forest', label: 'HDRI: Forest', category: 'Environment', keys: '', action: (s) => { s.setEnvPreset('forest'); s.setEnvironmentVisible(true); } },
  { id: 'env.studio', label: 'HDRI: Studio', category: 'Environment', keys: '', action: (s) => { s.setEnvPreset('studio'); s.setEnvironmentVisible(true); } },
  { id: 'env.sunset', label: 'HDRI: Sunset', category: 'Environment', keys: '', action: (s) => { s.setEnvPreset('sunset'); s.setEnvironmentVisible(true); } },
  { id: 'env.night', label: 'HDRI: Night', category: 'Environment', keys: '', action: (s) => { s.setEnvPreset('night'); s.setEnvironmentVisible(true); } },
];

const CATEGORY_COLORS = {
  Add: '#22c55e', Edit: '#3b82f6', Tool: '#f59e0b', Align: '#8b5cf6',
  View: '#06b6d4', Workspace: '#ec4899', File: '#64748b', Environment: '#14b8a6',
  'Floor plan': '#2dd4bf',
};

export default function CommandPalette() {
  const show = useStore(s => s.showCommandPalette);
  const setShow = useStore(s => s.setShowCommandPalette);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (show) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [show]);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIdx];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  const execute = (cmd) => {
    const store = useStore.getState();
    cmd.action(store);
    setShow(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[selectedIdx]) { e.preventDefault(); execute(filtered[selectedIdx]); }
    else if (e.key === 'Escape') { setShow(false); }
  };

  if (!show) return null;

  return (
    <div
      className="studio-overlay-backdrop"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', paddingTop: '15vh',
      }}
      onClick={() => setShow(false)}
    >
      <div
        className="studio-overlay-panel studio-command-palette"
        onClick={e => e.stopPropagation()}
        style={{
          width: 520, maxHeight: 420,
          background: '#fff', borderRadius: 12,
          boxShadow: '0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Poppins', sans-serif",
          overflow: 'hidden',
        }}
      >
        <div className="studio-overlay-header" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 14, fontFamily: "'Poppins', sans-serif",
              background: 'transparent', color: '#0f172a',
            }}
          />
          <kbd style={{
            fontSize: 10, color: '#94a3b8', background: '#f1f5f9',
            padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0',
          }}>ESC</kbd>
        </div>

        <div ref={listRef} className="studio-overlay-list" style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {filtered.length === 0 && (
            <div className="studio-overlay-empty" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No commands found
            </div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`studio-cp-row${i === selectedIdx ? ' is-selected' : ''}`}
              onClick={() => execute(cmd)}
              onMouseEnter={() => setSelectedIdx(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 16px', cursor: 'pointer',
                transition: 'background 0.05s',
              }}
            >
              <span style={{
                fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                color: CATEGORY_COLORS[cmd.category] || '#64748b',
                background: `${CATEGORY_COLORS[cmd.category] || '#64748b'}15`,
                padding: '2px 6px', borderRadius: 4, minWidth: 52, textAlign: 'center',
                letterSpacing: '0.03em',
              }}>
                {cmd.category}
              </span>
              <span style={{ flex: 1, fontSize: 13, color: '#1e293b', fontWeight: i === selectedIdx ? 500 : 400 }}>
                {cmd.label}
              </span>
              {cmd.keys && (
                <kbd style={{
                  fontSize: 10, color: '#94a3b8', background: '#f8fafc',
                  padding: '1px 5px', borderRadius: 3, border: '1px solid #e2e8f0',
                }}>{cmd.keys}</kbd>
              )}
            </div>
          ))}
        </div>

        <div className="studio-overlay-footer" style={{
          padding: '6px 16px', borderTop: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 12,
          fontSize: 10, color: '#94a3b8',
        }}>
          <span>↑↓ navigate</span>
          <span>⏎ execute</span>
          <span>esc close</span>
          <span style={{ marginLeft: 'auto' }}>{filtered.length} commands</span>
        </div>
      </div>
    </div>
  );
}
