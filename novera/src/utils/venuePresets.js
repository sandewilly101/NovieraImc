/**
 * Pre-designed venue layouts: primitives placed in meters (scene units).
 * Positions use the same convention as addObject: [x, yOffsetAboveFloor, z] for vertical stacking from floor.
 */

const prim = (name, geo, color, dimensions, extra = {}) => ({
  name,
  type: 'primitive',
  geo,
  color,
  dimensions,
  rotation: extra.rotation || [0, 0, 0],
  scale: extra.scale || [1, 1, 1],
  ...extra,
});

export const VENUE_PRESETS = [
  {
    id: 'grand-ballroom',
    name: 'Grand Ballroom',
    tagline: 'Hall · chandeliers · stage',
    gradient: 'linear-gradient(135deg, #1e1b4b, #4c1d95)',
    items: [
      { object: prim('Ballroom Floor', 'plane', '#e2e8f0', [36, 0.02, 28], { costRole: 'carpet' }), position: [0, 0, 0] },
      { object: prim('Stage', 'box', '#334155', [10, 0.35, 5], { costRole: 'labor' }), position: [0, 0, 9] },
      { object: prim('Backdrop', 'box', '#0f172a', [12, 4, 0.12], { costRole: 'print' }), position: [0, 2, 12.2] },
      { object: prim('Truss span', 'box', '#64748b', [14, 0.4, 0.4], { costRole: 'truss' }), position: [0, 5.5, 0] },
      { object: prim('LED wall', 'box', '#1d4ed8', [8, 2.5, 0.08], { emissive: '#2563eb', costRole: 'led_wall' }), position: [0, 2.8, 12.15] },
      { object: prim('Column N', 'cylinder', '#cbd5e1', [0.45, 5, 0.45]), position: [-10, 2.5, -8] },
      { object: prim('Column S', 'cylinder', '#cbd5e1', [0.45, 5, 0.45]), position: [10, 2.5, -8] },
      { object: prim('Column E', 'cylinder', '#cbd5e1', [0.45, 5, 0.45]), position: [-10, 2.5, 8] },
      { object: prim('Column W', 'cylinder', '#cbd5e1', [0.45, 5, 0.45]), position: [10, 2.5, 8] },
      { object: prim('Chandelier A', 'sphere', '#fef08a', [1.2, 1.2, 1.2], { emissive: '#facc15' }), position: [-6, 5.2, 0] },
      { object: prim('Chandelier B', 'sphere', '#fef08a', [1.2, 1.2, 1.2], { emissive: '#facc15' }), position: [6, 5.2, 0] },
      { object: prim('Wall North', 'box', '#94a3b8', [36, 6, 0.2]), position: [0, 3, -14] },
      { object: prim('Wall South', 'box', '#94a3b8', [36, 6, 0.2]), position: [0, 3, 14] },
      { object: prim('Wall East', 'box', '#94a3b8', [0.2, 6, 28]), position: [18, 3, 0] },
      { object: prim('Wall West', 'box', '#94a3b8', [0.2, 6, 28]), position: [-18, 3, 0] },
    ],
  },
  {
    id: 'exhibition-hall',
    name: 'Exhibition Hall',
    tagline: 'Aisles · booths · rigging',
    gradient: 'linear-gradient(135deg, #0c4a6e, #0369a1)',
    items: [
      { object: prim('Expo Floor', 'plane', '#f1f5f9', [40, 0.02, 32], { costRole: 'carpet' }), position: [0, 0, 0] },
      { object: prim('Booth A shell', 'box', '#e2e8f0', [3, 2.4, 3], { costRole: 'booth' }), position: [-6, 0, -4] },
      { object: prim('Booth B shell', 'box', '#e2e8f0', [3, 2.4, 3], { costRole: 'booth' }), position: [0, 0, -4] },
      { object: prim('Booth C shell', 'box', '#e2e8f0', [3, 2.4, 3], { costRole: 'booth' }), position: [6, 0, -4] },
      { object: prim('Booth D shell', 'box', '#e2e8f0', [3, 2.4, 3], { costRole: 'booth' }), position: [-6, 0, 4] },
      { object: prim('Booth E shell', 'box', '#e2e8f0', [3, 2.4, 3], { costRole: 'booth' }), position: [0, 0, 4] },
      { object: prim('Booth F shell', 'box', '#e2e8f0', [3, 2.4, 3], { costRole: 'booth' }), position: [6, 0, 4] },
      { object: prim('Banner truss', 'box', '#475569', [24, 0.35, 0.35], { costRole: 'truss' }), position: [0, 4.2, -8] },
      { object: prim('Rigging LED strip', 'box', '#1e40af', [20, 0.15, 0.12], { emissive: '#3b82f6', costRole: 'led_wall' }), position: [0, 4.5, 0] },
      { object: prim('Info desk', 'box', '#78716c', [4, 1.1, 1.2], { costRole: 'labor' }), position: [0, 0, -12] },
    ],
  },
  {
    id: 'corporate-ballroom',
    name: 'Corporate Ballroom',
    tagline: 'Seating · stage · AV',
    gradient: 'linear-gradient(135deg, #14532d, #166534)',
    items: [
      { object: prim('Carpet', 'plane', '#bbf7d0', [28, 0.02, 20], { costRole: 'carpet' }), position: [0, 0, 0] },
      { object: prim('Stage deck', 'box', '#1e293b', [9, 0.25, 4], { costRole: 'labor' }), position: [0, 0, 8] },
      { object: prim('Projection surface', 'box', '#f8fafc', [7, 0.05, 3.5], { costRole: 'print' }), position: [0, 1.2, 10.1] },
      { object: prim('Row 1 table', 'box', '#a8a29e', [5, 0.75, 1.2]), position: [-4, 0.4, -2] },
      { object: prim('Row 2 table', 'box', '#a8a29e', [5, 0.75, 1.2]), position: [4, 0.4, -2] },
      { object: prim('Row 3 table', 'box', '#a8a29e', [5, 0.75, 1.2]), position: [-4, 0.4, 1] },
      { object: prim('Row 4 table', 'box', '#a8a29e', [5, 0.75, 1.2]), position: [4, 0.4, 1] },
      { object: prim('Side wall L', 'box', '#cbd5e1', [0.15, 4, 20]), position: [-14, 2, 0] },
      { object: prim('Side wall R', 'box', '#cbd5e1', [0.15, 4, 20]), position: [14, 2, 0] },
      { object: prim('PA cluster L', 'sphere', '#1e293b', [0.35, 0.35, 0.35], { noviraSpeaker: { range: 12, arcDeg: 140 } }), position: [-12, 3.5, -6] },
      { object: prim('PA cluster R', 'sphere', '#1e293b', [0.35, 0.35, 0.35], { noviraSpeaker: { range: 12, arcDeg: 140 } }), position: [12, 3.5, -6] },
    ],
  },
];
