import JSZip from 'jszip';
import { registerBlobUrl } from './blobRegistry';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/** Official Sketchfab embed viewer URL (works for many free and store listings for preview). */
export function sketchfabEmbedUrl(uid, opts = {}) {
    if (!uid) return '';
    const q = new URLSearchParams({
        autostart: opts.autostart != null ? String(opts.autostart) : '0',
        ui_controls: '1',
        ui_infos: '1',
        ui_watermark: '1',
        ui_stop: '0',
    });
    return `https://sketchfab.com/models/${encodeURIComponent(uid)}/embed?${q}`;
}

function getAuthToken() {
    return localStorage.getItem('token') || '';
}

function authHeaders() {
    const t = getAuthToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Forward optional marketplace tokens (same keys as axios interceptors in apiService). */
function providerBridgeHeaders() {
    const h = { ...authHeaders() };
    try {
        const bk = localStorage.getItem('provider_blenderkit_token');
        if (bk) h['x-provider-blenderkit-token'] = bk;
        const f3 = localStorage.getItem('provider_free3d_token');
        if (f3) h['x-provider-free3d-token'] = f3;
    } catch {
        /* noop */
    }
    return h;
}

/** True when `url` is our own Novira API (never run through /asset-store/proxy or corsproxy). */
function isNoviraAssetStoreUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const base = String(API_BASE).replace(/\/?$/, '');
    return url.startsWith(`${base}/asset-store/`) || url.startsWith(`${base}/`);
}

function proxyUrl(rawUrl) {
    return `${API_BASE}/asset-store/proxy?url=${encodeURIComponent(rawUrl)}`;
}

