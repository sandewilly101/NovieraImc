import React, { useEffect, useRef } from 'react';
import { useThree, invalidate } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../../store/useStore';
import { estimateSceneCost, estimateObjectCost } from '../../utils/costEstimator';
import { getPlannerLayerSummary } from '../../utils/plannerReduxBridge';

function pickRecorderMime() {
  const c = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const m of c) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return 'video/webm';
}

function renderTargetToDataUrl(renderer, renderTarget) {
  const w = renderTarget.width;
  const h = renderTarget.height;
  const buffer = new Uint8Array(w * h * 4);
  renderer.readRenderTargetPixels(renderTarget, 0, 0, w, h, buffer);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = ((h - y - 1) * w + x) * 4;
      img.data[di] = buffer[si];
      img.data[di + 1] = buffer[si + 1];
      img.data[di + 2] = buffer[si + 2];
      img.data[di + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

export default function HighResExportTrigger() {
  const { gl, scene, camera } = useThree();
  const mainCameraRef = useRef(camera);

  useEffect(() => {
    mainCameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const rtRef = { current: null };

    const onHighRes = (e) => {
      const detail = e.detail || {};
      const res = (detail.resolution || '3840x2160').split('x').map((n) => parseInt(n, 10));
      const targetW = res[0] || 3840;
      const targetH = res[1] || 2160;
      const quality = String(detail.quality || 'high').toLowerCase();
      const scale = quality === 'low' ? 1 : quality === 'medium' ? 1.25 : 1.5;
      const w = Math.min(8192, Math.max(320, Math.round(targetW * scale)));
      const h = Math.min(8192, Math.max(240, Math.round(targetH * scale)));
      const filename = detail.filename || `novira-4k-${targetW}x${targetH}.png`;

      const size = new THREE.Vector2();
      gl.getSize(size);
      const prevPr = gl.getPixelRatio();
      const cam = mainCameraRef.current;

      gl.setPixelRatio(1);
      gl.setSize(w, h);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      gl.render(scene, cam);

      try {
        const srcDataUrl = gl.domElement.toDataURL('image/png');
        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetW;
        outCanvas.height = targetH;
        const outCtx = outCanvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          outCtx.drawImage(img, 0, 0, targetW, targetH);
          const dataUrl = outCanvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = filename;
          a.click();
        };
        img.src = srcDataUrl;
      } catch (err) {
        console.error('[Novira] High-res capture failed:', err);
      }

      gl.setPixelRatio(prevPr);
      gl.setSize(size.x, size.y);
      cam.aspect = size.x / size.y;
      cam.updateProjectionMatrix();
      invalidate();
      document.dispatchEvent(new CustomEvent('novira:export-toast', { detail: { message: '4K render saved' } }));
    };

    const onRecord = (e) => {
      const detail = e.detail || {};
      const seconds = Math.min(120, Math.max(3, detail.seconds || 10));
      const fps = Math.min(60, Math.max(24, detail.fps || 30));
      const quality = String(detail.quality || 'high').toLowerCase();
      const filename = detail.filename || `novira-walkthrough-${Date.now()}.webm`;
      const stream = gl.domElement.captureStream(fps);
      const mime = pickRecorderMime();
      const bitrate = quality === 'low' ? 6_000_000 : quality === 'medium' ? 10_000_000 : 16_000_000;
      let rec;
      try {
        rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
      } catch (err) {
        console.error('[Novira] MediaRecorder init failed:', err);
        return;
      }
      const chunks = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: mime.split(';')[0] });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        document.dispatchEvent(new CustomEvent('novira:export-toast', { detail: { message: 'Video export complete' } }));
      };
      rec.start(200);
      setTimeout(() => {
        if (rec.state === 'recording') rec.stop();
      }, seconds * 1000);
      document.dispatchEvent(new CustomEvent('novira:export-toast', { detail: { message: `Recording ${seconds}s at ${fps}fps — move the camera` } }));
    };

    const onCubemap = async (e) => {
      const detail = e.detail || {};
      const faceSize = Math.min(2048, Math.max(256, detail.size || 512));
      const center = new THREE.Vector3(...(detail.center || [0, 2.2, 6]));
      const base = detail.projectName || 'novira-360-kit';
      const dist = detail.cameraDistance ?? 4;

      const rt = new THREE.WebGLRenderTarget(faceSize, faceSize, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      });
      rtRef.current = rt;

      const cam = new THREE.PerspectiveCamera(90, 1, 0.05, 800);
      const dirs = [
        { name: 'right_px', dir: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
        { name: 'left_nx', dir: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
        { name: 'top_py', dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) },
        { name: 'bottom_ny', dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
        { name: 'front_pz', dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
        { name: 'back_nz', dir: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) },
      ];

      const size = new THREE.Vector2();
      gl.getSize(size);
      const prevPr = gl.getPixelRatio();
      gl.setPixelRatio(1);
      gl.setRenderTarget(rt);

      const faces = [];
      try {
        for (const { name, dir, up } of dirs) {
          cam.position.copy(center).add(dir.clone().multiplyScalar(dist));
          cam.up.copy(up);
          cam.lookAt(center);
          cam.updateProjectionMatrix();
          gl.render(scene, cam);
          faces.push({ name, dataUrl: renderTargetToDataUrl(gl, rt) });
        }
      } catch (err) {
        console.error('[Novira] Cubemap export failed:', err);
      } finally {
        gl.setRenderTarget(null);
        gl.setPixelRatio(prevPr);
        gl.setSize(size.x, size.y);
        rt.dispose();
        invalidate();
      }

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const f of faces) {
        const b64 = f.dataUrl.split(',')[1];
        if (b64) zip.file(`${base}_${f.name}.png`, b64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${base}-cubemap-faces.zip`;
      a.click();
      URL.revokeObjectURL(url);
      document.dispatchEvent(new CustomEvent('novira:export-toast', { detail: { message: '360° cubemap faces (ZIP) saved' } }));
    };

    /** Single-file 2:1 equirectangular PNG from an off-axis cube capture (not photogrammetry-grade HDR). */
    const onEquirectangular = async (e) => {
      const detail = e.detail || {};
      const cubeFace = Math.min(1024, Math.max(128, detail.cubeFaceSize ?? detail.size ?? 512));
      const centerArr = detail.center || [0, 2.4, 6];
      const center = new THREE.Vector3(centerArr[0], centerArr[1], centerArr[2]);
      const base = String(detail.projectName || 'novira-360-equirect').replace(/[^\w\-]+/g, '_');
      const eqW = cubeFace * 2;
      const eqH = cubeFace;
      const near = 0.1;
      const far = 2000;

      const size = new THREE.Vector2();
      gl.getSize(size);
      const prevPr = gl.getPixelRatio();

      const cubeRT = new THREE.WebGLCubeRenderTarget(cubeFace, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
      const cubeCam = new THREE.CubeCamera(near, far, cubeRT);
      cubeCam.position.copy(center);

      const eqRT = new THREE.WebGLRenderTarget(eqW, eqH, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: false,
      });

      const eqScene = new THREE.Scene();
      const eqCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const mat = new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: { tCube: { value: cubeRT.texture } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: `
          #include <common>
          uniform samplerCube tCube;
          varying vec2 vUv;
          void main() {
            float lon = vUv.x * 2.0 * PI - PI;
            float lat = (1.0 - vUv.y) * PI - PI * 0.5;
            float x = cos(lat) * sin(lon);
            float y = sin(lat);
            float z = cos(lat) * cos(lon);
            vec3 dir = normalize(vec3(-x, y, -z));
            gl_FragColor = texture( tCube, dir );
          }
        `,
      });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      eqScene.add(quad);

      try {
        gl.setPixelRatio(1);
        cubeCam.update(gl, scene);
        gl.setRenderTarget(eqRT);
        gl.clear(true, true, true);
        gl.render(eqScene, eqCam);
        gl.setRenderTarget(null);

        const dataUrl = renderTargetToDataUrl(gl, eqRT);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${base}-equirect-${eqW}x${eqH}.png`;
        a.click();
        document.dispatchEvent(new CustomEvent('novira:export-toast', { detail: { message: 'Equirectangular 360° PNG saved' } }));
      } catch (err) {
        console.error('[Novira] Equirectangular export failed:', err);
        document.dispatchEvent(new CustomEvent('novira:export-toast', { detail: { message: '360° equirect export failed' } }));
      } finally {
        quad.geometry.dispose();
        mat.dispose();
        eqRT.dispose();
        cubeRT.dispose();
        gl.setPixelRatio(prevPr);
        gl.setSize(size.x, size.y);
        invalidate();
      }
    };

    const onTechnical = () => {
      const { objects, projectName } = useStore.getState();
      const cost = estimateSceneCost(objects);
      const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const rows = (objects || [])
        .filter((o) => o.type !== 'ground')
        .map((o) => {
          const d = o.dimensions || [1, 1, 1];
          const p = o.position || [0, 0, 0];
          const est = estimateObjectCost(o);
          return `<tr><td>${esc(o.name)}</td><td>${esc(o.type)}</td><td>${d.map((x) => Number(x).toFixed(2)).join('×')}</td><td>${p.map((x) => Number(x).toFixed(2)).join(', ')}</td><td>$${est.subtotal.toFixed(0)}</td></tr>`;
        })
        .join('');

      const plan = getPlannerLayerSummary();
      let planSection = '';
      if (plan && plan.hasLayer) {
        planSection = `<h2 style="font-size:15px;margin:22px 0 8px">Floor plan (active layer)</h2><p class="meta">Wall segments: ${plan.wallLines} · Openings (doors/windows): ${plan.openings} · Room zones: ${plan.roomAreas}</p>`;
      } else if (plan && plan.hasLayer === false) {
        planSection = `<h2 style="font-size:15px;margin:22px 0 8px">Floor plan</h2><p class="meta">No active planner layer selected (counts unavailable).</p>`;
      }

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(projectName)} — Technical summary</title>
        <style>
          body { font-family: Poppins, system-ui, sans-serif; padding: 28px; color: #0f172a; }
          h1 { font-size: 22px; margin-bottom: 6px; }
          .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          th { background: #f8fafc; }
          .cost { font-size: 18px; font-weight: 700; margin: 16px 0; }
          @media print { button { display: none; } }
        </style></head><body>
        <h1>${esc(projectName || 'Novira project')}</h1>
        <div class="meta">Novira technical PDF — scene graph, positions, indicative costs (${cost.currency})</div>
        <div class="cost">Indicative scene total: ${cost.currency} $${cost.total.toLocaleString()}</div>
        <button type="button" onclick="window.print()" style="padding:10px 16px;border-radius:8px;border:none;background:#2563eb;color:#fff;font-weight:600;cursor:pointer;margin-bottom:16px">Print / Save as PDF</button>
        ${planSection}
        <table><thead><tr><th>Name</th><th>Type</th><th>Dimensions (m)</th><th>Position</th><th>Est.</th></tr></thead><tbody>${rows}</tbody></table>
        <p style="margin-top:20px;font-size:11px;color:#94a3b8">Costs are indicative for client presentations; not a binding quote.</p>
        <p style="margin-top:12px;font-size:10px;color:#94a3b8;max-width:720px">Rendering overlays (lux / SPL / crowd paths) are illustrative previews only, not certified simulation or CFD.</p>
        </body></html>`;

      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
      }
    };

    document.addEventListener('novira:capture-highres', onHighRes);
    document.addEventListener('novira:record-viewport', onRecord);
    document.addEventListener('novira:export-cubemap', onCubemap);
    document.addEventListener('novira:export-equirectangular', onEquirectangular);
    document.addEventListener('novira:export-technical-report', onTechnical);

    return () => {
      document.removeEventListener('novira:capture-highres', onHighRes);
      document.removeEventListener('novira:record-viewport', onRecord);
      document.removeEventListener('novira:export-cubemap', onCubemap);
      document.removeEventListener('novira:export-equirectangular', onEquirectangular);
      document.removeEventListener('novira:export-technical-report', onTechnical);
      if (rtRef.current) rtRef.current.dispose();
    };
  }, [gl, scene, invalidate]);

  return null;
}
