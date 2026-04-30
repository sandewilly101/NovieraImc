const asyncHandler = require('express-async-handler');
const UserAsset = require('../models/UserAsset');
const {
    searchAllSources,
    getRecommendedAssets,
    searchByCategory,
    getRecommended,
    getPagedSearch,
    RECOMMENDED_QUERIES
} = require('../services/assetSourceService');
const pinterestSource = require('../services/assetSources/pinterest');
const pixabaySource = require('../services/assetSources/pixabay');
const pexelsSource = require('../services/assetSources/pexels');
const openverseSource = require('../services/assetSources/openverse');
const unsplashSource = require('../services/assetSources/unsplash');

function getImageSourceModule(source) {
    switch (String(source || '').trim().toLowerCase()) {
    case 'pinterest': return pinterestSource;
    case 'pixabay': return pixabaySource;
    case 'pexels': return pexelsSource;
    case 'openverse': return openverseSource;
    case 'unsplash': return unsplashSource;
    default: return null;
    }
}

function getImageSourceRecommendedQueries(source, defaultQuery) {
    const s = String(source || '').trim().toLowerCase();
    const base = String(defaultQuery || '').trim();
    const common = [
        'exhibition booth',
        'conference stage',
        'event design',
        'trade show display',
        'experiential marketing',
    ];
    if (s === 'pixabay') {
        return [base, 'conference stage', 'event venue', 'auditorium seating', ...common];
    }
    if (s === 'openverse') {
        return [base, 'conference stage lighting', 'event interior', 'exhibition booth', ...common];
    }
    if (s === 'pexels') {
        return [base, 'conference audience', 'stage lights', 'trade show booth', ...common];
    }
    if (s === 'unsplash') {
        return [base, 'event production', 'brand activation', 'conference hall', ...common];
    }
    if (s === 'pinterest') {
        return [base, 'event design inspiration', 'conference stage design', ...common];
    }
    return [base, ...common];
}

/** When `limit` is present → window into merged cache; omit for legacy full JSON. */
function readPaging(req, defaultLimit = 60) {
    const raw = req.query.limit;
    if (raw === undefined || raw === '') return null;
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const limit = Math.min(Math.max(parseInt(String(raw), 10) || defaultLimit, 1), 200);
    return { offset, limit };
}

exports.getAssets = asyncHandler(async (req, res) => {
    const assets = await UserAsset.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
        success: true,
        data: assets
    });
});

exports.claimAsset = asyncHandler(async (req, res) => {
    const { projectId, name, imageUrl } = req.body;

    const existing = await UserAsset.findOne({
        where: { userId: req.user.id, sourceProjectId: projectId }
    });

    if (existing) {
        return res.status(400).json({ success: false, error: 'Asset already in vault' });
    }

    const asset = await UserAsset.create({
        userId: req.user.id,
        type: 'blueprint',
        name,
        imageUrl,
        sourceProjectId: projectId
    });

    res.status(201).json({
        success: true,
        data: asset
    });
});

exports.saveAiGeneration = asyncHandler(async (req, res) => {
    const { name, imageUrl, metadata } = req.body;

    const asset = await UserAsset.create({
        userId: req.user.id,
        type: 'ai',
        name,
        imageUrl,
        metadata
    });

    res.status(201).json({
        success: true,
        data: asset
    });
});

