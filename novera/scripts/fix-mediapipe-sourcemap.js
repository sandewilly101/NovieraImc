const fs = require('fs');
const path = require('path');

const pkgDir = path.resolve(__dirname, '..');
const mediaPipeDir = path.join(pkgDir, 'node_modules', '@mediapipe', 'tasks-vision');
const sourceMapSrc = path.join(mediaPipeDir, 'vision_bundle.mjs.map');
const sourceMapDest = path.join(mediaPipeDir, 'vision_bundle_mjs.js.map');

if (!fs.existsSync(mediaPipeDir)) {
  process.exit(0);
}

if (!fs.existsSync(sourceMapSrc)) {
  process.exit(0);
}

try {
  if (!fs.existsSync(sourceMapDest)) {
    fs.copyFileSync(sourceMapSrc, sourceMapDest);
    console.log('Created missing @mediapipe source map:', sourceMapDest);
  }
} catch (error) {
  console.error('Could not create @mediapipe source map workaround:', error.message);
  process.exit(1);
}
