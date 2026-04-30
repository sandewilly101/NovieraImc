/**
 * Linked `file:../react-planner` installs its own react / react-dom / react-redux under
 * react-planner/node_modules. That yields two React copies → hooks break (useMemo on null in connect()).
 * Peers must resolve from the app; remove nested copies so resolution walks up to novira/node_modules.
 */
const fs = require('fs');
const path = require('path');

/* scripts/ → novira/ → repo root → react-planner (sibling of novera/) */
const plannerNm = path.resolve(__dirname, '../../react-planner/node_modules');
const toRemove = ['react', 'react-dom', 'react-redux'];

if (!fs.existsSync(plannerNm)) {
  process.exit(0);
}

for (const name of toRemove) {
  const p = path.join(plannerNm, name);
  try {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      console.log('[dedupe-planner-peers] removed', path.relative(path.resolve(__dirname, '../..'), p));
    }
  } catch (e) {
    console.warn('[dedupe-planner-peers] could not remove', p, e.message);
  }
}