exports.updateAsset = asyncHandler(async (req, res) => {
    let asset = await UserAsset.findByPk(req.params.id);

    if (!asset) {
        return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    if (asset.userId !== req.user.id) {
        return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    asset = await asset.update(req.body);

    res.status(200).json({
        success: true,
        data: asset
    });
});

exports.deleteAsset = asyncHandler(async (req, res) => {
    const asset = await UserAsset.findByPk(req.params.id);

    if (!asset) {
        return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    if (asset.userId !== req.user.id) {
        return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    await asset.destroy();

    res.status(200).json({
        success: true,
        data: {}
    });
});


exports.getRecommendedStoreAssets = asyncHandler(async (req, res) => {
    const paging = readPaging(req, 56);
    if (!paging) {
        const assets = await getRecommendedAssets();
        return res.json({
            success: true,
            data: assets,
            meta: { focus: 'event, exhibition, conference, design', total: assets.length }
        });
    }
    const q = RECOMMENDED_QUERIES.models;
    const { items, total, offset, limit, hasMore } = await getPagedSearch('models', q, paging.offset, paging.limit);
    res.json({
        success: true,
        data: items,
        meta: {
            focus: 'event, exhibition, conference, design',
            query: q,
            total,
            offset,
            limit,
            hasMore
        }
    });
});

exports.searchStoreAssets = asyncHandler(async (req, res) => {
    const query = (req.query.q || '').trim();
    if (!query) return res.status(400).json({ success: false, error: 'Query parameter `q` is required' });
    const paging = readPaging(req);
    if (!paging) {
        const assets = await searchAllSources({ query });
        return res.json({ success: true, data: assets, meta: { query, total: assets.length } });
    }
    const { items, total, offset, limit, hasMore } = await getPagedSearch('models', query, paging.offset, paging.limit);
    res.json({ success: true, data: items, meta: { query, total, offset, limit, hasMore } });
});

// ─── HDRIs ───
exports.searchStoreHdris = asyncHandler(async (req, res) => {
    const query = (req.query.q || '').trim();
    if (!query) return res.status(400).json({ success: false, error: 'Query parameter `q` is required' });
    const paging = readPaging(req);
    if (!paging) {
        const assets = await searchByCategory('hdris', query);
        return res.json({ success: true, data: assets, meta: { query, total: assets.length } });
    }
    const { items, total, offset, limit, hasMore } = await getPagedSearch('hdris', query, paging.offset, paging.limit);
    res.json({ success: true, data: items, meta: { query, total, offset, limit, hasMore } });
});

exports.recommendedStoreHdris = asyncHandler(async (req, res) => {
    const paging = readPaging(req, 56);
    if (!paging) {
        const assets = await getRecommended('hdris');
        return res.json({ success: true, data: assets, meta: { total: assets.length } });
    }
    const q = RECOMMENDED_QUERIES.hdris;
    const { items, total, offset, limit, hasMore } = await getPagedSearch('hdris', q, paging.offset, paging.limit);
    res.json({ success: true, data: items, meta: { total, query: q, offset, limit, hasMore } });
});

// ─── Materials ───
exports.searchStoreMaterials = asyncHandler(async (req, res) => {
    const query = (req.query.q || '').trim();
    if (!query) return res.status(400).json({ success: false, error: 'Query parameter `q` is required' });
    const paging = readPaging(req);
    if (!paging) {
        const assets = await searchByCategory('materials', query);
        return res.json({ success: true, data: assets, meta: { query, total: assets.length } });
    }
    const { items, total, offset, limit, hasMore } = await getPagedSearch('materials', query, paging.offset, paging.limit);
    res.json({ success: true, data: items, meta: { query, total, offset, limit, hasMore } });
});

exports.recommendedStoreMaterials = asyncHandler(async (req, res) => {
    const paging = readPaging(req, 56);
    if (!paging) {
        const assets = await getRecommended('materials');
        return res.json({ success: true, data: assets, meta: { total: assets.length } });
    }
    const q = RECOMMENDED_QUERIES.materials;
    const { items, total, offset, limit, hasMore } = await getPagedSearch('materials', q, paging.offset, paging.limit);
    res.json({ success: true, data: items, meta: { total, query: q, offset, limit, hasMore } });
});

// ─── Reference Images ───
exports.searchStoreImages = asyncHandler(async (req, res) => {
    const query = (req.query.q || '').trim();
    if (!query) return res.status(400).json({ success: false, error: 'Query parameter `q` is required' });
    const paging = readPaging(req);
    const isDev = process.env.NODE_ENV !== 'production';
    const source = String(req.query.source || '').trim().toLowerCase();
    const sourceModule = getImageSourceModule(source);
    if (sourceModule) {
        const rows = await sourceModule.search('images', query);
        if (!paging) {
            return res.json({ success: true, data: rows, meta: { query, total: rows.length, source } });
        }
        const offset = Math.max(0, paging.offset || 0);
        const limit = Math.max(1, paging.limit || 56);
        const items = rows.slice(offset, offset + limit);
        const hasMore = offset + items.length < rows.length;
        return res.json({
            success: true,
            data: items,
            meta: {
                query, source, total: rows.length, offset, limit, hasMore,
                ...(isDev ? {
                    _dev: {
                        pinterestCount: items.filter(i => i.source === 'pinterest').length,
                        sources: [...new Set(items.map(i => i.source))],
                    }
                } : {}),
            }
        });
    }
    if (!paging) {
        const assets = await searchByCategory('images', query);
        return res.json({ success: true, data: assets, meta: { query, total: assets.length } });
    }
    const { items, total, offset, limit, hasMore } = await getPagedSearch('images', query, paging.offset, paging.limit);
    res.json({
        success: true,
        data: items,
        meta: {
            query, total, offset, limit, hasMore,
            ...(isDev ? {
                _dev: {
                    pinterestCount: items.filter(i => i.source === 'pinterest').length,
                    sources: [...new Set(items.map(i => i.source))],
                }
            } : {}),
        }
    });
});

exports.recommendedStoreImages = asyncHandler(async (req, res) => {
    const paging = readPaging(req, 56);
    const imageDefaultRotation = [
        'event stage design',
        'exhibition booth',
        'experiential marketing',
        'trade show stand display',
        'conference stage lighting',
    ];

    // Stable query: client passes ?qidx=N from the first response so all offset pages
    // use the same cache key. Falls back to index 0 if not provided.
    const qIdx = Math.max(0, Math.min(
        parseInt(req.query.qidx, 10) || 0,
        imageDefaultRotation.length - 1
    ));
    const pickedQuery = imageDefaultRotation[qIdx];
    const source = String(req.query.source || '').trim().toLowerCase();
    const isDev = process.env.NODE_ENV !== 'production';
    const sourceModule = getImageSourceModule(source);
    if (sourceModule) {
        const queryPlan = getImageSourceRecommendedQueries(source, pickedQuery);
        let rows = [];
        let usedQuery = pickedQuery;
        for (const q of queryPlan) {
            // eslint-disable-next-line no-await-in-loop
            const hit = await sourceModule.search('images', q);
            if (Array.isArray(hit) && hit.length > 0) {
                rows = hit;
                usedQuery = q;
                break;
            }
        }
        if (!paging) {
            return res.json({
                success: true,
                data: rows,
                meta: { total: rows.length, query: usedQuery, qidx: qIdx, source }
            });
        }
        const offset = Math.max(0, paging.offset || 0);
        const limit = Math.max(1, paging.limit || 56);
        const items = rows.slice(offset, offset + limit);
        const hasMore = offset + items.length < rows.length;
        return res.json({
            success: true,
            data: items,
            meta: {
                total: rows.length,
                query: usedQuery,
                qidx: qIdx,
                source,
                offset,
                limit,
                hasMore,
                ...(isDev ? { _dev: { queryUsed: usedQuery, qidx: qIdx, source } } : {}),
            }
        });
    }

    if (!paging) {
        const assets = await searchByCategory('images', pickedQuery);
        return res.json({
            success: true,
            data: assets,
            meta: { total: assets.length, query: pickedQuery, qidx: qIdx }
        });
    }
    const { items, total, offset, limit, hasMore } = await getPagedSearch('images', pickedQuery, paging.offset, paging.limit);

    // Dev-mode diagnostics
    res.json({
        success: true,
        data: items,
        meta: {
            total,
            query: pickedQuery,
            qidx: qIdx,
            offset,
            limit,
            hasMore,
            ...(isDev ? { _dev: { queryUsed: pickedQuery, qidx: qIdx } } : {}),
        }
    });
});

exports.proxySketchfabDownload = asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const headerToken = req.headers['x-provider-sketchfab-token'];
    const userPrefToken = req.user?.preferences?.providerTokens?.sketchfab;
    const sfToken = req.query.token || headerToken || userPrefToken || process.env.SKETCHFAB_API_TOKEN;

    if (!uid) {
        return res.status(400).json({ success: false, error: 'Model UID is required' });
    }
    if (!sfToken) {
        return res.status(400).json({ success: false, error: 'No Sketchfab API token configured' });
    }

    const dlRes = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, {
        headers: { Authorization: `Token ${sfToken}` }
    });

    if (!dlRes.ok) {
        const text = await dlRes.text().catch(() => '');
        return res.status(dlRes.status).json({
            success: false,
            error: `Sketchfab API error: ${dlRes.status}`,
            detail: text.slice(0, 200)
        });
    }

    const data = await dlRes.json();
    res.status(200).json({ success: true, data });
});

function collectFree3dDownloadRequests(node, out = []) {
    if (!node || typeof node !== 'object') return out;
    if (Array.isArray(node)) {
        node.forEach((child) => collectFree3dDownloadRequests(child, out));
        return out;
    }
    const body = node?.downloadRequest?.body;
    if (body?.guid && body?.format && body?.lod && body?.relativePath) {
        out.push({
            guid: String(body.guid),
            format: String(body.format).toLowerCase(),
            lod: String(body.lod).toLowerCase(),
            relativePath: String(body.relativePath),
        });
    }
    if (node?.guid && node?.format && node?.lod && node?.relativePath) {
        out.push({
            guid: String(node.guid),
            format: String(node.format).toLowerCase(),
            lod: String(node.lod).toLowerCase(),
            relativePath: String(node.relativePath),
        });
    }
    Object.values(node).forEach((child) => collectFree3dDownloadRequests(child, out));
    return out;
}

function pickFree3dRequest(reqs, guid, preferredLod = '10k') {
    const items = reqs.filter((r) => r.guid === String(guid) && r.format === 'glb');
    if (!items.length) return null;
    const lodRank = (lod) => (lod === preferredLod ? 0 : lod === '10k' ? 1 : lod === '100k' ? 2 : lod === '1k' ? 3 : 4);
    items.sort((a, b) => {
        const lr = lodRank(a.lod) - lodRank(b.lod);
        if (lr !== 0) return lr;
        return a.relativePath.localeCompare(b.relativePath);
    });
    return items[0];
}

exports.proxyFree3dModelDownload = asyncHandler(async (req, res) => {
    const guid = String(req.params.guid || '').trim();
    const preferredLod = String(req.query.lod || '10k').toLowerCase();
    if (!guid) return res.status(400).json({ success: false, error: 'Model guid is required' });

    const token = req.headers['x-provider-free3d-token']
        || req.user?.preferences?.providerTokens?.free3d
        || process.env.FREE3D_AGENT_TOKEN
        || process.env.FREE3D_API_TOKEN;
    if (!token) {
        return res.status(400).json({ success: false, error: 'No Free3D token configured' });
    }

    const fmtRes = await fetch(`https://free3d.online/api/download/formats/${encodeURIComponent(guid)}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'User-Agent': 'Novira/1.0 free3d-bridge',
        }
    });
    if (!fmtRes.ok) {
        const txt = await fmtRes.text().catch(() => '');
        return res.status(fmtRes.status).json({ success: false, error: `Free3D formats failed (${fmtRes.status})`, detail: txt.slice(0, 300) });
    }
    const fmtJson = await fmtRes.json().catch(() => null);
    const reqs = collectFree3dDownloadRequests(fmtJson);
    const picked = pickFree3dRequest(reqs, guid, preferredLod);
    if (!picked) {
        return res.status(404).json({ success: false, error: 'No downloadable GLB request found for this model' });
    }

    const directRes = await fetch('https://free3d.online/api/download/direct', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'Novira/1.0 free3d-bridge',
        },
        body: JSON.stringify(picked),
    });
    if (!directRes.ok) {
        const txt = await directRes.text().catch(() => '');
        return res.status(directRes.status).json({ success: false, error: `Free3D direct failed (${directRes.status})`, detail: txt.slice(0, 300) });
    }
    const directJson = await directRes.json().catch(() => null);
    const fileUrl = directJson?.downloadUrl || directJson?.directUrl;
    if (!fileUrl) return res.status(502).json({ success: false, error: 'Free3D direct route did not return downloadUrl' });

    const upstream = await fetch(fileUrl, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Novira/1.0 free3d-bridge' }
    });
    if (!upstream.ok || !upstream.body) {
        return res.status(upstream.status || 502).json({ success: false, error: `Free3D file fetch failed (${upstream.status})` });
    }
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'model/gltf-binary');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'private, max-age=300');
    const cl = upstream.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);
    const { Readable } = require('stream');
    Readable.fromWeb(upstream.body).pipe(res);
});

/**
 * `/api/v1/assets/{pk}/` expects the per-version **id**. Catalog/search may only have **assetBaseId**;
 * if direct GET returns 404, resolve via search `asset_base_id:` then retry detail.
 * @param {'model'|'hdr'} assetTypeSlug
 */
async function fetchBlenderKitAssetDetailResponse(rawId, token, assetTypeSlug) {
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'Novira/1.0 blenderkit-bridge',
    };
    const detail = (pk) => fetch(`https://www.blenderkit.com/api/v1/assets/${encodeURIComponent(String(pk))}/`, { headers });

    let assetRes = await detail(rawId);
    if (assetRes.ok) return assetRes;

    if (assetRes.status !== 404) return assetRes;

    const at = assetTypeSlug === 'hdr' ? 'hdr' : 'model';
    /** BlenderKit `query` uses space-separated facets (same as searchBlenderKitAssets), not `+` literals. */
    const searchQueries = [
        `asset_base_id:${rawId} asset_type:${at}`,
        `asset_base_id:${rawId}`,
        `id:${rawId} asset_type:${at}`,
    ];

    let rows = [];
    for (const q of searchQueries) {
        const searchUrl = `https://www.blenderkit.com/api/v1/search/?query=${encodeURIComponent(q)}&page_size=12`;
        const sRes = await fetch(searchUrl, { headers });
        if (!sRes.ok) continue;
        const payload = await sRes.json().catch(() => null);
        rows = Array.isArray(payload?.results) ? payload.results : [];
        if (rows.length) break;
    }

    const rid = rows[0]?.id ?? rows[0]?.pk;
    if (rid == null || String(rid) === String(rawId)) return assetRes;

    return detail(String(rid));
}

function pickBlenderKitGltfFile(files = []) {
    const list = Array.isArray(files) ? files : [];
    const score = (f) => {
        const t = String(f?.fileType || '').toLowerCase();
        const n = String(f?.filename || '').toLowerCase();
        const u = String(f?.downloadUrl || f?.url || '').toLowerCase();
        const looksMesh = /\.(glb|gltf)($|\?)/i.test(n)
            || /\.(glb|gltf)($|\?)/i.test(u)
            || t === 'gltf'
            || t === 'gltf_godot'
            || t.includes('gltf');
        if (!looksMesh) return 0;
        if (n.endsWith('.glb') || u.includes('.glb')) return 3;
        if (t === 'gltf' || t === 'gltf_godot') return 2;
        return 1;
    };
    const ranked = [...list].sort((a, b) => score(b) - score(a));
    return ranked.find((f) => score(f) > 0) || null;
}

exports.proxyBlenderKitModelDownload = asyncHandler(async (req, res) => {
    const assetId = String(req.params.id || '').trim();
    if (!assetId) return res.status(400).json({ success: false, error: 'BlenderKit asset id is required' });

    const token = req.headers['x-provider-blenderkit-token']
        || req.user?.preferences?.providerTokens?.blenderkit
        || process.env.BLENDERKIT_API_KEY
        || process.env.BLENDERKIT_TOKEN;
    if (!token) {
        return res.status(400).json({ success: false, error: 'No BlenderKit token configured' });
    }

    const assetRes = await fetchBlenderKitAssetDetailResponse(assetId, token, 'model');
    if (!assetRes.ok) {
        const txt = await assetRes.text().catch(() => '');
        return res.status(assetRes.status).json({ success: false, error: `BlenderKit asset fetch failed (${assetRes.status})`, detail: txt.slice(0, 300) });
    }
    const assetJson = await assetRes.json().catch(() => null);
    const files = Array.isArray(assetJson?.files) ? assetJson.files : [];
    const gltf = pickBlenderKitGltfFile(files);
    const dlUrl = gltf?.downloadUrl || gltf?.url;
    if (!dlUrl) {
        return res.status(404).json({
            success: false,
            error: 'No GLB/glTF export for this BlenderKit asset (blend-only or unsupported). Pick another model or open it in Blender.',
            detail: assetJson?.name ? String(assetJson.name).slice(0, 120) : undefined,
        });
    }

    let fileRes = await fetch(dlUrl, {
        redirect: 'follow',
        headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Novira/1.0 blenderkit-bridge',
        },
    });
    // Some BlenderKit CDN URLs are pre-signed; sending Bearer can return 403 while unsigned GET works.
    if ((!fileRes.ok || !fileRes.body) && (fileRes.status === 403 || fileRes.status === 401)) {
        fileRes = await fetch(dlUrl, {
            redirect: 'follow',
            headers: { 'User-Agent': 'Novira/1.0 blenderkit-bridge' },
        });
    }
    if (!fileRes.ok || !fileRes.body) {
        const txt = await fileRes.text().catch(() => '');
        return res.status(fileRes.status || 502).json({ success: false, error: `BlenderKit file fetch failed (${fileRes.status})`, detail: txt.slice(0, 300) });
    }
    res.setHeader('Content-Type', fileRes.headers.get('content-type') || 'model/gltf-binary');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'private, max-age=300');
    const cl = fileRes.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);
    const { Readable } = require('stream');
    Readable.fromWeb(fileRes.body).pipe(res);
});

