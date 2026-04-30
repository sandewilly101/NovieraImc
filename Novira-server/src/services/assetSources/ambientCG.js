const TIMEOUT_MS = 20000;
const PAGE_SIZE = 100;
const DEFAULT_HEADERS = { Accept: 'application/json', 'User-Agent': 'Novira/1.0 asset-registry' };

const safeFetchJson = async (url, options = {}, timeoutMs = TIMEOUT_MS) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            ...options,
            headers: { ...DEFAULT_HEADERS, ...options.headers },
            signal: controller.signal
        });
        if (!res.ok) {
            console.warn(`[ambientCG] HTTP ${res.status} from ${url}`);
            return null;
        }
        return await res.json();
    } catch (err) {
        if (err.name !== 'AbortError') console.warn(`[ambientCG] Fetch failed: ${err.message}`);
        return null;
    } finally {
        clearTimeout(timeout);
    }
};

function getThumb(item) {
    return item.previewImage?.['256-PNG']
        || item.previewImage?.['256-WEBP']
        || item.previewImage?.['128-PNG']
        || null;
}

function firstAbsoluteHdrUrl(value, depth = 0) {
    if (depth > 30 || value == null) return null;
    if (typeof value === 'string') {
        const s = value.trim();
        if (/^https?:\/\/.+\.hdr(\?|$)/i.test(s)) return s;
        return null;
    }
    if (Array.isArray(value)) {
        for (const el of value) {
            const u = firstAbsoluteHdrUrl(el, depth + 1);
            if (u) return u;
        }
        return null;
    }
    if (typeof value === 'object') {
        for (const v of Object.values(value)) {
            const u = firstAbsoluteHdrUrl(v, depth + 1);
            if (u) return u;
        }
    }
    return null;
}

function normalizeHdri(item) {
    const id = item.assetId;
    let hdriUrl = null;

    const dlCats = item.downloadFolders?.default?.downloadFiletypeCategories;
    const hdrOnly = dlCats?.hdri?.downloads;
    if (hdrOnly?.length) {
        const best = hdrOnly.find(d => d.attribute === '1K') || hdrOnly.find(d => d.attribute?.includes?.('1K')) || hdrOnly[0];
        const link = best?.fullDownloadPath || best?.downloadLink;
        if (link && /\.hdr($|\?)/i.test(link)) hdriUrl = link;
    }

    if (!hdriUrl) {
        hdriUrl = firstAbsoluteHdrUrl(item.downloadData);
    }

    /** ZIP bundles are not RGBE; browser cannot parse them as HDR without extraction. */
    const loadableInScene = Boolean(hdriUrl && /\.hdr($|\?)/i.test(hdriUrl));

    return {
        assetType: 'hdri',
        source: 'ambientcg',
        sourceLabel: 'ambientCG',
        sourceAssetId: id,
        name: item.displayName || id,
        description: item.description || '',
        thumbnailUrl: getThumb(item),
        viewerUrl: `https://ambientcg.com/view?id=${id}`,
        hdriUrl: loadableInScene ? hdriUrl : null,
        loadableInScene,
        license: 'CC0',
        categories: [item.category].filter(Boolean),
        tags: item.tags || []
    };
}

function normalizeMaterial(item) {
    const id = item.assetId;

    const maps = {};
    if (item.maps) {
        for (const [mapType, mapData] of Object.entries(item.maps)) {
            const url = mapData?.['1K-JPG'] || mapData?.['1K-PNG'] || Object.values(mapData || {})[0];
            if (url) maps[mapType.toLowerCase()] = url;
        }
    }

    const materialMaps = {
        diffuse: maps.color || maps.diffuse || null,
        normal: maps.normalgl || maps.normal || null,
        roughness: maps.roughness || null,
        ao: maps.ambientocclusion || maps.ao || null,
        displacement: maps.displacement || maps.height || null,
        metalness: maps.metalness || null,
    };

    const hasMaps = Object.values(materialMaps).some(Boolean);
    if (!hasMaps) {
        const base = `https://acg-media.struffelproductions.com/file/ambientCG-Web/media/photos/ambientCG/${id}`;
        materialMaps.diffuse = `${base}/${id}_1K-JPG_Color.jpg`;
        materialMaps.normal = `${base}/${id}_1K-JPG_NormalGL.jpg`;
        materialMaps.roughness = `${base}/${id}_1K-JPG_Roughness.jpg`;
        materialMaps.ao = `${base}/${id}_1K-JPG_AmbientOcclusion.jpg`;
        materialMaps.displacement = `${base}/${id}_1K-JPG_Displacement.jpg`;
    }

    return {
        assetType: 'material',
        source: 'ambientcg',
        sourceLabel: 'ambientCG',
        sourceAssetId: id,
        name: item.displayName || id,
        description: item.description || '',
        thumbnailUrl: getThumb(item),
        viewerUrl: `https://ambientcg.com/view?id=${id}`,
        materialMaps,
        loadableInScene: Boolean(materialMaps.diffuse),
        license: 'CC0',
        categories: [item.category].filter(Boolean),
        tags: item.tags || []
    };
}

function buildUrl(apiType, q, offset) {
    const params = new URLSearchParams({
        type: apiType,
        q,
        limit: String(PAGE_SIZE),
        offset: String(offset),
        sort: 'Popular',
        include: 'downloadData,previewData,tagData,mapData'
    });
    return `https://ambientcg.com/api/v2/full_json?${params}`;
}

async function exhaustQuery(apiType, q) {
    const first = await safeFetchJson(buildUrl(apiType, q, 0));
    if (!first) return [];

    const items = first.foundAssets || [];
    const total = first.numberOfResults || items.length;

    if (total <= PAGE_SIZE) return items;

    const offsets = [];
    for (let off = PAGE_SIZE; off < total; off += PAGE_SIZE) offsets.push(off);

    const pages = await Promise.allSettled(
        offsets.map(off => safeFetchJson(buildUrl(apiType, q, off)))
    );

    for (const page of pages) {
        if (page.status === 'fulfilled' && page.value?.foundAssets) {
            items.push(...page.value.foundAssets);
        }
    }

    return items;
}

async function searchType(apiType, normalizer, query) {
    const words = query.split(/\s+/).filter(w => w.length >= 2);
    const queries = words.length > 1 ? [...new Set(words)] : [query];
    if (!queries.includes('')) queries.push('');

    const allItems = new Map();

    const results = await Promise.allSettled(
        queries.map(q => exhaustQuery(apiType, q))
    );

    for (const result of results) {
        if (result.status === 'fulfilled') {
            for (const item of result.value) {
                if (item.assetId && !allItems.has(item.assetId)) {
                    allItems.set(item.assetId, item);
                }
            }
        }
    }

    const items = [...allItems.values()];
    console.log(`[ambientCG] ${apiType}: exhausted ${queries.length} queries → ${items.length} unique assets`);
    return items.map(normalizer).filter(Boolean);
}

async function search(category, query) {
    switch (category) {
        case 'hdris': return searchType('HDRI', normalizeHdri, query);
        case 'materials': return searchType('Material', normalizeMaterial, query);
        default: return [];
    }
}

module.exports = {
    categories: ['hdris', 'materials'],
    search
};