const MODEL_CACHE_DB = 'novira-model-cache-v1';
const MODEL_CACHE_STORE = 'assets';
const MODEL_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function openModelCacheDb() {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
        try {
            const req = indexedDB.open(MODEL_CACHE_DB, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(MODEL_CACHE_STORE)) {
                    db.createObjectStore(MODEL_CACHE_STORE);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

async function readModelCache(cacheKey) {
    const db = await openModelCacheDb();
    if (!db) return null;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(MODEL_CACHE_STORE, 'readonly');
            const store = tx.objectStore(MODEL_CACHE_STORE);
            const req = store.get(cacheKey);
            req.onsuccess = () => {
                const rec = req.result || null;
                if (!rec || !rec.arrayBuffer || !rec.savedAt) {
                    resolve(null);
                    return;
                }
                if (Date.now() - rec.savedAt > MODEL_CACHE_MAX_AGE_MS) {
                    resolve(null);
                    return;
                }
                resolve(rec);
            };
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

async function writeModelCache(cacheKey, response) {
    const db = await openModelCacheDb();
    if (!db || !response?.ok) return;
    try {
        const cloned = response.clone();
        const arrayBuffer = await cloned.arrayBuffer();
        const contentType = cloned.headers.get('content-type') || 'application/octet-stream';
        const tx = db.transaction(MODEL_CACHE_STORE, 'readwrite');
        const store = tx.objectStore(MODEL_CACHE_STORE);
        store.put(
            {
                arrayBuffer,
                contentType,
                savedAt: Date.now(),
            },
            cacheKey
        );
    } catch {
        // cache write is best-effort only
    }
}

function responseFromCachedRecord(rec) {
    return new Response(rec.arrayBuffer, {
        status: 200,
        headers: {
            'content-type': rec.contentType || 'application/octet-stream',
            'x-novira-cache': 'indexeddb',
        },
    });
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Used for long-running CDN/model downloads (exported for callers that need explicit caps). */
export async function fetchWithTimeout(resource, init = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(resource, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

function shouldRetryHttpStatus(status) {
    return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function fetchStrategyWithRetries(name, requestFactory, options = {}) {
    const retries = Number.isFinite(options.retries) ? options.retries : 2;
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 15000;
    const backoffMs = Number.isFinite(options.backoffMs) ? options.backoffMs : 700;
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const { url, init } = requestFactory();
            const res = await fetchWithTimeout(url, init, timeoutMs);
            if (res.ok) return res;
            if (!shouldRetryHttpStatus(res.status) || attempt === retries) {
                throw new Error(`${name} returned HTTP ${res.status}`);
            }
            await delay(backoffMs * (attempt + 1));
        } catch (err) {
            lastError = err;
            if (attempt === retries) break;
            await delay(backoffMs * (attempt + 1));
        }
    }

    throw lastError || new Error(`${name} failed`);
}

/** CORS-safe URL for `<model-viewer>` / loaders when the CDN blocks browser `fetch` from localhost. */
export function assetProxyUrl(rawUrl) {
    if (!rawUrl) return '';
    return proxyUrl(rawUrl);
}

async function fetchViaProxy(url) {
    const res = await fetch(proxyUrl(url), { headers: authHeaders() });
    if (res.ok) return res;
    throw new Error(`Proxy returned ${res.status}`);
}

async function fetchWithFallback(url) {
    const cacheKey = `url::${url}`;
    if (isNoviraAssetStoreUrl(url)) {
        const res = await fetchStrategyWithRetries(
            'novira-asset-store',
            () => ({
                url,
                init: {
                    mode: 'cors',
                    cache: 'no-store',
                    headers: providerBridgeHeaders(),
                    credentials: 'include',
                },
            }),
            { retries: 2, timeoutMs: 120000, backoffMs: 800 }
        );
        writeModelCache(cacheKey, res);
        return res;
    }
    const attempts = [
        () => fetchStrategyWithRetries(
            'direct',
            () => ({ url, init: { mode: 'cors', cache: 'no-store' } }),
            { retries: 1, timeoutMs: 12000, backoffMs: 500 }
        ),
        () => fetchStrategyWithRetries(
            'api-proxy',
            () => ({ url: proxyUrl(url), init: { headers: authHeaders(), cache: 'no-store' } }),
            { retries: 2, timeoutMs: 18000, backoffMs: 700 }
        ),
        () => {
            const proxied = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            return fetchStrategyWithRetries(
                'corsproxy',
                () => ({ url: proxied, init: { cache: 'no-store' } }),
                { retries: 0, timeoutMs: 12000, backoffMs: 400 }
            );
        },
    ];

    const errors = [];
    for (const run of attempts) {
        try {
            const res = await run();
            writeModelCache(cacheKey, res);
            return res;
        } catch (err) {
            errors.push(err?.message || String(err));
        }
    }
    const cached = await readModelCache(cacheKey);
    if (cached) {
        return responseFromCachedRecord(cached);
    }
    throw new Error(`All fetch methods failed for: ${url}. ${errors.join(' | ')}`);
}

export async function fetchAPI(url) {
    try {
        return await fetchWithFallback(url);
    } catch (_) {
        return null;
    }
}

export async function downloadSketchfabModel(uid, sketchfabToken = '') {
    const params = sketchfabToken ? `?token=${encodeURIComponent(sketchfabToken)}` : '';
    const proxyEndpoint = `${API_BASE}/asset-store/sketchfab-download/${uid}${params}`;

    const dlRes = await fetchWithTimeout(
        proxyEndpoint,
        { headers: authHeaders(), mode: 'cors', cache: 'no-store' },
        90000
    );

    if (!dlRes.ok) {
        const cached = await readModelCache(`sketchfab::${uid}`);
        if (cached) {
            return createTrackedBlobUrl(new Blob([cached.arrayBuffer], { type: cached.contentType || 'application/octet-stream' }));
        }
        const errBody = await dlRes.json().catch(() => ({}));
        const err = new Error(errBody.error || `Download failed (HTTP ${dlRes.status})`);
        err.httpStatus = dlRes.status;
        err.detail = errBody.detail || '';
        throw err;
    }

    const dlData = await dlRes.json();
    const zipUrl = dlData.data?.gltf?.url || dlData.data?.glb?.url;

    if (!zipUrl) {
        const cached = await readModelCache(`sketchfab::${uid}`);
        if (cached) {
            return createTrackedBlobUrl(new Blob([cached.arrayBuffer], { type: cached.contentType || 'application/octet-stream' }));
        }
        throw new Error('No GLTF/GLB download URL returned from Sketchfab');
    }

    const zr = await fetchWithFallback(zipUrl);
    if (!zr.ok) throw new Error('ZIP download failed');
    const zb = await zr.arrayBuffer();

    const zip = await JSZip.loadAsync(zb);
    const blobs = {};

    await Promise.all(
        Object.keys(zip.files).map(async (fn) => {
            if (!zip.files[fn].dir) {
                blobs[fn] = createTrackedBlobUrl(await zip.files[fn].async('blob'));
            }
        })
    );

    const glbFile = Object.keys(blobs).find(f => f.endsWith('.glb'));
    if (glbFile) {
        const glbBlob = await zip.files[glbFile].async('blob');
        try {
            const glbRes = new Response(glbBlob, {
                status: 200,
                headers: { 'content-type': 'model/gltf-binary' },
            });
            writeModelCache(`sketchfab::${uid}`, glbRes);
        } catch {
            /* best effort cache write */
        }
        return createTrackedBlobUrl(glbBlob);
    }

    const gltfFile = Object.keys(blobs).find(f => f.endsWith('.gltf'));
    if (!gltfFile) throw new Error('No .gltf or .glb file found inside the download');

    const json = JSON.parse(await zip.files[gltfFile].async('string'));
    const prefix = gltfFile.includes('/') ? gltfFile.replace(/[^/]+$/, '') : '';

    ['buffers', 'images'].forEach((key) => {
        (json[key] || []).forEach((item) => {
            if (item.uri && !item.uri.startsWith('data:') && !item.uri.startsWith('blob:')) {
                item.uri = blobs[prefix + item.uri] || blobs[item.uri] || item.uri;
            }
        });
    });

    const finalBlob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    const finalUrl = createTrackedBlobUrl(finalBlob);
    try {
        const recRes = new Response(finalBlob, {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
        writeModelCache(`sketchfab::${uid}`, recRes);
    } catch {
        /* best effort cache write */
    }
    return finalUrl;
}

export function createTrackedBlobUrl(blob) {
    const url = URL.createObjectURL(blob);
    registerBlobUrl(url);
    return url;
}

/** Resolve relative glTF buffer/image URIs to same-origin proxy URLs (fixes GLTFLoader + `proxy?url=` base). */
function rewriteGltfJsonBufferImagesToProxy(json, docHref) {
    let gltfDir;
    try {
        gltfDir = new URL('.', docHref).href;
    } catch {
        gltfDir = docHref;
    }
    for (const key of ['buffers', 'images']) {
        for (const item of json[key] || []) {
            if (!item.uri || item.uri.startsWith('data:') || item.uri.startsWith('blob:')) continue;
            if (/^https?:/i.test(item.uri)) {
                item.uri = proxyUrl(item.uri);
                continue;
            }
            try {
                const abs = new URL(item.uri, gltfDir).href;
                item.uri = proxyUrl(abs);
            } catch (e) {
                console.warn('[gltf] Bad glTF uri:', item.uri, e);
            }
        }
    }
}

/**
 * Fetches a glTF/GLB document (often `/api/asset-store/proxy?url=…`) and, for JSON glTF,
 * rewrites buffer/image URIs so GLTFLoader resolves `.bin`/textures via the proxy.
 */
export async function rewriteRemoteGltfToBlobUrl(fetchUrl, sourceUrlForDoc) {
    const res = await fetchWithFallback(fetchUrl);
    const buf = await res.arrayBuffer();
    const kind = sniffModelBufferKind(buf);
    if (kind === 'glb') {
        return createTrackedBlobUrl(new Blob([buf], { type: 'model/gltf-binary' }));
    }
    if (kind !== 'gltf-json') {
        return null;
    }
    let json;
    try {
        json = JSON.parse(new TextDecoder().decode(buf));
    } catch {
        return null;
    }
    const docHref = (() => {
        try {
            const u = new URL(fetchUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
            const inner = u.searchParams.get('url');
            if (inner) return decodeURIComponent(inner);
            if (sourceUrlForDoc) return sourceUrlForDoc;
            return fetchUrl;
        } catch {
            return sourceUrlForDoc || fetchUrl;
        }
    })();
    rewriteGltfJsonBufferImagesToProxy(json, docHref);
    return createTrackedBlobUrl(new Blob([JSON.stringify(json)], { type: 'application/json' }));
}

/** GLB container magic at byte offset 4: "glTF". */
function isGlbBuffer(u8) {
    return u8.length >= 12 && u8[4] === 0x67 && u8[5] === 0x6c && u8[6] === 0x54 && u8[7] === 0x46;
}

function looksLikeBinaryStl(buf) {
    if (buf.byteLength < 84) return false;
    const n = new DataView(buf).getUint32(80, true);
    if (!n || n > 200000000) return false;
    return 84 + n * 50 === buf.byteLength;
}

/**
 * Distinguish GLB / JSON glTF from STL (binary headers often contain `COLOR=`) and similar formats
 * so we never feed non-JSON to JSON.parse or GLTFLoader.parse as text glTF.
 */
export function sniffModelBufferKind(buf) {
    const u8 = new Uint8Array(buf);
    if (isGlbBuffer(u8)) return 'glb';

    const dec = new TextDecoder('utf-8', { fatal: false });
    const head = dec.decode(u8.slice(0, Math.min(4096, u8.length))).replace(/^\uFEFF/, '').trimStart();
    if (head.startsWith('{')) return 'gltf-json';

    if (/^solid[\s\r\n]/i.test(head.slice(0, 12))) return 'stl';

    if (looksLikeBinaryStl(buf)) return 'stl';

    const asciiEarly = new TextDecoder('ascii', { fatal: false }).decode(u8.slice(0, 120));
    if (/COLOR=/i.test(asciiEarly) && buf.byteLength >= 84) return 'stl';

    if (/^(#|\s*mtllib|\s*v\s)/im.test(head)) return 'obj';

    return 'unknown';
}

export async function downloadGenericModel(modelUrl, options = {}) {
    const allowStl = options.allowStl === true;
    if (!modelUrl) throw new Error('No model URL provided');

    const res = await fetchWithFallback(modelUrl);
    const buf = await res.arrayBuffer();
    const kind = sniffModelBufferKind(buf);

    if (kind === 'stl') {
        if (allowStl) {
            return createTrackedBlobUrl(new Blob([buf], { type: 'model/stl' }));
        }
        throw new Error(
            'This file is STL; use a NASA / STL-capable catalog row or convert to GLB for other sources.'
        );
    }

    if (kind === 'obj') {
        throw new Error(
            'This file is OBJ; the editor only loads GLB/glTF/STL in-scene. Pick a GLB model or convert the mesh.'
        );
    }

    if (kind === 'unknown' && !/\.(glb|gltf)($|\?)/i.test(modelUrl)) {
        throw new Error('Response is not a GLB or glTF JSON. Only GLB/glTF can be added to the scene.');
    }

    if (kind === 'gltf-json') {
        const gltfText = new TextDecoder().decode(buf);
        let json;
        try {
            json = JSON.parse(gltfText);
        } catch {
            throw new Error('Invalid glTF JSON from remote URL.');
        }
        const docHref = (() => {
            try {
                const u = new URL(modelUrl, window.location.origin);
                const inner = u.searchParams.get('url');
                if (inner) return decodeURIComponent(inner);
                return modelUrl;
            } catch {
                return modelUrl;
            }
        })();
        rewriteGltfJsonBufferImagesToProxy(json, docHref);
        return createTrackedBlobUrl(
            new Blob([JSON.stringify(json)], { type: 'application/json' })
        );
    }

    const mime = kind === 'glb' ? 'model/gltf-binary' : 'application/octet-stream';
    return createTrackedBlobUrl(new Blob([buf], { type: mime }));
}

export async function downloadPolyHavenModel(gltfUrl, includes = {}) {
    if (!gltfUrl) throw new Error('No GLTF URL provided');

    const gltfRes = await fetchWithFallback(gltfUrl);
    const buf = await gltfRes.arrayBuffer();
    const kind = sniffModelBufferKind(buf);

    if (kind === 'glb') {
        return createTrackedBlobUrl(new Blob([buf], { type: 'model/gltf-binary' }));
    }

    if (kind !== 'gltf-json') {
        throw new Error(
            `Expected glTF JSON from Poly Haven (got ${kind}). The download may have been blocked or redirected — try again or open the asset on polyhaven.com.`
        );
    }

    const gltfText = new TextDecoder().decode(buf);
    let json;
    try {
        json = JSON.parse(gltfText);
    } catch {
        throw new Error('Invalid glTF JSON from Poly Haven.');
    }

    const blobMap = {};

    if (includes && typeof includes === 'object') {
        const entries = Object.entries(includes);
        const downloads = await Promise.allSettled(
            entries.map(async ([relPath, absUrl]) => {
                const res = await fetchWithFallback(absUrl);
                const blob = await res.blob();
                blobMap[relPath] = createTrackedBlobUrl(blob);
            })
        );
        downloads.forEach((result, i) => {
            if (result.status === 'rejected') {
                console.warn(`[PolyHaven] Failed to load ${entries[i][0]}:`, result.reason?.message);
            }
        });
    }

    const gltfDir = (() => {
        try {
            return new URL('.', gltfUrl).href;
        } catch {
            return gltfUrl;
        }
    })();

    /** Resolve external buffer/image URIs in parallel (sequential was very slow on textured models). */
    const CONCURRENCY = 6;
    const tasks = [];
    for (const key of ['buffers', 'images']) {
        for (const item of json[key] || []) {
            if (!item.uri || item.uri.startsWith('data:') || item.uri.startsWith('blob:')) continue;
            if (blobMap[item.uri]) {
                item.uri = blobMap[item.uri];
                continue;
            }
            const itemRef = item;
            if (/^https?:/i.test(itemRef.uri)) {
                tasks.push(async () => {
                    try {
                        const res = await fetchWithFallback(itemRef.uri);
                        itemRef.uri = createTrackedBlobUrl(await res.blob());
                    } catch (e) {
                        console.warn(`[PolyHaven] Failed to load absolute ${itemRef.uri}:`, e?.message);
                    }
                });
                continue;
            }
            tasks.push(async () => {
                try {
                    const abs = new URL(itemRef.uri, gltfDir).href;
                    const res = await fetchWithFallback(abs);
                    itemRef.uri = createTrackedBlobUrl(await res.blob());
                } catch (e) {
                    console.warn(`[PolyHaven] Failed to resolve ${itemRef.uri}:`, e?.message);
                }
            });
        }
    }
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        await Promise.all(tasks.slice(i, i + CONCURRENCY).map((fn) => fn()));
    }

    return createTrackedBlobUrl(
        new Blob([JSON.stringify(json)], { type: 'application/json' })
    );
}

export async function downloadFree3DModel(guid, opts = {}) {
    const lod = opts?.lod || '10k';
    if (!guid) throw new Error('No Free3D model guid provided');
    const bridgeUrl = `${API_BASE}/asset-store/free3d/model/${encodeURIComponent(String(guid))}?lod=${encodeURIComponent(String(lod))}`;
    const res = await fetchWithFallback(bridgeUrl); // uses novira-asset-store branch when URL matches API_BASE
    const buf = await res.arrayBuffer();
    const kind = sniffModelBufferKind(buf);
    if (kind !== 'glb' && kind !== 'gltf-json') {
        throw new Error('Free3D bridge did not return GLB/glTF content.');
    }
    const mime = kind === 'glb' ? 'model/gltf-binary' : 'application/json';
    return createTrackedBlobUrl(new Blob([buf], { type: mime }));
}

export async function downloadBlenderKitModel(assetId) {
    if (!assetId) throw new Error('No BlenderKit asset id provided');
    const bridgeUrl = `${API_BASE}/asset-store/blenderkit/model/${encodeURIComponent(String(assetId))}`;
    const res = await fetchWithFallback(bridgeUrl);
    const buf = await res.arrayBuffer();
    const kind = sniffModelBufferKind(buf);
    if (kind !== 'glb' && kind !== 'gltf-json') {
        throw new Error('BlenderKit bridge did not return GLB/glTF content.');
    }
    const mime = kind === 'glb' ? 'model/gltf-binary' : 'application/json';
    return createTrackedBlobUrl(new Blob([buf], { type: mime }));
}

export async function downloadBlenderKitHdri(assetId) {
    if (!assetId) throw new Error('No BlenderKit HDR asset id provided');
    const bridgeUrl = `${API_BASE}/asset-store/blenderkit/hdri/${encodeURIComponent(String(assetId))}`;
    const res = await fetchWithFallback(bridgeUrl);
    const buf = await res.arrayBuffer();
    const u8 = new Uint8Array(buf.slice(0, 4));
    if (u8[0] === 0x50 && u8[1] === 0x4b) {
        throw new Error('BlenderKit HDR bridge returned a ZIP, not a Radiance .hdr file.');
    }
    const head = new TextDecoder('ascii', { fatal: false }).decode(new Uint8Array(buf.slice(0, 2048)));
    if (!/#\?RADIANCE/i.test(head) && !head.includes('RADIANCE')) {
        throw new Error('BlenderKit HDR bridge did not return a valid Radiance HDR.');
    }
    return createTrackedBlobUrl(new Blob([buf], { type: 'image/vnd.radiance' }));
}

export async function downloadHdriAsBlob(hdriUrl) {
    if (!hdriUrl) throw new Error('No HDRI URL provided');
    if (!/\.hdr($|\?)/i.test(hdriUrl)) {
        throw new Error('This HDRI is not a direct .hdr file (e.g. it may be a ZIP). Open the source site to download, or pick a Poly Haven HDRI.');
    }
    const res = await fetchWithFallback(hdriUrl);
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    const u8 = new Uint8Array(buf.slice(0, 4));
    if (u8[0] === 0x50 && u8[1] === 0x4b) {
        throw new Error('Download was a ZIP archive, not a Radiance .hdr file.');
    }
    const head = new TextDecoder('ascii', { fatal: false }).decode(new Uint8Array(buf.slice(0, 2048)));
    if (!/#\?RADIANCE/i.test(head) && !head.includes('RADIANCE')) {
        throw new Error('File is not a valid Radiance HDR (missing RADIANCE header).');
    }
    return createTrackedBlobUrl(new Blob([buf], { type: 'image/vnd.radiance' }));
}