exports.proxyBlenderKitHdriDownload = asyncHandler(async (req, res) => {
    const assetId = String(req.params.id || '').trim();
    if (!assetId) return res.status(400).json({ success: false, error: 'BlenderKit asset id is required' });

    const token = req.headers['x-provider-blenderkit-token']
        || req.user?.preferences?.providerTokens?.blenderkit
        || process.env.BLENDERKIT_API_KEY
        || process.env.BLENDERKIT_TOKEN;
    if (!token) {
        return res.status(400).json({ success: false, error: 'No BlenderKit token configured' });
    }

    const assetRes = await fetchBlenderKitAssetDetailResponse(assetId, token, 'hdr');
    if (!assetRes.ok) {
        const txt = await assetRes.text().catch(() => '');
        return res.status(assetRes.status).json({ success: false, error: `BlenderKit asset fetch failed (${assetRes.status})`, detail: txt.slice(0, 300) });
    }
    const assetJson = await assetRes.json().catch(() => null);
    const files = Array.isArray(assetJson?.files) ? assetJson.files : [];
    const hdri = files.find((f) => /hdr|hdri/i.test(String(f?.fileType || '')) || /\.hdr($|\?)/i.test(String(f?.filename || '')));
    const dlUrl = hdri?.downloadUrl;
    if (!dlUrl) {
        return res.status(404).json({ success: false, error: 'No downloadable HDR file found for this BlenderKit asset' });
    }

    let fileRes = await fetch(dlUrl, {
        redirect: 'follow',
        headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Novira/1.0 blenderkit-hdri-bridge',
        },
    });
    if ((!fileRes.ok || !fileRes.body) && (fileRes.status === 403 || fileRes.status === 401)) {
        fileRes = await fetch(dlUrl, {
            redirect: 'follow',
            headers: { 'User-Agent': 'Novira/1.0 blenderkit-hdri-bridge' },
        });
    }
    if (!fileRes.ok || !fileRes.body) {
        const txt = await fileRes.text().catch(() => '');
        return res.status(fileRes.status || 502).json({ success: false, error: `BlenderKit HDR fetch failed (${fileRes.status})`, detail: txt.slice(0, 300) });
    }
    res.setHeader('Content-Type', fileRes.headers.get('content-type') || 'image/vnd.radiance');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'private, max-age=300');
    const cl = fileRes.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);
    const { Readable } = require('stream');
    Readable.fromWeb(fileRes.body).pipe(res);
});

