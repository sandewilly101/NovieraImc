const TIMEOUT_MS = 12000;
const API_BASE = 'https://www.blenderkit.com/api/v1';
const PAGE_SIZE = 48;

function getToken() {
    return process.env.BLENDERKIT_API_KEY || process.env.BLENDERKIT_TOKEN || '';
}

function headers() {
    const h = {
        Accept: 'application/json',
        'User-Agent': 'Novira/1.0 asset-registry',
    };
    const token = getToken();
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
}

const safeFetchJson = async (url, options = {}, timeoutMs = TIMEOUT_MS) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            ...options,
            headers: { ...headers(), ...(options.headers || {}) },
            signal: controller.signal,
        });
        if (!res.ok) {
            console.warn(`[BlenderKit] HTTP ${res.status} from ${url}`);
            return null;
        }
        return await res.json();
    } catch (err) {
        if (err.name !== 'AbortError') console.warn(`[BlenderKit] Fetch failed: ${err.message}`);
        return null;
    } finally {
        clearTimeout(timeout);
    }
};

function asArray(v) {
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
}

function pickThumb(files = []) {
    const thumb = files.find((f) => String(f.fileType || '').toLowerCase() === 'thumbnail');
    if (!thumb) return null;
    return (
        thumb.thumbnailLargeUrlNonsquaredWebp
        || thumb.thumbnailLargeUrlNonsquared
        || thumb.thumbnailMiddleUrlNonsquaredWebp
        || thumb.thumbnailMiddleUrlNonsquared
        || thumb.thumbnailLargeUrl
        || thumb.thumbnailMiddleUrl
        || thumb.thumbnailSmallUrlNonsquared
        || thumb.thumbnailSmallUrl
        || thumb.fileThumbnailLarge
        || thumb.fileThumbnail
        || null
    );
}

function pickModelDownload(files = []) {
    const list = asArray(files);
    const score = (f) => {
        const t = String(f.fileType || '').toLowerCase();
        const n = String(f.filename || '').toLowerCase();
        const u = String(f.downloadUrl || f.url || '').toLowerCase();
        const looks = /\.(glb|gltf)($|\?)/i.test(n) || /\.(glb|gltf)($|\?)/i.test(u)
            || t === 'gltf' || t === 'gltf_godot' || t.includes('gltf');
        if (!looks) return 0;
        if (n.endsWith('.glb') || u.includes('.glb')) return 3;
        if (t === 'gltf' || t === 'gltf_godot') return 2;
        return 1;
    };
    return [...list].sort((a, b) => score(b) - score(a)).find((f) => score(f) > 0) || null;
}

function normalizeModel(item) {
    const files = asArray(item?.files);
    const modelFile = pickModelDownload(files);
    const tokenPresent = Boolean(getToken());
    const meshUrl = modelFile?.downloadUrl || modelFile?.url;
    const canDownload = Boolean(
        meshUrl
        && (
            item?.canDownload
            || item?.isFree
            // Some API responses lag `canDownload`; with a token we can still resolve via bridge.
            || tokenPresent
        )
    );
    return {
        assetType: 'model',
        source: 'blenderkit',
        sourceLabel: 'BlenderKit',
        sourceAssetId: item?.id != null ? String(item.id) : (item?.assetBaseId != null ? String(item.assetBaseId) : null),
        name: item?.name || 'Untitled',
        description: String(item?.description || '').slice(0, 320),
        thumbnailUrl: pickThumb(files),
        viewerUrl: item?.webPath || item?.thumbnailMiddleUrl || item?.url || null,
        modelUrl: canDownload ? meshUrl : null,
        loadableInScene: canDownload,
        format: /\.gltf($|\?)/i.test(String(meshUrl || modelFile?.filename || '')) ? 'gltf' : (canDownload ? 'glb' : null),
        license: item?.license || null,
        categories: asArray(item?.category),
        tags: asArray(item?.tags).map((x) => String(x)),
        faceCount: null,
    };
}

function normalizeMaterial(item) {
    const files = asArray(item?.files);
    return {
        assetType: 'material',
        source: 'blenderkit',
        sourceLabel: 'BlenderKit',
        sourceAssetId: item?.id != null ? String(item.id) : (item?.assetBaseId != null ? String(item.assetBaseId) : null),
        name: item?.name || 'Untitled Material',
        description: String(item?.description || '').slice(0, 320),
        thumbnailUrl: pickThumb(files),
        viewerUrl: item?.webPath || item?.url || null,
        materialMaps: null,
        loadableInScene: false,
        license: item?.license || null,
        categories: asArray(item?.category),
        tags: asArray(item?.tags).map((x) => String(x)),
    };
}

function normalizeHdri(item) {
    const files = asArray(item?.files);
    const hdri = files.find((f) => /hdr|hdri/i.test(String(f.fileType || '')) || /\.hdr($|\?)/i.test(String(f.filename || '')));
    const canDownload = Boolean(item?.canDownload && hdri?.downloadUrl);
    return {
        assetType: 'hdri',
        source: 'blenderkit',
        sourceLabel: 'BlenderKit',
        sourceAssetId: item?.id != null ? String(item.id) : (item?.assetBaseId != null ? String(item.assetBaseId) : null),
        name: item?.name || 'Untitled HDRI',
        description: String(item?.description || '').slice(0, 320),
        thumbnailUrl: pickThumb(files),
        viewerUrl: item?.webPath || item?.url || null,
        hdriUrl: canDownload ? hdri.downloadUrl : null,
        loadableInScene: canDownload,
        license: item?.license || null,
        categories: asArray(item?.category),
        tags: asArray(item?.tags).map((x) => String(x)),
    };
}

async function queryAssets(assetType, query) {
    const q = String(query || '').trim();
    const tokenPresent = Boolean(getToken());
    const qWithFreeFilter = !tokenPresent && assetType === 'model'
        ? `${q} is_free:true`
        : q;
    const search = qWithFreeFilter
        ? `query=${encodeURIComponent(qWithFreeFilter)}+asset_type:${assetType}`
        : `query=asset_type:${assetType}`;
    const url = `${API_BASE}/search/?${search}&page_size=${PAGE_SIZE}`;
    const payload = await safeFetchJson(url);
    return asArray(payload?.results);
}

async function search(category, query) {
    if (category === 'models') {
        const rows = await queryAssets('model', query);
        console.log(`[BlenderKit] models ${rows.length} rows`);
        return rows.map(normalizeModel).filter((r) => r.sourceAssetId);
    }
    if (category === 'materials') {
        const rows = await queryAssets('material', query);
        return rows.map(normalizeMaterial).filter((r) => r.sourceAssetId);
    }
    if (category === 'hdris') {
        const rows = await queryAssets('hdr', query);
        return rows.map(normalizeHdri).filter((r) => r.sourceAssetId);
    }
    return [];
}

module.exports = {
    categories: ['models', 'materials', 'hdris'],
    search,
};
