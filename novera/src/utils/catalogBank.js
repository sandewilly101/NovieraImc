/** Global “My library” + per-project shelf (local persistence until scenegraph API carries it). */

export const GLOBAL_ASSET_LIBRARY_KEY = 'novira_global_asset_library_v1';

export function projectShelfStorageKey(projectId) {
  const id = projectId != null && String(projectId).trim() !== '' ? String(projectId).trim() : 'none';
  return `novira_project_asset_shelf_${id}`;
}

export function loadGlobalLibrary() {
  try {
    const raw = localStorage.getItem(GLOBAL_ASSET_LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGlobalLibrary(entries) {
  try {
    localStorage.setItem(GLOBAL_ASSET_LIBRARY_KEY, JSON.stringify(entries));
  } catch {
    /* quota */
  }
}

export function loadProjectShelf(projectId) {
  try {
    const raw = localStorage.getItem(projectShelfStorageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProjectShelf(projectId, entries) {
  try {
    localStorage.setItem(projectShelfStorageKey(projectId), JSON.stringify(entries));
  } catch {
    /* quota */
  }
}

export function assetFingerprint(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const u = String(entry.url || entry.originalModelUrl || '').trim();
  if (u) return `url:${u}`;
  const sid = entry.sourceAssetId != null ? String(entry.sourceAssetId) : '';
  const src = entry.source != null ? String(entry.source) : '';
  if (sid && src) return `src:${src}:${sid}`;
  if (entry.sceneObjectId) return `obj:${entry.sceneObjectId}`;
  if (entry.id) return `id:${entry.id}`;
  return `n:${entry.name || ''}`;
}

/** Best preview URL from a persisted bank row (aliases from older saves). */
export function pickBankEntryThumbnail(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const candidates = [
    entry.thumbnail,
    entry.thumbnailUrl,
    entry.thumb,
    entry.previewUrl,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

/** Normalize shelf rows so `thumbnail` is populated when only legacy keys exist. */
export function normalizeBankLibrary(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map((e) => {
    if (!e || typeof e !== 'object') return e;
    const thumb = pickBankEntryThumbnail(e);
    if (!thumb || thumb === e.thumbnail) return e;
    return { ...e, thumbnail: thumb };
  });
}

/** Preview URL to store on scene objects / bank entries from catalog metadata. */
export function pickSceneObjectThumbnail(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const m = obj.metadata;
  const candidates = [
    obj.thumbnail,
    obj.thumbnailUrl,
    obj.thumb,
    obj.previewUrl,
    m?.thumbnail,
    m?.thumbnailUrl,
    m?.thumb,
    m?.image,
    m?.previewUrl,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

export function sceneObjectToBankEntry(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const t = obj.type;
  const meshish = t === 'gltf' || t === 'gltf-part' || t === 'stl' || t === 'sketchfab';
  if (!meshish && t !== 'primitive' && t !== 'primitive_booth') return null;
  return {
    id: `bank_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    sceneObjectId: obj.id,
    name: obj.name || 'Asset',
    url: obj.url || obj.originalModelUrl || null,
    originalModelUrl: obj.originalModelUrl || null,
    source: obj.source || obj.metadata?.source || 'scene',
    sourceAssetId: obj.sourceAssetId || null,
    type: t,
    thumbnail: pickSceneObjectThumbnail(obj),
    addedAt: Date.now(),
  };
}

export function mergeBankUnique(list, entry) {
  if (!entry) return list;
  const fp = assetFingerprint(entry);
  let next = Array.isArray(list) ? [...list] : [];
  if (next.some((e) => assetFingerprint(e) === fp)) return next;

  const sid = entry.sourceAssetId != null ? String(entry.sourceAssetId) : '';
  const src = String(entry.source || '');
  const resolvedUrl = String(entry.url || entry.originalModelUrl || '').trim();
  const replacesPlaceholder =
    sid &&
    resolvedUrl &&
    (src === 'sketchfab' || src === 'polyhaven');

  if (replacesPlaceholder) {
    next = next.filter((e) => !(String(e.source || '') === src && String(e.sourceAssetId || '') === sid));
  }

  next.push(entry);
  return next;
}