function blenderKitTokenFromReq(req) {
    return req.headers['x-provider-blenderkit-token']
        || req.user?.preferences?.providerTokens?.blenderkit
        || process.env.BLENDERKIT_API_KEY
        || process.env.BLENDERKIT_TOKEN
        || '';
}

function blenderKitHeaders(req, needsAuth = false) {
    const h = {
        Accept: 'application/json',
        'User-Agent': 'Novira/1.0 blenderkit-api',
    };
    const token = blenderKitTokenFromReq(req);
    if (token) h.Authorization = `Bearer ${token}`;
    if (needsAuth && !token) return null;
    return h;
}

function isBlenderKitApiUrl(u) {
    try {
        const parsed = new URL(u);
        if (parsed.protocol !== 'https:') return false;
        const h = parsed.hostname;
        return h === 'www.blenderkit.com' || h === 'blenderkit.com';
    } catch {
        return false;
    }
}

exports.searchBlenderKitAssets = asyncHandler(async (req, res) => {
    const nextRaw = String(req.query.next || '').trim();
    let upstream;
    if (nextRaw) {
        let followUrl = nextRaw;
        try {
            followUrl = decodeURIComponent(nextRaw);
        } catch {
            followUrl = nextRaw;
        }
        if (!isBlenderKitApiUrl(followUrl)) {
            return res.status(403).json({ success: false, error: 'Invalid or disallowed BlenderKit next URL' });
        }
        upstream = await fetch(followUrl, { headers: blenderKitHeaders(req) });
    } else {
        const q = String(req.query.q || '').trim();
        const assetType = String(req.query.assetType || req.query.asset_type || 'model').trim().toLowerCase();
        const pageSize = Math.min(Math.max(parseInt(req.query.limit || req.query.page_size, 10) || 36, 1), 100);
        const query = q ? `${q} asset_type:${assetType}` : `asset_type:${assetType}`;
        const apiUrl = `https://www.blenderkit.com/api/v1/search/?query=${encodeURIComponent(query)}&page_size=${pageSize}`;
        upstream = await fetch(apiUrl, { headers: blenderKitHeaders(req) });
    }
    if (!upstream.ok) {
        const detail = await upstream.text().catch(() => '');
        return res.status(upstream.status).json({
            success: false,
            error: `BlenderKit search failed (${upstream.status})`,
            detail: detail.slice(0, 300),
        });
    }
    const payload = await upstream.json().catch(() => null);
    const rows = Array.isArray(payload?.results) ? payload.results : [];
    res.json({
        success: true,
        data: rows,
        meta: {
            query: nextRaw ? null : String(req.query.q || '').trim(),
            assetType: nextRaw ? null : String(req.query.assetType || req.query.asset_type || 'model').trim().toLowerCase(),
            total: typeof payload?.count === 'number' ? payload.count : rows.length,
            count: rows.length,
            next: payload?.next || null,
        }
    });
});

