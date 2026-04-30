/**
 * Instant cost model (indicative USD) from object dimensions and roles.
 * Units: dimensions × scale are meters; floor plane uses width × depth for area.
 */

const DEFAULT_RATES = {
  led_wall_per_m2: 820,
  truss_per_m: 195,
  carpet_per_m2: 48,
  print_per_m2: 125,
  labor_flat_per_piece: 85,
  booth_shell_per_m3: 420,
  generic_per_m3: 180,
};

function inferCostRole(obj) {
  if (obj.costRole) return obj.costRole;
  const n = `${obj.name || ''} ${obj.geo || ''}`.toLowerCase();
  if (n.includes('led') || n.includes('screen')) return 'led_wall';
  if (n.includes('truss') || n.includes('rig')) return 'truss';
  if (n.includes('carpet') || (n.includes('floor') && obj.geo === 'plane')) return 'carpet';
  if (n.includes('banner') || n.includes('backdrop') || n.includes('print')) return 'print';
  if (n.includes('booth')) return 'booth';
  return 'generic';
}

function scaledDims(obj) {
  const d = obj.dimensions || [1, 1, 1];
  const s = obj.scale || [1, 1, 1];
  return [Math.abs(d[0] * s[0]), Math.abs(d[1] * s[1]), Math.abs(d[2] * s[2])];
}

export function estimateObjectCost(obj, rates = DEFAULT_RATES) {
  if (!obj || obj.type === 'ground' || obj.type === 'light' || obj.type === 'group') {
    return { subtotal: 0, lines: [] };
  }
  const role = inferCostRole(obj);
  const [w, h, dep] = scaledDims(obj);
  const lines = [];
  let subtotal = 0;

  const push = (label, qty, unit, unitPrice) => {
    const amount = Math.round(qty * unitPrice * 100) / 100;
    if (amount <= 0) return;
    lines.push({ label, qty, unit, unitPrice, amount });
    subtotal += amount;
  };

  switch (role) {
    case 'led_wall': {
      const area = Math.max(0.05, w * h, w * dep, h * dep);
      push('LED / display surface', area.toFixed(2), 'm²', rates.led_wall_per_m2);
      break;
    }
    case 'truss': {
      const len = Math.max(w, h, dep);
      push('Truss span (longest)', len.toFixed(2), 'm', rates.truss_per_m);
      break;
    }
    case 'carpet': {
      const area = obj.geo === 'plane' ? w * dep : w * dep;
      push('Carpet / flooring', Math.max(0.01, area).toFixed(2), 'm²', rates.carpet_per_m2);
      break;
    }
    case 'print': {
      const area = Math.max(0.05, w * h, w * dep, h * dep);
      push('Print / graphics', area.toFixed(2), 'm²', rates.print_per_m2);
      break;
    }
    case 'booth': {
      const vol = w * h * dep;
      push('Booth build', vol.toFixed(2), 'm³', rates.booth_shell_per_m3);
      push('Labor (install)', 1, 'lot', rates.labor_flat_per_piece * 1.2);
      break;
    }
    default: {
      const vol = Math.max(0.001, w * h * dep);
      push('Fabrication (est.)', vol.toFixed(2), 'm³', rates.generic_per_m3);
      if (obj.type === 'gltf' || obj.type === 'stl' || obj.type === 'sketchfab') {
        push('Labor (handling)', 1, 'lot', rates.labor_flat_per_piece);
      }
    }
  }

  return { subtotal: Math.round(subtotal * 100) / 100, lines, role };
}

export function estimateSceneCost(objects, rates = DEFAULT_RATES) {
  const rows = [];
  let total = 0;
  for (const obj of objects || []) {
    const { subtotal, lines, role } = estimateObjectCost(obj, rates);
    if (subtotal > 0) {
      total += subtotal;
      rows.push({ id: obj.id, name: obj.name || obj.type, role, subtotal, lines });
    }
  }
  return { total: Math.round(total * 100) / 100, rows, currency: 'USD' };
}
