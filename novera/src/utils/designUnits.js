/** Display lengths in the user's chosen design unit (internal = meters). */

const UNITS_ORDER = ['m', 'cm', 'mm', 'ft', 'in'];

export function loadDesignUnits() {
  try {
    const u = localStorage.getItem('novira_design_units_v1');
    if (u === 'm' || u === 'cm' || u === 'mm' || u === 'ft' || u === 'in') return u;
  } catch {
    /* ignore */
  }
  return 'm';
}

export function persistDesignUnits(u) {
  try {
    localStorage.setItem('novira_design_units_v1', u);
  } catch {
    /* quota */
  }
}

export function cycleDesignUnits(current) {
  const i = UNITS_ORDER.indexOf(current);
  const ni = ((i >= 0 ? i : 0) + 1) % UNITS_ORDER.length;
  return UNITS_ORDER[ni];
}

export function formatDesignLength(meters, unit) {
  const m = Number(meters);
  if (!Number.isFinite(m)) return '—';
  switch (unit) {
    case 'cm':
      return `${(m * 100).toFixed(1)} cm`;
    case 'mm':
      return `${(m * 1000).toFixed(0)} mm`;
    case 'ft': {
      const ft = m / 0.3048;
      return `${ft.toFixed(2)} ft`;
    }
    case 'in': {
      const inch = m / 0.0254;
      return `${inch.toFixed(1)} in`;
    }
    case 'm':
    default:
      return `${m.toFixed(2)} m`;
  }
}

export function designUnitLabel(unit) {
  switch (unit) {
    case 'cm':
      return 'cm';
    case 'mm':
      return 'mm';
    case 'ft':
      return 'ft';
    case 'in':
      return 'in';
    default:
      return 'm';
  }
}