exports.getBlenderKitCategories = asyncHandler(async (req, res) => {
    const upstream = await fetch('https://www.blenderkit.com/api/v1/categories/', { headers: blenderKitHeaders(req) });
    if (!upstream.ok) {
        const detail = await upstream.text().catch(() => '');
        return res.status(upstream.status).json({
            success: false,
            error: `BlenderKit categories failed (${upstream.status})`,
            detail: detail.slice(0, 300),
        });
    }
    const payload = await upstream.json().catch(() => null);
    res.json({ success: true, data: payload });
});

exports.importBlenderKitAsset = asyncHandler(async (req, res) => {
    const assetId = String(req.body?.assetId || req.body?.id || '').trim();
    if (!assetId) {
        return res.status(400).json({ success: false, error: 'assetId is required' });
    }

    const headers = blenderKitHeaders(req, true);
    if (!headers) {
        return res.status(400).json({ success: false, error: 'No BlenderKit token configured' });
    }

    // Fetch asset metadata to validate downloadability and type.
    const assetRes = await fetchBlenderKitAssetDetailResponse(assetId, blenderKitTokenFromReq(req), 'model');
    if (!assetRes.ok) {
        const detail = await assetRes.text().catch(() => '');
        return res.status(assetRes.status).json({
            success: false,
            error: `BlenderKit asset lookup failed (${assetRes.status})`,
            detail: detail.slice(0, 300),
        });
    }
    const assetJson = await assetRes.json().catch(() => null);
    const files = Array.isArray(assetJson?.files) ? assetJson.files : [];
    const gltf = pickBlenderKitGltfFile(files);
    const meshUrl = gltf?.downloadUrl || gltf?.url;

    if (!meshUrl) {
        return res.status(404).json({ success: false, error: 'Asset has no downloadable GLB/GLTF file' });
    }

    const bridgePk = assetJson?.id != null ? String(assetJson.id) : assetId;
    // We return the bridge URL; frontend can consume this like other import paths.
    const bridgeUrl = `${req.protocol}://${req.get('host')}/api/asset-store/blenderkit/model/${encodeURIComponent(bridgePk)}`;
    res.json({
        success: true,
        data: {
            assetId: bridgePk,
            name: assetJson?.name || 'BlenderKit Asset',
            source: 'blenderkit',
            sourceAssetId: bridgePk,
            viewerUrl: assetJson?.webPath || assetJson?.url || null,
            thumbnailUrl: null,
            importUrl: bridgeUrl,
            loadableInScene: true,
            format: /\.gltf($|\?)/i.test(String(meshUrl)) ? 'gltf' : 'glb',
        }
    });
});

