/**
 * Copies react-planner demo build into CRA public/ for static iframe embed.
 * Run from repo: `cd novera && npm run planner:sync`
 * Prerequisite: `cd ../react-planner && npm run build-demo-embed-novira`
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..', '..');
const src = path.join(repoRoot, 'react-planner', 'demo', 'dist');
const dest = path.join(__dirname, '..', 'public', 'react-planner');

if (!fs.existsSync(src)) {
    console.error('[planner:sync] Missing:', src);
    console.error('Build first: cd react-planner && npm run build-demo-embed-novira');
    process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
}
fs.cpSync(src, dest, { recursive: true });
console.log('[planner:sync] Copied', src, '→', dest);