const PROXY_ALLOWED_HOSTS = [
    'raw.githubusercontent.com',
    'cdn.polyhaven.com',
    'dl.polyhaven.org',
    'api.polyhaven.com',
    'cdn.jsdelivr.net',
    'data.jsdelivr.net',
    'unpkg.com',
    'www.unpkg.com',
    'cdnjs.cloudflare.com',
    'google.github.io',
    'ambientcg.com',
    'acg-media.struffelproductions.com',
    'github.com',
    'objects.githubusercontent.com',
    'images.pexels.com',
    'images.pixabay.com',
    'pixabay.com',
    'cdn.pixabay.com',
    'static.poly.pizza',
    'poly.pizza',
    'api.europeana.eu',
    'www.europeana.eu',
    'media.sketchfab.com',
    'sketchfab.com',
    'www.thingiverse.com',
    'cdn.thingiverse.com',
    'thingiverse.com',
    'www.myminifactory.com',
    'myminifactory.com',
    'images.myminifactory.com',
    'free3d.online',
    'www.blenderkit.com',
    'blenderkit.com',
    'public.blenderkit.com',
];

function isHostAllowed(hostname) {
    return PROXY_ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
}

exports.proxyAssetDownload = asyncHandler(async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ success: false, error: 'Missing `url` query parameter' });

    let parsed;
    try { parsed = new URL(url); } catch { return res.status(400).json({ success: false, error: 'Invalid URL' }); }
    if (parsed.protocol !== 'https:') return res.status(400).json({ success: false, error: 'Only HTTPS URLs allowed' });
    if (!isHostAllowed(parsed.hostname)) {
        return res.status(403).json({ success: false, error: `Domain not allowed: ${parsed.hostname}` });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
        const upstream = await fetch(url, {
            signal: controller.signal,
            redirect: 'follow',
            headers: { 'User-Agent': 'Novira/1.0 asset-proxy' }
        });

        if (!upstream.ok) {
            return res.status(upstream.status).json({ success: false, error: `Upstream returned ${upstream.status}` });
        }

        const ct = upstream.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', ct);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');

        const cl = upstream.headers.get('content-length');
        if (cl) res.setHeader('Content-Length', cl);

        const { Readable } = require('stream');
        Readable.fromWeb(upstream.body).pipe(res);
    } catch (err) {
        if (!res.headersSent) {
            const msg = err.name === 'AbortError' ? 'Proxy request timed out (90s)' : `Proxy fetch failed: ${err.message}`;
            res.status(502).json({ success: false, error: msg });
        }
    } finally {
        clearTimeout(timeout);
    }
});

exports.proxyModelDownload = exports.proxyAssetDownload;
