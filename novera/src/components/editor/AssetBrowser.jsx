import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
    PhotoIcon,
    CubeIcon,
    SunIcon,
    SwatchIcon,
    ArchiveBoxIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';
import { assetService } from '../../api/apiService';
import {
    downloadSketchfabModel,
    downloadPolyHavenModel,
    downloadGenericModel,
    downloadFree3DModel,
    downloadBlenderKitModel,
    downloadBlenderKitHdri,
    downloadHdriAsBlob,
    sketchfabEmbedUrl,
    fetchAPI,
} from '../../utils/sketchfabLoader';
import { showToast } from '../../utils/noviraToast';
import { registerBlobUrl, isBlobFromSession } from '../../utils/blobRegistry';
import { ensurePlannerReduxStore } from '../../utils/plannerReduxBridge';
import { addResolvedModelToFloorPlan } from '../../utils/plannerAddFromLibrary';
import ModelPreviewModal from './ModelPreviewModal';
import { buildExtendedBulkCatalogRows, EXTENDED_CATALOG_META } from '../../data/extendedBulkCatalog';
import { pickBankEntryThumbnail } from '../../utils/catalogBank';
import '../../styles/pro-editor.css';

const DREI_PRESETS = [
    { id: 'apartment', name: 'Apartment', thumb: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=200&q=60' },
    { id: 'city', name: 'City', thumb: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=200&q=60' },
    { id: 'dawn', name: 'Dawn', thumb: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=200&q=60' },
    { id: 'forest', name: 'Forest', thumb: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=200&q=60' },
    { id: 'lobby', name: 'Lobby', thumb: 'https://images.unsplash.com/photo-1564078516393-cf04bd966897?auto=format&fit=crop&w=200&q=60' },
    { id: 'night', name: 'Night', thumb: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?auto=format&fit=crop&w=200&q=60' },
    { id: 'park', name: 'Park', thumb: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=200&q=60' },
    { id: 'studio', name: 'Studio', thumb: 'https://images.unsplash.com/photo-1604754742629-3e5728249d73?auto=format&fit=crop&w=200&q=60' },
    { id: 'sunset', name: 'Sunset', thumb: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=200&q=60' },
    { id: 'warehouse', name: 'Warehouse', thumb: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=200&q=60' },
];

const SIMPLE_MATERIALS = [
    { id: 'metal', name: 'Metal', color: '#94a3b8', roughness: 0.1, metalness: 0.9 },
    { id: 'glass', name: 'Glass', color: '#e0f2fe', roughness: 0.0, metalness: 0.1 },
    { id: 'wood', name: 'Wood', color: '#92400e', roughness: 0.8, metalness: 0.0 },
    { id: 'concrete', name: 'Concrete', color: '#9ca3af', roughness: 0.95, metalness: 0.0 },
    { id: 'plastic', name: 'Plastic', color: '#ef4444', roughness: 0.4, metalness: 0.0 },
    { id: 'gold', name: 'Gold', color: '#fbbf24', roughness: 0.15, metalness: 1.0 },
    { id: 'rubber', name: 'Rubber', color: '#1e293b', roughness: 1.0, metalness: 0.0 },
    { id: 'chrome', name: 'Chrome', color: '#cbd5e1', roughness: 0.05, metalness: 1.0 },
];

function SourceBadge({ label }) {
    return <div className="source-badge">{label}</div>;
}

/** My library row preview: uses stored URL, or Sketchfab oEmbed when only `sourceAssetId` exists (legacy rows). */
function BankLibraryThumb({ row }) {
    const staticSrc = pickBankEntryThumbnail(row) || '';
    const [src, setSrc] = useState(staticSrc);
    useEffect(() => {
        setSrc(staticSrc);
    }, [staticSrc, row.id]);

    useEffect(() => {
        if (staticSrc) return undefined;
        const srcKey = String(row.source || '').toLowerCase();
        const sid = row.sourceAssetId != null ? String(row.sourceAssetId).trim() : '';
        if (srcKey !== 'sketchfab' || !sid) return undefined;
        let cancelled = false;
        const oembed = `https://sketchfab.com/oembed?url=${encodeURIComponent(`https://sketchfab.com/models/${sid}`)}`;
        fetch(oembed)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!cancelled && j?.thumbnail_url) setSrc(String(j.thumbnail_url));
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [staticSrc, row.source, row.sourceAssetId, row.id]);

    if (src) {
        return (
            <img
                src={src}
                alt=""
                loading="lazy"
                onError={() => setSrc('')}
            />
        );
    }
    return (
        <div className="asset-bank-thumb-fallback" aria-hidden>
            {row.name?.slice(0, 1)?.toUpperCase() || '?'}
        </div>
    );
}

function AssetCard({ asset, onClick, actionLabel = 'Add', onAction, onSecondary, secondaryLabel, opacity = 1, selected, activeBadge, isDownloading }) {
    return (
        <div
            className={`asset-card ${selected ? 'selected' : ''}`}
            onClick={isDownloading ? undefined : onClick}
            title={asset.name}
            style={{ opacity: isDownloading ? 0.5 : opacity, pointerEvents: isDownloading ? 'none' : undefined }}
        >
            {isDownloading && (
                <div className="loading-overlay">
                    <div style={{ textAlign: 'center' }}>
                        <div className="loading-spinner" />
                        <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>Loading...</div>
                    </div>
                </div>
            )}
            <div className="asset-thumb">
                {asset.thumbnailUrl || asset.thumb ? (
                    <img src={asset.thumbnailUrl || asset.thumb} alt={asset.name} loading="lazy" />
                ) : (
                    <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 11 }}>
                        {asset.sourceLabel || 'Asset'}
                    </div>
                )}
                {asset.sourceLabel && <SourceBadge label={asset.sourceLabel} />}
                {activeBadge && <div className="active-badge">ACTIVE</div>}
            </div>
            <div className="asset-name">{asset.name}</div>
            {(asset.license || asset.loadableInScene !== undefined) && (
                <div className="asset-badge-row">
                    {asset.license && (
                        <span className="asset-badge" style={{ background: '#e2e8f0', color: '#334155' }}>
                            {asset.license}
                        </span>
                    )}
                    {asset.accessLabel && (
                        <span className="asset-badge" style={{
                            background: asset.accessTier === 'free_download'
                                ? '#dcfce7'
                                : asset.accessTier === 'licensed'
                                    ? '#e0e7ff'
                                    : asset.accessTier === 'requires_purchase'
                                        ? '#fee2e2'
                                        : '#fef3c7',
                            color: asset.accessTier === 'free_download'
                                ? '#166534'
                                : asset.accessTier === 'licensed'
                                    ? '#3730a3'
                                    : asset.accessTier === 'requires_purchase'
                                        ? '#991b1b'
                                        : '#92400e'
                        }}>
                            {asset.accessLabel}
                        </span>
                    )}
                    {asset.loadableInScene && (
                        <span className="asset-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                            Loadable
                        </span>
                    )}
                    {!asset.loadableInScene && asset.assetType === 'model' && (
                        <span className="asset-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                            {asset.source === 'sketchfab' ? 'Access Required' : 'View Only'}
                        </span>
                    )}
                </div>
            )}
            {(onAction || onSecondary) && (
                <div className="asset-btn-row">
                    {onAction && (
                        <button
                            className="asset-btn asset-btn-primary"
                            onClick={(e) => { e.stopPropagation(); onAction(); }}
                            disabled={isDownloading}
                            style={isDownloading ? { cursor: 'wait' } : undefined}
                        >
                            {isDownloading ? 'Loading...' : actionLabel}
                        </button>
                    )}
                    {onSecondary && (
                        <button
                            className="asset-btn asset-btn-secondary"
                            onClick={(e) => { e.stopPropagation(); onSecondary(); }}
                        >
                            {secondaryLabel || 'View'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/** Fullscreen-style Sketchfab viewer (enlarged window, like Sketchfab site). */
function SketchfabPreviewModal({ asset, onClose }) {
    const uid = asset?.source === 'sketchfab' && asset?.sourceAssetId ? String(asset.sourceAssetId) : '';
    useEffect(() => {
        if (!uid) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [uid, onClose]);

    if (!uid) return null;
    const embedSrc = sketchfabEmbedUrl(uid, { autostart: 1 });

    return (
        <div
            className="sketchfab-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sketchfab-preview-title"
            onClick={onClose}
        >
            <div
                className="sketchfab-preview-modal__dialog"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sketchfab-preview-modal__header">
                    <h2 id="sketchfab-preview-title" className="sketchfab-preview-modal__title">{asset.name}</h2>
                    <button
                        type="button"
                        className="sketchfab-preview-modal__close"
                        onClick={onClose}
                        aria-label="Close preview"
                    >
                        ×
                    </button>
                </div>
                <iframe
                    title={`Sketchfab: ${asset.name}`}
                    className="sketchfab-preview-modal__frame"
                    src={embedSrc}
                    allow="autoplay; fullscreen; xr-spatial-tracking"
                    allowFullScreen
                />
            </div>
        </div>
    );
}

/** Provider page / embed viewer when there is no direct mesh URL to spin in the local preview canvas. */
function IframePreviewModal({ title, url, onClose }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    if (!url) return null;

    return (
        <div
            className="sketchfab-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="iframe-preview-title"
            onClick={onClose}
        >
            <div
                className="sketchfab-preview-modal__dialog"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sketchfab-preview-modal__header">
                    <h2 id="iframe-preview-title" className="sketchfab-preview-modal__title">{title || 'Preview'}</h2>
                    <button type="button" className="sketchfab-preview-modal__close" onClick={onClose} aria-label="Close preview">
                        ×
                    </button>
                </div>
                <iframe
                    title={title || '3D preview'}
                    className="sketchfab-preview-modal__frame"
                    src={url}
                    referrerPolicy="no-referrer-when-downgrade"
                    allow="fullscreen; autoplay"
                    allowFullScreen
                />
            </div>
        </div>
    );
}

/** 3D model row: preview (Sketchfab / GLB / STL / iframe) + add / open site. */
function ModelCatalogCard({ asset, onAddToScene, onAddToFloorPlan, onAddToLibrary, onOpenSite, onOpenPreview, isDownloading }) {
    const sketchfabUid = asset.source === 'sketchfab' && asset.sourceAssetId ? String(asset.sourceAssetId) : '';
    const fmt = (asset.format || '').toLowerCase();
    const canCanvasPreview = Boolean(
        asset.modelUrl
        && asset.source !== 'blenderkit'
        && (/\.(glb|gltf|stl)($|\?)/i.test(asset.modelUrl) || ['glb', 'gltf', 'stl'].includes(fmt))
    );
    const canIframePreview = Boolean(asset.viewerUrl);
    const showPreviewButton = Boolean(sketchfabUid || canCanvasPreview || canIframePreview);
    const canTryAdd = asset.loadableInScene || asset.modelUrl || asset.source === 'sketchfab'
        || (asset.source === 'blenderkit' && asset.sourceAssetId);
    const addLabel = asset.source === 'sketchfab'
        ? (asset.loadableInScene ? 'Add to Scene' : 'Try Add')
        : asset.source === 'blenderkit'
            ? (asset.loadableInScene ? 'Add to Scene' : 'Try Add')
            : (asset.loadableInScene || asset.modelUrl ? 'Add to Scene' : undefined);
    const siteLabel = asset.accessTier === 'requires_purchase'
        || (asset.source === 'sketchfab' && !asset.loadableInScene)
        ? 'Open on site'
        : 'View';

    return (
        <div
            className="asset-card model-catalog-card"
            title={asset.name}
            style={{
                opacity: (asset.modelUrl || asset.source === 'sketchfab' || (asset.source === 'blenderkit' && asset.sourceAssetId)) ? 1 : 0.65,
                cursor: 'default',
            }}
        >
            {isDownloading && (
                <div className="loading-overlay">
                    <div style={{ textAlign: 'center' }}>
                        <div className="loading-spinner" />
                        <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>Loading...</div>
                    </div>
                </div>
            )}
            <div className="asset-thumb asset-thumb--model-preview">
                {asset.thumbnailUrl || asset.thumb ? (
                    <img src={asset.thumbnailUrl || asset.thumb} alt={asset.name} loading="lazy" />
                ) : (
                    <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 11 }}>
                        {asset.sourceLabel || 'Asset'}
                    </div>
                )}
                {asset.sourceLabel && <SourceBadge label={asset.sourceLabel} />}
            </div>
            <div className="asset-name">{asset.name}</div>
            <div className="asset-badge-row">
                {asset.license && (
                    <span className="asset-badge" style={{ background: '#e2e8f0', color: '#334155' }}>
                        {asset.license}
                    </span>
                )}
                {asset.accessLabel && (
                    <span className="asset-badge" style={{
                        background: asset.accessTier === 'free_download'
                            ? '#dcfce7'
                            : asset.accessTier === 'licensed'
                                ? '#e0e7ff'
                                : asset.accessTier === 'requires_purchase'
                                    ? '#fee2e2'
                                    : '#fef3c7',
                        color: asset.accessTier === 'free_download'
                            ? '#166534'
                            : asset.accessTier === 'licensed'
                                ? '#3730a3'
                                : asset.accessTier === 'requires_purchase'
                                    ? '#991b1b'
                                    : '#92400e'
                    }}>
                        {asset.accessLabel}
                    </span>
                )}
                {asset.loadableInScene && (
                    <span className="asset-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                        Loadable
                    </span>
                )}
                {!asset.loadableInScene && asset.assetType === 'model' && (
                    <span className="asset-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                        {asset.source === 'sketchfab' ? 'Access Required' : 'View Only'}
                    </span>
                )}
            </div>
            <div className="asset-btn-row asset-btn-row--model">
                {showPreviewButton && (
                    <button
                        type="button"
                        className="asset-btn asset-btn-secondary asset-btn--preview"
                        onClick={() => onOpenPreview(asset)}
                    >
                        3D preview
                    </button>
                )}
                {canTryAdd && addLabel && (
                    <button
                        type="button"
                        className="asset-btn asset-btn-primary asset-btn--add-scene"
                        onClick={() => onAddToScene(asset)}
                        disabled={isDownloading}
                        style={isDownloading ? { cursor: 'wait' } : undefined}
                    >
                        {isDownloading ? 'Loading...' : addLabel}
                    </button>
                )}
                {onAddToFloorPlan && canTryAdd && addLabel && (
                    <button
                        type="button"
                        className="asset-btn asset-btn-secondary asset-btn--plan"
                        onClick={() => onAddToFloorPlan(asset)}
                        disabled={isDownloading}
                        title="Add to the 2D floor plan (does not add to the 3D scene)"
                    >
                        + Plan
                    </button>
                )}
                {onAddToLibrary && canTryAdd && (
                    <button
                        type="button"
                        className="asset-btn asset-btn-secondary asset-btn--library"
                        onClick={() => onAddToLibrary(asset)}
                        disabled={isDownloading}
                        title="Save to My library (global bank)"
                    >
                        Library
                    </button>
                )}
                {(asset.viewerUrl || sketchfabUid || (asset.source === 'blenderkit' && asset.sourceAssetId)) && (
                    <button
                        type="button"
                        className="asset-btn asset-btn-secondary asset-btn--site"
                        onClick={() => onOpenSite(asset)}
                    >
                        {siteLabel}
                    </button>
                )}
            </div>
        </div>
    );
}

function FilterChips({ filters, active, onChange }) {
    return (
        <div className="filter-chips">
            {filters.map(f => (
                <button
                    key={f.id}
                    className={`filter-chip ${active === f.id ? 'active' : ''}`}
                    onClick={() => onChange(f.id)}
                >
                    {f.label}
                </button>
            ))}
        </div>
    );
}

function LoadingState({ text = 'Loading...' }) {
    return <div className="status-text loading">{text}</div>;
}

function ErrorState({ message }) {
    return <div className="status-text error">{message}</div>;
}

function EmptyState({ text }) {
    return <div className="status-text empty">{text}</div>;
}

const CATALOG_PAGE_SIZE = 80;
/** Max extra pages to prefetch when a source filter matches nothing in loaded rows yet. */
const MAX_SOURCE_FILTER_CHASE = 50;

/** Smithsonian / Europeana entries are metadata + viewer URLs only (no direct GLB in our index). */
const VIEWER_ONLY_MODEL_SOURCES = new Set(['smithsonian', 'europeana']);

function bkFilesArray(item) {
    const v = item?.files;
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
}

function pickBkThumb(files = []) {
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

function pickBkModelFile(files = []) {
    const list = Array.isArray(files) ? files : [];
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

function pickBkHdriFile(files = []) {
    return files.find((f) => /hdr|hdri/i.test(String(f.fileType || '')) || /\.hdr($|\?)/i.test(String(f.filename || ''))) || null;
}

function toBkAbsUrl(webPathOrUrl) {
    const u = webPathOrUrl;
    if (!u) return null;
    const s = String(u);
    if (/^https?:\/\//i.test(s)) return s;
    const path = s.startsWith('/') ? s : `/${s}`;
    return `https://www.blenderkit.com${path}`;
}

/** Map raw BlenderKit `/search` row → catalog row (backend returns unnormalized JSON). */
function normalizeBlenderKitSearchItem(item, assetType) {
    const files = bkFilesArray(item);
    const sourceAssetId = item?.id != null ? String(item.id) : (item?.assetBaseId != null ? String(item.assetBaseId) : null);
    if (!sourceAssetId) return null;
    const viewerUrl = toBkAbsUrl(item?.webPath || item?.url);
    const thumb = pickBkThumb(files);

    if (assetType === 'material') {
        return {
            assetType: 'material',
            source: 'blenderkit',
            sourceLabel: 'BlenderKit',
            sourceAssetId,
            name: item?.name || 'Untitled',
            thumbnailUrl: thumb,
            viewerUrl,
            materialMaps: null,
            loadableInScene: false,
            license: item?.license || null,
            accessTier: item?.isFree ? 'free_download' : undefined,
            accessLabel: item?.isFree ? 'Free' : undefined,
        };
    }

    if (assetType === 'hdr') {
        const hdri = pickBkHdriFile(files);
        const canDl = Boolean(item?.canDownload && hdri?.downloadUrl);
        return {
            assetType: 'hdri',
            source: 'blenderkit',
            sourceLabel: 'BlenderKit',
            sourceAssetId,
            name: item?.name || 'Untitled HDRI',
            thumbnailUrl: thumb,
            viewerUrl,
            hdriUrl: hdri?.downloadUrl || null,
            loadableInScene: canDl,
            license: item?.license || null,
        };
    }

    const modelFile = pickBkModelFile(files);
    const meshUrl = modelFile?.downloadUrl || modelFile?.url;
    const hasMesh = Boolean(meshUrl);
    const loadableInScene = Boolean(hasMesh && (item?.canDownload || item?.isFree));
    return {
        assetType: 'model',
        source: 'blenderkit',
        sourceLabel: 'BlenderKit',
        sourceAssetId,
        name: item?.name || 'Untitled',
        thumbnailUrl: thumb,
        viewerUrl,
        modelUrl: hasMesh ? meshUrl : null,
        format: /\.gltf($|\?)/i.test(String(meshUrl || modelFile?.filename || '')) ? 'gltf' : (hasMesh ? 'glb' : null),
        loadableInScene,
        license: item?.license || null,
        accessTier: item?.isFree ? 'free_download' : undefined,
        accessLabel: item?.isFree ? 'Free' : undefined,
    };
}

/** Sentinel inside scrollable `.asset-grid-view` — loads next slice when visible. */
function InfiniteScrollSentinel({ scrollRootRef, hasMore, loading, loadingMore, onLoadMore }) {
    const elRef = useRef(null);
    useEffect(() => {
        const el = elRef.current;
        const root = scrollRootRef?.current ?? null;
        if (!el || !hasMore || loading || loadingMore) return undefined;
        const obs = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) onLoadMore();
        }, { root, rootMargin: '280px', threshold: 0 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [scrollRootRef, hasMore, loading, loadingMore, onLoadMore]);

    // If sentinel remains visible after append, observer may not fire again.
    // This keeps pagination advancing until we've filled the scroll area.
    useEffect(() => {
        if (!hasMore || loading || loadingMore) return;
        const el = elRef.current;
        if (!el) return;

        const root = scrollRootRef?.current ?? null;
        const rootRect = root
            ? root.getBoundingClientRect()
            : { top: 0, bottom: window.innerHeight };
        const sentinelRect = el.getBoundingClientRect();
        const withinLoadZone = sentinelRect.top <= rootRect.bottom + 280;
        if (withinLoadZone) onLoadMore();
    }, [scrollRootRef, hasMore, loading, loadingMore, onLoadMore]);

    if (!hasMore) return null;
    return (
        <div ref={elRef} className="infinite-scroll-sentinel" aria-live="polite">
            {loadingMore ? 'Loading more…' : 'Scroll for more'}
        </div>
    );
}

/**
 * First request pulls one page; scrolling triggers more. Server merges all providers once per query
 * (cached ~10m) and serves cheap slices — same total catalog as before, without one giant payload.
 */
function usePagedAssetSearch(searchPaged, recommendedPaged, searchQuery, deps = [], enabled = true) {
    const [assets, setAssets] = useState([]);
    const [total, setTotal] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const requestGen = useRef(0);
    const assetsLenRef = useRef(0);
    const loadingMoreRef = useRef(false);

    useEffect(() => {
        assetsLenRef.current = assets.length;
    }, [assets.length]);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            setLoadingMore(false);
            setHasMore(false);
            setError(null);
            return undefined;
        }
        let cancelled = false;
        const gen = ++requestGen.current;
        setAssets([]);
        setTotal(null);
        setHasMore(false);
        setError(null);
        setLoading(true);

        const run = async () => {
            try {
                const response = searchQuery.trim()
                    ? await searchPaged(searchQuery.trim(), { offset: 0, limit: CATALOG_PAGE_SIZE })
                    : await recommendedPaged({ offset: 0, limit: CATALOG_PAGE_SIZE });
                if (cancelled || requestGen.current !== gen) return;
                const data = response?.data;
                if (data?.success) {
                    setAssets(data.data || []);
                    setTotal(typeof data.meta?.total === 'number' ? data.meta.total : (data.data || []).length);
                    setHasMore(Boolean(data.meta?.hasMore));
                } else {
                    setAssets([]);
                    setError(data?.error || 'Unknown error');
                }
            } catch (err) {
                if (cancelled || requestGen.current !== gen) return;
                setAssets([]);
                setError(err?.response?.status === 404
                    ? 'API not available - restart server'
                    : `Failed to load: ${err.message}`
                );
            } finally {
                if (!cancelled && requestGen.current === gen) setLoading(false);
            }
        };

        run();
        return () => { cancelled = true; };
    }, [enabled, searchQuery, searchPaged, recommendedPaged, ...deps]);

    const loadMore = useCallback(async () => {
        if (!enabled) return;
        if (!hasMore || loadingMoreRef.current || loading) return;
        const gen = requestGen.current;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
            const offset = assetsLenRef.current;
            const response = searchQuery.trim()
                ? await searchPaged(searchQuery.trim(), { offset, limit: CATALOG_PAGE_SIZE })
                : await recommendedPaged({ offset, limit: CATALOG_PAGE_SIZE });
            if (requestGen.current !== gen) return;
            const data = response?.data;
            if (data?.success) {
                const batch = data.data || [];
                setAssets((prev) => [...prev, ...batch]);
                setHasMore(Boolean(data.meta?.hasMore));
            }
        } catch {
            /* keep existing rows */
        } finally {
            loadingMoreRef.current = false;
            if (requestGen.current === gen) setLoadingMore(false);
        }
    }, [enabled, hasMore, loading, searchQuery, searchPaged, recommendedPaged]);

    return { assets, total, hasMore, loading, loadingMore, error, loadMore };
}

export default function AssetBrowser({ onResize, placement = 'footer' }) {
    const [search, setSearch] = useState('');
    const [selectedCatalog, setSelectedCatalog] = useState('Models');
    const assetBrowserInitialCatalog = useStore((s) => s.assetBrowserInitialCatalog);
    const clearAssetBrowserInitialCatalog = useStore((s) => s.clearAssetBrowserInitialCatalog);

    const envPreset = useStore(s => s.envPreset);
    const setEnvPreset = useStore(s => s.setEnvPreset);
    const customHdriUrl = useStore(s => s.customHdriUrl);
    const setCustomHdriUrl = useStore(s => s.setCustomHdriUrl);
    const setEnvironmentVisible = useStore(s => s.setEnvironmentVisible);
    const environmentVisible = useStore(s => s.environmentVisible);
    const addObject = useStore(s => s.addObject);
    const updateObject = useStore(s => s.updateObject);
    const selectedId = useStore(s => s.selectedId);
    const setStudioWorkspace = useStore(s => s.setStudioWorkspace);
    const {
        globalAssetLibrary,
        projectAssetShelf,
        projectId,
        catalogBankLayout,
        setCatalogBankLayout,
        catalogThumbScale,
        setCatalogThumbScale,
        catalogDockMode,
        addToGlobalAssetLibrary,
        pinGlobalAssetToProject,
        removeGlobalLibraryEntry,
        removeProjectShelfEntry,
        placeBankEntryInScene,
        setMaterialPaintMode,
        setMaterialPaintSample,
        materialPaintMode,
    } = useStore(
        useShallow((s) => ({
            globalAssetLibrary: s.globalAssetLibrary,
            projectAssetShelf: s.projectAssetShelf,
            projectId: s.projectId,
            catalogBankLayout: s.catalogBankLayout,
            setCatalogBankLayout: s.setCatalogBankLayout,
            catalogThumbScale: s.catalogThumbScale,
            setCatalogThumbScale: s.setCatalogThumbScale,
            catalogDockMode: s.catalogDockMode,
            addToGlobalAssetLibrary: s.addToGlobalAssetLibrary,
            pinGlobalAssetToProject: s.pinGlobalAssetToProject,
            removeGlobalLibraryEntry: s.removeGlobalLibraryEntry,
            removeProjectShelfEntry: s.removeProjectShelfEntry,
            placeBankEntryInScene: s.placeBankEntryInScene,
            setMaterialPaintMode: s.setMaterialPaintMode,
            setMaterialPaintSample: s.setMaterialPaintSample,
            materialPaintMode: s.materialPaintMode,
        }))
    );
    const objects = useStore((s) => s.objects);

    const [modelSourceFilter, setModelSourceFilter] = useState('all');
    /** Default on: only models that can be added to the scene (direct URL or provider-flagged downloadable). */
    const [loadableModelsOnly, setLoadableModelsOnly] = useState(true);
    const [modelPreview, setModelPreview] = useState(null);
    const [hdriSourceFilter, setHdriSourceFilter] = useState('all');
    const [matSourceFilter, setMatSourceFilter] = useState('all');
    const [imageSourceFilter, setImageSourceFilter] = useState('all');

    const gridScrollRef = useRef(null);
    const chaseModels = useRef(0);
    const chaseHdris = useRef(0);
    const chaseMaterials = useRef(0);
    const chaseImages = useRef(0);

    const searchModelsPaged = useCallback((q, o) => assetService.searchStoreAssets(q, o), []);
    const recommendedModelsPaged = useCallback((o) => assetService.getRecommendedStoreAssets(o), []);
    const models = usePagedAssetSearch(
        searchModelsPaged,
        recommendedModelsPaged,
        search,
        [],
        selectedCatalog === 'Models'
    );

    const noviraPackModels = useMemo(
        () =>
            buildExtendedBulkCatalogRows(960).map((r) => ({
                id: r.id,
                name: r.name,
                source: 'novira_pack',
                sourceAssetId: r.id,
                modelUrl: r.url,
                loadableInScene: true,
                sourceLabel: 'Novira pack',
            })),
        []
    );

    const searchHdrisPaged = useCallback((q, o) => assetService.searchHdris(q, o), []);
    const recommendedHdrisPaged = useCallback((o) => assetService.getRecommendedHdris(o), []);
    const hdris = usePagedAssetSearch(
        searchHdrisPaged,
        recommendedHdrisPaged,
        search,
        [],
        selectedCatalog === 'HDRIs'
    );

    const searchMaterialsPaged = useCallback((q, o) => assetService.searchMaterials(q, o), []);
    const recommendedMaterialsPaged = useCallback((o) => assetService.getRecommendedMaterials(o), []);
    const materials = usePagedAssetSearch(
        searchMaterialsPaged,
        recommendedMaterialsPaged,
        search,
        [],
        selectedCatalog === 'Materials'
    );

    const [imageSearch, setImageSearch] = useState('');
    const imageSourceForApi = imageSourceFilter !== 'all' ? imageSourceFilter : undefined;
    const searchImagesPaged = useCallback(
        (q, o) => assetService.searchImages(q, { ...(o || {}), source: imageSourceForApi }),
        [imageSourceForApi]
    );
    const recommendedImagesPaged = useCallback(
        (o) => assetService.getRecommendedImages({ ...(o || {}), qidx: 0, source: imageSourceForApi }),
        [imageSourceForApi]
    );
    const images = usePagedAssetSearch(
        searchImagesPaged,
        recommendedImagesPaged,
        imageSearch,
        [],
        selectedCatalog === 'References'
    );

    const [bkAssetType, setBkAssetType] = useState('model');
    const [bkRows, setBkRows] = useState([]);
    const [bkLoading, setBkLoading] = useState(false);
    const [bkLoadingMore, setBkLoadingMore] = useState(false);
    const [bkError, setBkError] = useState(null);
    const [bkNext, setBkNext] = useState(null);
    const [bkDebouncedQuery, setBkDebouncedQuery] = useState('');
    const bkRequestGen = useRef(0);

    useEffect(() => {
        if (!assetBrowserInitialCatalog) return;
        setSelectedCatalog(assetBrowserInitialCatalog);
        setSearch('');
        setImageSearch('');
        if (assetBrowserInitialCatalog === 'BlenderKit') {
            setBkAssetType('model');
            setBkNext(null);
        }
        clearAssetBrowserInitialCatalog();
    }, [assetBrowserInitialCatalog, clearAssetBrowserInitialCatalog]);

    // ─── Handlers ───

    const handleApplyHdriPreset = (presetId) => {
        setCustomHdriUrl(null);
        setEnvPreset(presetId);
        if (!environmentVisible) setEnvironmentVisible(true);
    };

    const handleApplyQuickMaterial = useCallback(
        (mat) => {
            if (!selectedId) {
                showToast('Select an object in the 3D scene first.', 'warn');
                return;
            }
            const obj = objects.find((o) => o.id === selectedId);
            if (!obj) return;
            const t = obj.type;
            if (t !== 'primitive' && t !== 'primitive_booth') {
                showToast('Quick materials apply to primitives and booth blocks. Use online PBR rows below for catalog meshes.', 'warn');
                return;
            }
            updateObject(selectedId, {
                color: mat.color,
                roughness: mat.roughness,
                metalness: mat.metalness,
            });
            showToast(`Applied “${mat.name}” to the selection.`, 'ok');
        },
        [selectedId, objects, updateObject]
    );

    const [downloadingAssetId, setDownloadingAssetId] = useState(null);
    const [bankSection, setBankSection] = useState('global');
    const [bankActionBusyId, setBankActionBusyId] = useState(null);
    const bankFileInputRef = useRef(null);

    const handleSaveModelToLibrary = useCallback((asset) => {
        if (!asset) return;
        const src =
            asset.source === 'sketchfab'
                ? 'sketchfab'
                : asset.source === 'polyhaven'
                    ? 'polyhaven'
                    : asset.source === 'blenderkit'
                        ? 'blenderkit'
                        : asset.source || 'store';
        addToGlobalAssetLibrary({
            name: asset.name,
            source: src,
            sourceAssetId: asset.sourceAssetId || null,
            url: asset.modelUrl || null,
            originalModelUrl: asset.modelUrl || null,
            type: 'gltf',
            thumbnail: asset.thumbnailUrl || asset.thumb || null,
        });
        showToast('Saved to My library.', 'ok');
    }, [addToGlobalAssetLibrary]);

    const handleBankUploadFiles = useCallback(
        (event) => {
            const files = event.target.files;
            event.target.value = '';
            if (!files || !files.length) return;
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                const lower = f.name.toLowerCase();
                const isStl = lower.endsWith('.stl');
                const isGltf = lower.endsWith('.glb') || lower.endsWith('.gltf');
                if (!isStl && !isGltf) continue;
                const blobUrl = URL.createObjectURL(f);
                registerBlobUrl(blobUrl);
                addToGlobalAssetLibrary({
                    name: f.name.replace(/\.(glb|gltf|stl)$/i, '') || 'Upload',
                    url: blobUrl,
                    originalModelUrl: null,
                    type: isStl ? 'stl' : 'gltf',
                    source: 'upload',
                    thumbnail: null,
                });
            }
            showToast('Upload(s) added to My library.', 'ok');
        },
        [addToGlobalAssetLibrary]
    );

    const resolveBankRowModelUrl = useCallback(async (row) => {
        const trim = (s) => (typeof s === 'string' ? s.trim() : '');
        let url = trim(row?.url);
        if (url.startsWith('blob:')) {
            if (isBlobFromSession(url)) return url;
            url = '';
        }
        let orig = trim(row?.originalModelUrl);
        if (orig.startsWith('blob:')) {
            if (isBlobFromSession(orig)) return orig;
            orig = '';
        }
        if (url) return url;
        if (orig) return orig;

        const src = String(row?.source || '').toLowerCase();
        const sid = row?.sourceAssetId != null ? String(row.sourceAssetId).trim() : '';
        if (src === 'sketchfab' && sid) {
            const blobUrl = await downloadSketchfabModel(sid);
            if (blobUrl) registerBlobUrl(blobUrl);
            return blobUrl || '';
        }
        if (src === 'polyhaven' && sid) {
            try {
                const listRes = await fetchAPI(`https://api.polyhaven.com/files/${encodeURIComponent(sid)}`);
                if (!listRes || !listRes.ok) return '';
                const files = await listRes.json();
                const gs = files.blend && files.blend.gltf ? files.blend.gltf : files.gltf;
                if (!gs) return '';
                const keys = Object.keys(gs);
                const k =
                    keys.find((key) => key.includes('1k')) ||
                    keys.find((key) => key.includes('512')) ||
                    keys.find((key) => key.includes('2k')) ||
                    keys.find((key) => key.includes('4k')) ||
                    keys[0];
                const entry = k && gs[k] ? gs[k] : null;
                if (!entry) return '';
                const glbUrl = entry.glb?.url || null;
                const gltfUrl = entry.gltf?.url || null;
                if (glbUrl) {
                    const local = await downloadGenericModel(glbUrl);
                    if (local) registerBlobUrl(local);
                    return local || '';
                }
                if (gltfUrl) {
                    const local = await downloadPolyHavenModel(gltfUrl, {});
                    if (local) registerBlobUrl(local);
                    return local || '';
                }
                return '';
            } catch {
                return '';
            }
        }
        if (src === 'blenderkit' && sid) {
            const blobUrl = await downloadBlenderKitModel(sid);
            if (blobUrl) registerBlobUrl(blobUrl);
            return blobUrl || '';
        }
        return '';
    }, []);

    const handleBankAddToScene = useCallback(
        async (row) => {
            if (!row?.id) return;
            setBankActionBusyId(row.id);
            try {
                const url = await resolveBankRowModelUrl(row);
                if (!url) {
                    showToast(
                        'No mesh URL on this entry. For Sketchfab, ensure the token can download the model; otherwise re-save from the Models tab.',
                        'warn'
                    );
                    return;
                }
                placeBankEntryInScene({ ...row, url });
                showToast('Added to the 3D scene.', 'ok');
            } catch (e) {
                console.error('[Bank] add to scene', e);
                showToast(e?.message ? `Could not load model: ${e.message}` : 'Could not load model for the scene.', 'err');
            } finally {
                setBankActionBusyId(null);
            }
        },
        [placeBankEntryInScene, resolveBankRowModelUrl]
    );

    const handleBankAddToPlan = useCallback(
        async (row) => {
            if (!row?.id) return;
            setBankActionBusyId(row.id);
            try {
                const url = await resolveBankRowModelUrl(row);
                if (!url) {
                    showToast('Could not resolve a mesh URL for the floor plan.', 'warn');
                    return;
                }
                const plannerStore = ensurePlannerReduxStore(
                    typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__
                        ? window.__REDUX_DEVTOOLS_EXTENSION__()
                        : undefined
                );
                const objects = useStore.getState().objects;
                const res = addResolvedModelToFloorPlan(plannerStore, {
                    modelUrl: url,
                    name: row.name,
                    sceneObjects: objects,
                });
                if (!res.ok) {
                    if (res.error === 'no_layer') {
                        showToast('Open the Floor plan tab once so the plan initializes, then try again.', 'warn');
                    } else {
                        showToast(`Could not add to plan (${res.error || 'unknown'}).`, 'err');
                    }
                    return;
                }
                setStudioWorkspace('floorplan');
                showToast('Placed on the floor plan.', 'ok');
            } catch (e) {
                console.error('[Bank] add to plan', e);
                showToast(e?.message ? `Plan add failed: ${e.message}` : 'Plan add failed.', 'err');
            } finally {
                setBankActionBusyId(null);
            }
        },
        [resolveBankRowModelUrl, setStudioWorkspace]
    );

    const handleApplyCustomHdri = async (asset) => {
        if (asset.source === 'blenderkit' && asset.sourceAssetId) {
            setDownloadingAssetId(`hdri-${asset.sourceAssetId}`);
            try {
                const blobUrl = await downloadBlenderKitHdri(asset.sourceAssetId);
                if (blobUrl) registerBlobUrl(blobUrl);
                setCustomHdriUrl(blobUrl);
                setEnvPreset(asset.name);
                if (!environmentVisible) setEnvironmentVisible(true);
            } catch (err) {
                console.error('[HDRI] BlenderKit bridge failed:', err);
                showToast(`Failed to load HDRI: ${err.message}`, 'err');
            } finally {
                setDownloadingAssetId(null);
            }
            return;
        }
        if (!asset.hdriUrl) return;
        setDownloadingAssetId(`hdri-${asset.sourceAssetId}`);
        try {
            const blobUrl = await downloadHdriAsBlob(asset.hdriUrl);
            if (blobUrl) registerBlobUrl(blobUrl);
            setCustomHdriUrl(blobUrl);
            setEnvPreset(asset.name);
            if (!environmentVisible) setEnvironmentVisible(true);
        } catch (err) {
            console.error('[HDRI] Download failed:', err);
            showToast(`Failed to load HDRI: ${err.message}`, 'err');
        } finally {
            setDownloadingAssetId(null);
        }
    };

    const downloadCatalogAssetToObjectUrl = async (asset) => {
        if (!asset) return { ok: false, reason: 'no_asset' };
        if (asset.source !== 'sketchfab' && asset.source !== 'blenderkit' && !asset.loadableInScene) {
            if (asset.viewerUrl) window.open(asset.viewerUrl, '_blank');
            else showToast('This model cannot be loaded directly.', 'warn');
            return { ok: false, reason: 'not_loadable' };
        }

        let finalUrl = null;
        let canonicalOriginalUrl = asset.modelUrl || null;
        let isStlObject = false;

        if (asset.source === 'free3d' && asset.sourceAssetId) {
            // Keep a stable source URL for refresh/recovery; signed direct links can expire.
            canonicalOriginalUrl = `https://free3d.online/download/${encodeURIComponent(String(asset.sourceAssetId))}/glb10k`;
        }
        if (asset.source === 'blenderkit' && asset.sourceAssetId) {
            // BlenderKit API `downloadUrl` is short-lived; never persist it as the canonical URL.
            // Scene recovery re-downloads via `/asset-store/blenderkit/model/:id` using `sourceAssetId`.
            canonicalOriginalUrl = null;
        }

        if (asset.source === 'sketchfab' && asset.sourceAssetId) {
            finalUrl = await downloadSketchfabModel(asset.sourceAssetId);
        } else if (asset.source === 'free3d' && asset.sourceAssetId) {
            finalUrl = await downloadFree3DModel(asset.sourceAssetId, { lod: '10k' });
        } else if (asset.source === 'blenderkit' && asset.sourceAssetId) {
            finalUrl = await downloadBlenderKitModel(asset.sourceAssetId);
        } else if (asset.source === 'polyhaven' && asset.modelUrl) {
            finalUrl = await downloadPolyHavenModel(asset.modelUrl, asset.gltfIncludes);
        } else if (asset.modelUrl) {
            const fmtL = (asset.format || '').toLowerCase();
            isStlObject = fmtL === 'stl' || /\.stl($|\?)/i.test(asset.modelUrl);
            finalUrl = await downloadGenericModel(asset.modelUrl, { allowStl: isStlObject });
        }

        if (!finalUrl) {
            showToast('This model cannot be loaded directly. Open the source page to download it.', 'warn');
            if (asset.viewerUrl) window.open(asset.viewerUrl, '_blank');
            return { ok: false, reason: 'no_url' };
        }

        return { ok: true, finalUrl, isStlObject, canonicalOriginalUrl };
    };

    const handleAddExternalModel = async (asset) => {
        if (!asset) return;

        const assetKey = `${asset.source}-${asset.sourceAssetId}`;
        setDownloadingAssetId(assetKey);
        try {
            const resolved = await downloadCatalogAssetToObjectUrl(asset);
            if (!resolved.ok) return;

            const { finalUrl, isStlObject, canonicalOriginalUrl } = resolved;
            addObject({
                name: asset.name,
                type: isStlObject ? 'stl' : 'gltf',
                url: finalUrl,
                source: asset.source,
                originalModelUrl: canonicalOriginalUrl || null,
                sourceAssetId: asset.sourceAssetId || null,
                gltfIncludes: asset.gltfIncludes || null,
                thumbnail: asset.thumbnailUrl || asset.thumb || null,
                metadata: {
                    source: asset.source,
                    viewerUrl: asset.viewerUrl,
                    license: asset.license,
                    thumbnailUrl: asset.thumbnailUrl || asset.thumb || null,
                }
            });
        } catch (error) {
            console.error('Failed to add external model:', error);
            if (asset?.source === 'free3d') {
                const msg = String(error?.message || '');
                if (
                    /No Free3D token configured/i.test(msg)
                    || /Free3D formats failed \(401\)/i.test(msg)
                    || /Free3D direct failed \(401\)/i.test(msg)
                ) {
                    showToast('Free3D download needs auth token. Set FREE3D_AGENT_TOKEN on server or provider_free3d_token in browser storage.', 'warn');
                    return;
                }
            }
            if (asset?.source === 'sketchfab' && Number(error?.httpStatus) === 403) {
                const msg = 'This Sketchfab model is not downloadable with the current token/license. Opening the model page instead.';
                showToast(msg, 'warn');
                if (asset.viewerUrl) window.open(asset.viewerUrl, '_blank');
                const alt = findBestAlternativeModel(asset);
                if (alt) {
                    const useAlt = window.confirm(`Try a similar loadable alternative instead?\n\n${alt.name} (${alt.sourceLabel || alt.source})`);
                    if (useAlt) {
                        await handleAddExternalModel(alt);
                    }
                }
                return;
            }
            // Do not block asset placement on transient provider/download failures.
            // We place a deferred object that AutoRecoverModel can keep re-downloading in scene.
            const fmtL = (asset.format || '').toLowerCase();
            const isStlObject = fmtL === 'stl' || /\.stl($|\?)/i.test(asset.modelUrl || '');
            const fallbackRemoteUrl = asset.source === 'free3d' && asset.sourceAssetId
                ? `https://free3d.online/download/${encodeURIComponent(String(asset.sourceAssetId))}/glb10k`
                : (asset.modelUrl || null);
            addObject({
                name: asset.name,
                type: isStlObject ? 'stl' : 'gltf',
                url: fallbackRemoteUrl,
                source: asset.source,
                originalModelUrl: fallbackRemoteUrl,
                sourceAssetId: asset.sourceAssetId || null,
                gltfIncludes: asset.gltfIncludes || null,
                thumbnail: asset.thumbnailUrl || asset.thumb || null,
                metadata: {
                    source: asset.source,
                    viewerUrl: asset.viewerUrl,
                    license: asset.license,
                    thumbnailUrl: asset.thumbnailUrl || asset.thumb || null,
                    deferredLoad: true,
                    deferredReason: error?.message || 'initial_download_failed',
                }
            });
            showToast('Asset added in deferred mode. It will auto-retry loading in scene.', 'warn');
        } finally {
            setDownloadingAssetId(null);
        }
    };

    const handleAddModelToFloorPlan = async (asset) => {
        if (!asset) return;

        const plannerStore = ensurePlannerReduxStore(
            typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__
                ? window.__REDUX_DEVTOOLS_EXTENSION__()
                : undefined
        );

        const assetKey = `${asset.source}-${asset.sourceAssetId}`;
        setDownloadingAssetId(`plan-${assetKey}`);
        try {
            const resolved = await downloadCatalogAssetToObjectUrl(asset);
            if (!resolved.ok) return;

            const objects = useStore.getState().objects;
            const { finalUrl, isStlObject } = resolved;
            if (isStlObject) {
                showToast('STL on the floor plan uses a placeholder preview; GLB works best for layout.', 'warn');
            }
            const res = addResolvedModelToFloorPlan(plannerStore, {
                modelUrl: finalUrl,
                name: asset.name,
                sceneObjects: objects,
            });
            if (!res.ok) {
                if (res.error === 'no_layer') {
                    showToast('Floor plan is not ready yet. Switch to the Floor plan tab, wait for it to load, then try again.', 'warn');
                } else {
                    showToast(`Could not add to plan (${res.error || 'unknown'}).`, 'err');
                }
                return;
            }
            setStudioWorkspace('floorplan');
            showToast('Model placed on the floor plan.', 'ok');
        } catch (error) {
            console.error('Failed to add model to floor plan:', error);
            if (asset?.source === 'sketchfab' && Number(error?.httpStatus) === 403) {
                showToast('This Sketchfab model is not downloadable with the current token/license.', 'warn');
                if (asset.viewerUrl) window.open(asset.viewerUrl, '_blank');
                return;
            }
            // Fallback: try the remote URL directly so floor plan flow is not hard-blocked.
            try {
                if (!asset.modelUrl) throw new Error('No remote model URL for fallback');
                const objects = useStore.getState().objects;
                const res = addResolvedModelToFloorPlan(plannerStore, {
                    modelUrl: asset.modelUrl,
                    name: asset.name,
                    sceneObjects: objects,
                });
                if (res.ok) {
                    setStudioWorkspace('floorplan');
                    showToast('Placed using fallback URL; model may finalize after retries.', 'warn');
                    return;
                }
            } catch (_) {
                // fall through to error toast
            }
            showToast(`Unable to load model for the plan: ${error.message}`, 'err');
        } finally {
            setDownloadingAssetId(null);
        }
    };

    const handleApplySimpleMaterial = (mat) => {
        if (!selectedId) return;
        updateObject(selectedId, { color: mat.color, roughness: mat.roughness, metalness: mat.metalness });
    };

    const handleApplyPBRMaterial = (asset) => {
        if (!selectedId) {
            showToast('Select an object first to apply a material.', 'warn');
            return;
        }
        const maps = asset.materialMaps;
        if (!maps || !Object.values(maps).some(Boolean)) return;
        updateObject(selectedId, {
            materialMaps: maps,
            materialSource: asset.sourceLabel
        });
    };

    // ─── Filtered lists ───

    /** Smithsonian / Europeana index has no direct mesh URLs — "loadable only" would hide every row. */
    const catalogViewerOnlySource = VIEWER_ONLY_MODEL_SOURCES.has(modelSourceFilter);
    const effectiveLoadableModelsOnly = loadableModelsOnly && !catalogViewerOnlySource;

    const filteredModels = useMemo(() => {
        if (modelSourceFilter === 'novira_pack') {
            let items = noviraPackModels;
            if (search.trim()) {
                const q = search.toLowerCase();
                items = items.filter((a) => String(a.name || '').toLowerCase().includes(q));
            }
            return items;
        }
        let items = models.assets;
        if (effectiveLoadableModelsOnly) {
            items = items.filter((a) => Boolean(
                a.loadableInScene || a.modelUrl
                // Without POLYPIZZA_AUTH_TOKEN the server uses public search (no GLB URL). Still show rows so the grid is usable; cards stay “View only” until a token adds Download URLs.
                || (a.source === 'polypizza' && a.viewerUrl && !a.loadableInScene && !a.modelUrl)
            ));
        }
        if (modelSourceFilter !== 'all') items = items.filter(a => a.source === modelSourceFilter);
        return items;
    }, [models.assets, modelSourceFilter, effectiveLoadableModelsOnly, noviraPackModels, search]);


    const closeModelPreview = useCallback(() => setModelPreview(null), []);

    const openModelPreview = useCallback(async (asset) => {
        if (!asset) return;
        if (asset.source === 'blenderkit') {
            if (asset.viewerUrl) {
                setModelPreview({ kind: 'iframe', url: asset.viewerUrl, title: asset.name });
            }
            return;
        }
        if (asset.source === 'sketchfab' && asset.sourceAssetId) {
            setModelPreview({ kind: 'sketchfab', asset });
            return;
        }
        const mu = asset.modelUrl || '';
        const fmtLower = (asset.format || '').toLowerCase();
        const meshByUrl = /\.(glb|gltf|stl)($|\?)/i.test(mu);
        const meshByFmt = ['glb', 'gltf', 'stl'].includes(fmtLower);
        if (mu && (meshByUrl || meshByFmt)) {
            setModelPreview({
                kind: 'mesh',
                modelUrl: mu,
                format: fmtLower || null,
                title: asset.name,
            });
            return;
        }
        if (asset.viewerUrl) {
            setModelPreview({ kind: 'iframe', url: asset.viewerUrl, title: asset.name });
            return;
        }
        try {
            const resolved = await resolveBankRowModelUrl(asset);
            if (resolved) {
                setModelPreview({
                    kind: 'mesh',
                    modelUrl: resolved,
                    format: (asset.format || '').toLowerCase() || null,
                    title: asset.name,
                });
            }
        } catch {
            // handled by add-to-scene flow; keep preview silent
        }
    }, [resolveBankRowModelUrl]);

    const findBestAlternativeModel = useCallback((restrictedAsset) => {
        if (!restrictedAsset) return null;
        const baseTokens = String(restrictedAsset.name || '')
            .toLowerCase()
            .split(/\s+/)
            .filter(t => t.length >= 3);
        const candidates = models.assets.filter(a =>
            a.source !== restrictedAsset.source
            && (a.loadableInScene || a.modelUrl)
        );
        if (!candidates.length) return null;
        const scored = candidates.map((a) => {
            const bag = `${a.name || ''} ${(a.tags || []).join(' ')}`.toLowerCase();
            const overlap = baseTokens.filter(t => bag.includes(t)).length;
            return { a, overlap };
        }).sort((x, y) => y.overlap - x.overlap);
        return scored[0]?.a || null;
    }, [models.assets]);

    const filteredHdris = useMemo(() => {
        let items = hdris.assets;
        if (hdriSourceFilter !== 'all') items = items.filter(a => a.source === hdriSourceFilter);
        return items;
    }, [hdris.assets, hdriSourceFilter]);

    const filteredMaterials = useMemo(() => {
        let items = materials.assets;
        if (matSourceFilter !== 'all') items = items.filter(a => a.source === matSourceFilter);
        return items;
    }, [materials.assets, matSourceFilter]);

    const filteredImages = useMemo(() => {
        let items = images.assets;
        if (imageSourceFilter !== 'all') items = items.filter(a => a.source === imageSourceFilter);
        return items;
    }, [images.assets, imageSourceFilter]);

    const filteredDreiPresets = useMemo(() => {
        if (!search) return DREI_PRESETS;
        const q = search.toLowerCase();
        return DREI_PRESETS.filter(h => h.name.toLowerCase().includes(q));
    }, [search]);

    const tabs = [
        { id: 'Models', label: 'Models', icon: CubeIcon },
        { id: 'BlenderKit', label: 'BlenderKit', icon: SparklesIcon },
        { id: 'Bank', label: 'My library', icon: ArchiveBoxIcon },
        { id: 'HDRIs', label: 'HDRIs', icon: SunIcon },
        { id: 'Materials', label: 'Materials', icon: SwatchIcon },
        { id: 'References', label: 'References', icon: PhotoIcon },
    ];

    const modelSourceFilters = [
        { id: 'all', label: 'All Sources' },
        { id: 'novira_pack', label: 'Novira pack (5000+)' },
        { id: 'sketchfab', label: 'Sketchfab' },
        { id: 'polyhaven', label: 'Poly Haven' },
        { id: 'polypizza', label: 'Poly Pizza' },
        { id: 'opensource3d', label: 'Open Source 3D' },
        { id: 'khronos', label: 'Khronos Samples' },
        { id: 'smithsonian', label: 'Smithsonian' },
        { id: 'europeana', label: 'Europeana' },
        { id: 'nasa3d', label: 'NASA 3D' },
        { id: 'thingiverse', label: 'Thingiverse' },
        { id: 'myminifactory', label: 'MyMiniFactory' },
        { id: 'free3d', label: 'Free3D Online' },
        { id: 'blenderkit', label: 'BlenderKit' },
    ];
    const providerTickerFilters = useMemo(
        () => modelSourceFilters.filter((f) => f.id !== 'all'),
        [modelSourceFilters]
    );

    const hdriSourceFilters = [
        { id: 'all', label: 'All' },
        { id: 'polyhaven', label: 'Poly Haven' },
        { id: 'ambientcg', label: 'ambientCG' },
    ];

    const matSourceFilters = [
        { id: 'all', label: 'All' },
        { id: 'polyhaven', label: 'Poly Haven' },
        { id: 'ambientcg', label: 'ambientCG' },
    ];

    const imageSourceFilters = [
        { id: 'all', label: 'All' },
        { id: 'pixabay', label: 'Pixabay' },
        { id: 'pexels', label: 'Pexels' },
        { id: 'openverse', label: 'Openverse' },
        { id: 'unsplash', label: 'Unsplash' },
        { id: 'pinterest', label: 'Pinterest' },
    ];

    useEffect(() => { chaseModels.current = 0; }, [search, modelSourceFilter, loadableModelsOnly]);

    useEffect(() => { chaseHdris.current = 0; }, [search, hdriSourceFilter]);
    useEffect(() => { chaseMaterials.current = 0; }, [search, matSourceFilter]);
    useEffect(() => { chaseImages.current = 0; }, [imageSearch, imageSourceFilter]);

    useEffect(() => {
        if (modelSourceFilter === 'novira_pack') return;
        if (selectedCatalog !== 'Models' || modelSourceFilter === 'all') return;
        if (!models.hasMore || models.loading || models.loadingMore) return;
        if (filteredModels.length > 0) {
            chaseModels.current = 0;
            return;
        }
        if (chaseModels.current >= MAX_SOURCE_FILTER_CHASE) return;
        chaseModels.current += 1;
        models.loadMore();
    }, [selectedCatalog, modelSourceFilter, effectiveLoadableModelsOnly, models.hasMore, models.loading, models.loadingMore, models.loadMore, filteredModels.length, models.assets.length]);

    useEffect(() => {
        if (selectedCatalog !== 'HDRIs' || hdriSourceFilter === 'all') return;
        if (!hdris.hasMore || hdris.loading || hdris.loadingMore) return;
        if (filteredHdris.length > 0) {
            chaseHdris.current = 0;
            return;
        }
        if (chaseHdris.current >= MAX_SOURCE_FILTER_CHASE) return;
        chaseHdris.current += 1;
        hdris.loadMore();
    }, [selectedCatalog, hdriSourceFilter, hdris.hasMore, hdris.loading, hdris.loadingMore, hdris.loadMore, filteredHdris.length, hdris.assets.length]);

    useEffect(() => {
        if (selectedCatalog !== 'Materials' || matSourceFilter === 'all') return;
        if (!materials.hasMore || materials.loading || materials.loadingMore) return;
        if (filteredMaterials.length > 0) {
            chaseMaterials.current = 0;
            return;
        }
        if (chaseMaterials.current >= MAX_SOURCE_FILTER_CHASE) return;
        chaseMaterials.current += 1;
        materials.loadMore();
    }, [selectedCatalog, matSourceFilter, materials.hasMore, materials.loading, materials.loadingMore, materials.loadMore, filteredMaterials.length, materials.assets.length]);

    useEffect(() => {
        if (selectedCatalog !== 'References') return;
        if (imageSourceFilter === 'all') return;
        // Don't chase if already loading.
        if (images.loading || images.loadingMore) return;
        // If filtered list is non-empty, we have results — stop chasing.
        if (filteredImages.length > 0) {
            chaseImages.current = 0;
            return;
        }
        // Filtered list is empty. If there are no more pages to load, give up.
        if (!images.hasMore) return;
        // Cap chase to avoid infinite loops.
        if (chaseImages.current >= MAX_SOURCE_FILTER_CHASE) return;
        chaseImages.current += 1;
        images.loadMore();
    }, [selectedCatalog, imageSearch, imageSourceFilter, images.hasMore, images.loading, images.loadingMore, images.loadMore, filteredImages.length, images.assets.length]);

    useEffect(() => {
        if (selectedCatalog !== 'BlenderKit') return undefined;
        const t = setTimeout(() => setBkDebouncedQuery(search.trim()), 400);
        return () => clearTimeout(t);
    }, [search, selectedCatalog]);

    useEffect(() => {
        if (selectedCatalog !== 'BlenderKit') return undefined;
        let cancelled = false;
        const gen = ++bkRequestGen.current;
        setBkLoading(true);
        setBkError(null);
        setBkRows([]);
        setBkNext(null);

        const apiType = bkAssetType === 'hdr' ? 'hdr' : bkAssetType;

        (async () => {
            try {
                const res = await assetService.searchBlenderKit(bkDebouncedQuery, {
                    assetType: apiType,
                    limit: 36,
                });
                if (cancelled || bkRequestGen.current !== gen) return;
                const body = res?.data;
                if (!body?.success) {
                    setBkError(body?.error || 'BlenderKit search failed');
                    setBkRows([]);
                    return;
                }
                const raw = body.data || [];
                const mapType = bkAssetType === 'material' ? 'material' : bkAssetType === 'hdr' ? 'hdr' : 'model';
                const mapped = raw.map((r) => normalizeBlenderKitSearchItem(r, mapType)).filter(Boolean);
                setBkRows(mapped);
                setBkNext(body.meta?.next || null);
            } catch (e) {
                if (!cancelled && bkRequestGen.current === gen) {
                    setBkError(
                        e?.response?.data?.error
                        || e?.response?.data?.detail
                        || e?.message
                        || 'Failed to load BlenderKit',
                    );
                    setBkRows([]);
                }
            } finally {
                if (!cancelled && bkRequestGen.current === gen) setBkLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [selectedCatalog, bkDebouncedQuery, bkAssetType]);

    const loadMoreBk = useCallback(async () => {
        if (!bkNext || bkLoadingMore || bkLoading) return;
        setBkLoadingMore(true);
        try {
            const res = await assetService.searchBlenderKit('', { next: bkNext });
            const body = res?.data;
            if (!body?.success) return;
            const raw = body.data || [];
            const mapType = bkAssetType === 'material' ? 'material' : bkAssetType === 'hdr' ? 'hdr' : 'model';
            const mapped = raw.map((r) => normalizeBlenderKitSearchItem(r, mapType)).filter(Boolean);
            setBkRows((prev) => {
                const seen = new Set(prev.map((x) => `${x.source}-${x.sourceAssetId}`));
                const merged = [...prev];
                for (const row of mapped) {
                    const k = `${row.source}-${row.sourceAssetId}`;
                    if (!seen.has(k)) {
                        seen.add(k);
                        merged.push(row);
                    }
                }
                return merged;
            });
            setBkNext(body.meta?.next || null);
        } catch {
            /* keep rows */
        } finally {
            setBkLoadingMore(false);
        }
    }, [bkNext, bkLoadingMore, bkLoading, bkAssetType]);

    const bankRows = bankSection === 'global' ? globalAssetLibrary : projectAssetShelf;

    const gridMinCell = Math.max(96, Math.round(124 * (catalogThumbScale || 1)));
    const gridStyle =
        selectedCatalog === 'Bank' && catalogBankLayout === 'list'
            ? undefined
            : { gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinCell}px, 1fr))` };

    const isReferencesTab = selectedCatalog === 'References';
    const isBlenderKitTab = selectedCatalog === 'BlenderKit';
    const activeSearchValue = isReferencesTab ? imageSearch : search;
    const activeSearchPlaceholder = isReferencesTab
        ? 'Search images...'
        : isBlenderKitTab
            ? 'Search BlenderKit...'
            : 'Search...';
    const handleSearchChange = (value) => {
        if (isReferencesTab) setImageSearch(value);
        else setSearch(value);
    };
    const handleClearSearch = () => handleSearchChange('');

    return (
        <div
            className={`pro-asset-browser${selectedCatalog === 'Bank' && catalogBankLayout === 'list' ? ' pro-asset-browser--bank-list' : ''}${placement === 'sidebar' ? ' pro-asset-browser--sidebar' : ''}`}
        >
            <div className="asset-top-bar">
                {onResize && catalogDockMode === 'footer' && (
                    <div
                        className="asset-resize-handle"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            if (!onResize) return;
                            const startY = e.clientY;
                            const onMove = (ev) => onResize(startY - ev.clientY);
                            const onUp = () => {
                                document.removeEventListener('mousemove', onMove);
                                document.removeEventListener('mouseup', onUp);
                                document.body.style.cursor = '';
                                document.body.style.userSelect = '';
                            };
                            document.body.style.cursor = 'row-resize';
                            document.body.style.userSelect = 'none';
                            document.addEventListener('mousemove', onMove);
                            document.addEventListener('mouseup', onUp);
                        }}
                    />
                )}

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {tabs.map(tab => (
                        <span
                            key={tab.id}
                            className="menu-item"
                            style={{
                                color: selectedCatalog === tab.id ? '#3b82f6' : undefined,
                                fontWeight: selectedCatalog === tab.id ? 600 : undefined,
                                borderBottom: selectedCatalog === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                                paddingBottom: 2,
                                display: 'flex', alignItems: 'center', gap: 4,
                            }}
                            onClick={() => {
                                setSelectedCatalog(tab.id);
                                setSearch('');
                                setImageSearch('');
                                if (tab.id === 'BlenderKit') {
                                    setBkAssetType('model');
                                    setBkNext(null);
                                }
                            }}
                        >
                            <tab.icon style={{ width: 13, height: 13 }} />
                            {tab.label}
                        </span>
                    ))}
                </div>

                <div style={{ flex: 1, minWidth: 8 }} />

                <div className="asset-top-bar__tail">
                    <MagnifyingGlassIcon className="search-input__icon" />
                    <input
                        type="text"
                        placeholder={activeSearchPlaceholder}
                        className="search-input"
                        value={activeSearchValue}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                    {activeSearchValue && (
                        <button
                            type="button"
                            className="search-input__clear"
                            aria-label="Clear search"
                            onClick={handleClearSearch}
                        >
                            <XMarkIcon />
                        </button>
                    )}
                </div>
            </div>

            <div
                className="asset-main-split"
            >
                <div ref={gridScrollRef} className="asset-grid-view" style={gridStyle}>

                    {/* ─── Asset bank (global + this project) ─── */}
                    {selectedCatalog === 'Bank' && (
                        <>
                            <div className="asset-section-label">Asset bank</div>
                            <div className="asset-bank-toolbar">
                                <div className="asset-bank-seg">
                                    <button
                                        type="button"
                                        className={bankSection === 'global' ? 'active' : ''}
                                        onClick={() => setBankSection('global')}
                                    >
                                        My library (global)
                                    </button>
                                    <button
                                        type="button"
                                        className={bankSection === 'project' ? 'active' : ''}
                                        onClick={() => setBankSection('project')}
                                    >
                                        This project
                                    </button>
                                    <input
                                        ref={bankFileInputRef}
                                        type="file"
                                        accept=".glb,.gltf,.stl,model/gltf-binary,model/gltf+json"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={handleBankUploadFiles}
                                    />
                                    <button type="button" onClick={() => bankFileInputRef.current && bankFileInputRef.current.click()}>
                                        Upload to library…
                                    </button>
                                </div>
                                <div className="asset-bank-seg asset-bank-seg--right">
                                    <button
                                        type="button"
                                        className={catalogBankLayout === 'grid' ? 'active' : ''}
                                        onClick={() => setCatalogBankLayout('grid')}
                                    >
                                        Grid
                                    </button>
                                    <button
                                        type="button"
                                        className={catalogBankLayout === 'list' ? 'active' : ''}
                                        onClick={() => setCatalogBankLayout('list')}
                                    >
                                        List
                                    </button>
                                </div>
                            </div>
                            <p className="asset-bank-hint">
                                Anything you add to the scene is logged here automatically. Use <strong>Library</strong> on a
                                store model to stash it before placing. Pin global entries onto this project when you have a
                                project open.
                            </p>
                            {bankRows.length === 0 ? (
                                <EmptyState text={bankSection === 'global' ? 'My library is empty.' : 'Nothing on this project shelf yet.'} />
                            ) : (
                                bankRows.map((row) => (
                                    <div key={row.id} className="asset-card asset-bank-card">
                                        <div className="asset-thumb">
                                            <BankLibraryThumb row={row} />
                                        </div>
                                        <div className="asset-name">{row.name}</div>
                                        <div className="asset-badge-row">
                                            <span className="asset-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                                                {row.source || 'asset'}
                                            </span>
                                            {row.fromGlobalId && (
                                                <span className="asset-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                                                    Pinned
                                                </span>
                                            )}
                                        </div>
                                        <div className="asset-btn-row">
                                            <button
                                                type="button"
                                                className="asset-btn asset-btn-primary"
                                                onClick={() => handleBankAddToScene(row)}
                                                disabled={bankActionBusyId === row.id}
                                            >
                                                {bankActionBusyId === row.id ? 'Loading…' : 'Add to scene'}
                                            </button>
                                            <button
                                                type="button"
                                                className="asset-btn asset-btn-secondary"
                                                onClick={() => handleBankAddToPlan(row)}
                                                disabled={bankActionBusyId === row.id}
                                            >
                                                + Plan
                                            </button>
                                            {bankSection === 'global' && projectId && !row.fromGlobalId && (
                                                <button
                                                    type="button"
                                                    className="asset-btn asset-btn-secondary"
                                                    onClick={() => {
                                                        pinGlobalAssetToProject(row.id);
                                                        showToast('Pinned to this project.', 'ok');
                                                    }}
                                                >
                                                    Pin to project
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="asset-btn asset-btn-secondary"
                                                onClick={() =>
                                                    bankSection === 'global'
                                                        ? removeGlobalLibraryEntry(row.id)
                                                        : removeProjectShelfEntry(row.id)
                                                }
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </>
                    )}

                    {/* ─── HDRIs Tab ─── */}
                    {selectedCatalog === 'HDRIs' && (
                        <>
                            <div className="asset-section-label">Built-in Presets</div>
                            {filteredDreiPresets.map(hdri => (
                                <AssetCard
                                    key={hdri.id}
                                    asset={hdri}
                                    onClick={() => handleApplyHdriPreset(hdri.id)}
                                    selected={!customHdriUrl && envPreset === hdri.id}
                                    activeBadge={!customHdriUrl && envPreset === hdri.id && environmentVisible}
                                />
                            ))}

                            <div className="asset-section-label" style={{ marginTop: 8 }}>
                                Online HDRIs (CC0)
                            </div>
                            <FilterChips filters={hdriSourceFilters} active={hdriSourceFilter} onChange={setHdriSourceFilter} />

                            {hdris.loading ? <LoadingState text="Loading HDRIs..." />
                                : hdris.error ? <ErrorState message={hdris.error} />
                                : filteredHdris.length === 0 ? <EmptyState text="No HDRIs found." />
                                : filteredHdris.map(asset => (
                                    <AssetCard
                                        key={`${asset.source}-${asset.sourceAssetId}`}
                                        asset={asset}
                                        onClick={() => handleApplyCustomHdri(asset)}
                                        onAction={() => handleApplyCustomHdri(asset)}
                                        actionLabel="Apply"
                                        onSecondary={asset.viewerUrl ? () => window.open(asset.viewerUrl, '_blank') : undefined}
                                        secondaryLabel="View"
                                        selected={envPreset === asset.name && environmentVisible}
                                        activeBadge={envPreset === asset.name && environmentVisible}
                                        isDownloading={downloadingAssetId === `hdri-${asset.sourceAssetId}`}
                                    />
                                ))
                            }
                            {!hdris.loading && !hdris.error && (
                                <InfiniteScrollSentinel
                                    scrollRootRef={gridScrollRef}
                                    hasMore={hdris.hasMore}
                                    loading={hdris.loading}
                                    loadingMore={hdris.loadingMore}
                                    onLoadMore={hdris.loadMore}
                                />
                            )}
                        </>
                    )}

                    {/* ─── Models Tab ─── */}
                    {selectedCatalog === 'Models' && (
                        <>
                            <div className="asset-section-label">
                                Online 3D Models
                            </div>
                            <div className="asset-provider-marquee-wrap" aria-label="Online model providers">
                                <button
                                    type="button"
                                    className={`asset-provider-pill asset-provider-pill--pinned${modelSourceFilter === 'all' ? ' asset-provider-pill--active' : ''}`}
                                    onClick={() => setModelSourceFilter('all')}
                                    aria-pressed={modelSourceFilter === 'all'}
                                    title="Show models from all sources"
                                >
                                    All Sources
                                </button>
                                <div className="asset-provider-marquee">
                                    {[...providerTickerFilters, ...providerTickerFilters].map((filter, idx) => (
                                        <button
                                            key={`${filter.id}-${idx}`}
                                            type="button"
                                            className={`asset-provider-pill${modelSourceFilter === filter.id ? ' asset-provider-pill--active' : ''}`}
                                            onClick={() => setModelSourceFilter(filter.id)}
                                            aria-pressed={modelSourceFilter === filter.id}
                                            title={`Filter source: ${filter.label}`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <p className="asset-bank-hint" style={{ marginTop: 6 }}>
                                <strong>{EXTENDED_CATALOG_META.headline}</strong> — {EXTENDED_CATALOG_META.subline}
                            </p>

                            <label
                                className="asset-loadable-filter"
                                title={catalogViewerOnlySource ? 'This source only exposes viewer pages in our catalog (no direct GLB/STL URL).' : undefined}
                            >
                                <input
                                    type="checkbox"
                                    checked={catalogViewerOnlySource ? false : loadableModelsOnly}
                                    disabled={catalogViewerOnlySource}
                                    onChange={(e) => setLoadableModelsOnly(e.target.checked)}
                                />
                                <span>Loadable models only</span>
                                {catalogViewerOnlySource && (
                                    <span style={{ marginLeft: 6, fontSize: 10, color: '#64748b', fontWeight: 500 }}>
                                        (not applicable)
                                    </span>
                                )}
                            </label>

                            {modelSourceFilter !== 'novira_pack' && models.loading ? <LoadingState text="Loading models..." />
                                : modelSourceFilter !== 'novira_pack' && models.error ? <ErrorState message={models.error} />
                                : filteredModels.length === 0 ? (
                                    <>
                                        <EmptyState
                                            text={
                                                models.assets.length > 0 && effectiveLoadableModelsOnly
                                                    ? 'No models match your filters.'
                                                    : models.assets.length > 0 && modelSourceFilter !== 'all'
                                                        ? `No rows from “${modelSourceFilters.find(f => f.id === modelSourceFilter)?.label || modelSourceFilter}” in this page. Try a search, switch to All Sources, or scroll down to load more.`
                                                    : 'No online models found.'
                                            }
                                        />
                                        {models.assets.length > 0 && effectiveLoadableModelsOnly && (
                                            <div className="status-text empty" style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, maxWidth: 320 }}>
                                                Uncheck <strong>Loadable models only</strong> to include listings that open on the provider site (no direct mesh URL in this catalog slice).
                                            </div>
                                        )}
                                        {filteredModels.length === 0 && models.assets.length === 0 && modelSourceFilter === 'smithsonian' && (
                                            <div className="status-text empty" style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, maxWidth: 320 }}>
                                                Smithsonian search needs <code style={{ fontSize: 10 }}>SMITHSONIAN_API_KEY</code> in Novira-server <code style={{ fontSize: 10 }}>.env</code> (the API returns nothing without it).
                                            </div>
                                        )}
                                        {filteredModels.length === 0 && models.assets.length === 0 && modelSourceFilter === 'polypizza' && (
                                            <div className="status-text empty" style={{ marginTop: 4, fontSize: 11, lineHeight: 1.45, maxWidth: 320 }}>
                                                If the list stays empty, set <code style={{ fontSize: 10 }}>POLYPIZZA_AUTH_TOKEN</code> (or <code style={{ fontSize: 10 }}>POLYPIZZA_API_KEY</code>) on the asset server for the authenticated API; the public search can also return no rows for some queries.
                                            </div>
                                        )}
                                    </>
                                )
                                : filteredModels.map(asset => (
                                    <ModelCatalogCard
                                        key={
                                            asset.source === 'novira_pack'
                                                ? `${asset.source}-${asset.id}`
                                                : `${asset.source}-${asset.sourceAssetId}`
                                        }
                                        asset={asset}
                                        onAddToScene={handleAddExternalModel}
                                        onAddToFloorPlan={handleAddModelToFloorPlan}
                                        onAddToLibrary={handleSaveModelToLibrary}
                                        onOpenPreview={openModelPreview}
                                        onOpenSite={(a) => {
                                            const url = a.viewerUrl
                                                || (a.source === 'sketchfab' && a.sourceAssetId
                                                    ? `https://sketchfab.com/models/${encodeURIComponent(a.sourceAssetId)}`
                                                    : '');
                                            if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                            else if (a.source === 'blenderkit' && a.sourceAssetId) {
                                                window.open(
                                                    `https://www.blenderkit.com/asset/${encodeURIComponent(a.sourceAssetId)}`,
                                                    '_blank',
                                                    'noopener,noreferrer',
                                                );
                                            }
                                        }}
                                        isDownloading={
                                            downloadingAssetId === `${asset.source}-${asset.sourceAssetId}`
                                            || downloadingAssetId === `plan-${asset.source}-${asset.sourceAssetId}`
                                        }
                                    />
                                ))
                            }
                            {modelSourceFilter !== 'novira_pack' && !models.loading && !models.error && (
                                <InfiniteScrollSentinel
                                    scrollRootRef={gridScrollRef}
                                    hasMore={models.hasMore}
                                    loading={models.loading}
                                    loadingMore={models.loadingMore}
                                    onLoadMore={models.loadMore}
                                />
                            )}
                        </>
                    )}

                    {selectedCatalog === 'BlenderKit' && (
                        <>
                            <div className="asset-section-label">BlenderKit</div>
                            <p className="asset-bank-hint" style={{ marginTop: 0 }}>
                                Browse BlenderKit through the Novira server (uses <code style={{ fontSize: 10 }}>BLENDERKIT_API_KEY</code> when set). Models load via the download bridge; HDRIs use a server HDR bridge.
                            </p>
                            <FilterChips
                                filters={[
                                    { id: 'model', label: 'Models' },
                                    { id: 'material', label: 'Materials' },
                                    { id: 'hdr', label: 'HDRIs' },
                                ]}
                                active={bkAssetType}
                                onChange={(id) => {
                                    setBkAssetType(id);
                                    setBkNext(null);
                                }}
                            />
                            {bkAssetType === 'material' && (
                                <p className="asset-bank-hint" style={{ marginTop: 6, fontSize: 11 }}>
                                    PBR texture maps from BlenderKit are not applied in-editor yet — open on BlenderKit or use Poly Haven materials in the Materials tab.
                                </p>
                            )}
                            {bkLoading ? <LoadingState text="Loading BlenderKit..." />
                                : bkError ? <ErrorState message={bkError} />
                                : bkRows.length === 0 ? (
                                    <EmptyState
                                        text={
                                            bkDebouncedQuery
                                                ? 'No BlenderKit results for this search.'
                                                : 'No rows in this slice. Try a search, another asset type, or scroll to load more.'
                                        }
                                    />
                                )
                                : bkAssetType === 'model'
                                    ? bkRows.map((asset) => (
                                        <ModelCatalogCard
                                            key={`blenderkit-${asset.sourceAssetId}`}
                                            asset={asset}
                                            onAddToScene={handleAddExternalModel}
                                            onAddToFloorPlan={handleAddModelToFloorPlan}
                                            onAddToLibrary={handleSaveModelToLibrary}
                                            onOpenPreview={openModelPreview}
                                            onOpenSite={(a) => {
                                                const url = a.viewerUrl
                                                    || (a.sourceAssetId
                                                        ? `https://www.blenderkit.com/asset/${encodeURIComponent(a.sourceAssetId)}`
                                                        : '');
                                                if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                            }}
                                            isDownloading={
                                                downloadingAssetId === `blenderkit-${asset.sourceAssetId}`
                                                || downloadingAssetId === `plan-blenderkit-${asset.sourceAssetId}`
                                            }
                                        />
                                    ))
                                    : bkAssetType === 'hdr'
                                        ? bkRows.map((asset) => (
                                            <AssetCard
                                                key={`bk-hdri-${asset.sourceAssetId}`}
                                                asset={asset}
                                                onClick={() => handleApplyCustomHdri(asset)}
                                                onAction={() => handleApplyCustomHdri(asset)}
                                                actionLabel="Apply"
                                                onSecondary={asset.viewerUrl ? () => window.open(asset.viewerUrl, '_blank', 'noopener,noreferrer') : undefined}
                                                secondaryLabel="View"
                                                isDownloading={downloadingAssetId === `hdri-${asset.sourceAssetId}`}
                                            />
                                        ))
                                        : bkRows.map((asset) => (
                                            <AssetCard
                                                key={`bk-mat-${asset.sourceAssetId}`}
                                                asset={asset}
                                                onClick={() => {
                                                    if (asset.viewerUrl) window.open(asset.viewerUrl, '_blank', 'noopener,noreferrer');
                                                    else showToast('No view URL for this material.', 'warn');
                                                }}
                                                onAction={() => {
                                                    if (asset.viewerUrl) window.open(asset.viewerUrl, '_blank', 'noopener,noreferrer');
                                                    else showToast('No view URL for this material.', 'warn');
                                                }}
                                                actionLabel="Open"
                                            />
                                        ))
                            }
                            {!bkLoading && !bkError && (
                                <InfiniteScrollSentinel
                                    scrollRootRef={gridScrollRef}
                                    hasMore={Boolean(bkNext)}
                                    loading={bkLoading}
                                    loadingMore={bkLoadingMore}
                                    onLoadMore={loadMoreBk}
                                />
                            )}
                        </>
                    )}

                    {/* ─── Materials Tab ─── */}
                    {selectedCatalog === 'Materials' && (
                        <>
                            <div className="asset-section-label">Quick presets (local)</div>
                            <p className="asset-bank-hint" style={{ marginTop: 0 }}>
                                One-click PBR for <strong>selected primitives</strong> in the scene. For full PBR sets, use the online catalog below.
                            </p>
                            <div className="asset-quick-mat-grid">
                                {SIMPLE_MATERIALS.map((mat) => (
                                    <button
                                        key={mat.id}
                                        type="button"
                                        className="asset-quick-mat-btn"
                                        title={mat.name}
                                        onClick={() => handleApplyQuickMaterial(mat)}
                                    >
                                        <span
                                            className="asset-quick-mat-sphere"
                                            style={{
                                                background: `radial-gradient(circle at 30% 25%, #fff8, transparent 45%), linear-gradient(145deg, ${mat.color}, #0f172a)`,
                                                boxShadow: `inset 0 -6px 12px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.25)`,
                                            }}
                                        />
                                        <span className="asset-quick-mat-name">{mat.name}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="asset-section-label" style={{ marginTop: 10 }}>
                                3D scene paint (raycast){materialPaintMode ? ' — active' : ''}
                            </div>
                            <p className="asset-bank-hint" style={{ marginTop: 0 }}>
                                Pick a swatch, then click meshes in the viewport (toolbar <strong>PAINT</strong> must be on). Works on catalog objects tagged for picking.
                            </p>
                            <div className="asset-quick-mat-grid">
                                {SIMPLE_MATERIALS.map((mat) => (
                                    <button
                                        key={`paint-${mat.id}`}
                                        type="button"
                                        className="asset-quick-mat-btn"
                                        title={`Paint swatch: ${mat.name}`}
                                        onClick={() => {
                                            setMaterialPaintSample({
                                                color: mat.color,
                                                roughness: mat.roughness,
                                                metalness: mat.metalness,
                                            });
                                            setMaterialPaintMode(true);
                                            showToast(`Paint swatch “${mat.name}” — click meshes in 3D.`, 'ok');
                                        }}
                                    >
                                        <span
                                            className="asset-quick-mat-sphere"
                                            style={{
                                                background: `radial-gradient(circle at 30% 25%, #fff8, transparent 45%), linear-gradient(145deg, ${mat.color}, #0f172a)`,
                                                boxShadow: `inset 0 -6px 12px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.25)`,
                                            }}
                                        />
                                        <span className="asset-quick-mat-name">{mat.name}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="asset-section-label">
                                PBR Materials (CC0)
                            </div>
                            <FilterChips filters={matSourceFilters} active={matSourceFilter} onChange={setMatSourceFilter} />

                            {materials.loading ? <LoadingState text="Loading materials..." />
                                : materials.error ? <ErrorState message={materials.error} />
                                : filteredMaterials.length === 0 ? <EmptyState text="No PBR materials found." />
                                : filteredMaterials.map(asset => (
                                    <AssetCard
                                        key={`${asset.source}-${asset.sourceAssetId}`}
                                        asset={asset}
                                        onClick={() => handleApplyPBRMaterial(asset)}
                                        onAction={() => handleApplyPBRMaterial(asset)}
                                        actionLabel={selectedId ? 'Apply' : 'Select object'}
                                        onSecondary={asset.viewerUrl ? () => window.open(asset.viewerUrl, '_blank') : undefined}
                                        secondaryLabel="View"
                                        opacity={selectedId ? 1 : 0.6}
                                    />
                                ))
                            }
                            {!materials.loading && !materials.error && (
                                <InfiniteScrollSentinel
                                    scrollRootRef={gridScrollRef}
                                    hasMore={materials.hasMore}
                                    loading={materials.loading}
                                    loadingMore={materials.loadingMore}
                                    onLoadMore={materials.loadMore}
                                />
                            )}
                            <div className="asset-section-label" style={{ marginTop: 8 }}>Quick Presets</div>
                            {SIMPLE_MATERIALS.map(mat => (
                                <div
                                    key={mat.id}
                                    className="asset-card"
                                    onClick={() => handleApplySimpleMaterial(mat)}
                                    title={selectedId ? `Apply ${mat.name}` : 'Select an object first'}
                                    style={{ opacity: selectedId ? 1 : 0.5 }}
                                >
                                    <div className="asset-thumb" style={{ background: '#f8fafc' }}>
                                        <span style={{
                                            width: 48, height: 48, borderRadius: '50%',
                                            background: mat.color,
                                            border: '2px solid #e2e8f0',
                                            boxShadow: mat.metalness > 0.5
                                                ? `inset 0 -6px 12px rgba(0,0,0,0.3), 0 0 8px ${mat.color}40`
                                                : 'inset 0 -6px 12px rgba(0,0,0,0.15)',
                                            display: 'block',
                                        }} />
                                    </div>
                                    <div className="asset-name">{mat.name}</div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* ─── References Tab ─── */}
                    {selectedCatalog === 'References' && (() => {
                        return (
                            <>
                                <div className="asset-section-label">
                                    Reference Images
                                </div>

                                <FilterChips filters={imageSourceFilters} active={imageSourceFilter} onChange={(f) => { setImageSourceFilter(f); chaseImages.current = 0; }} />

                                {images.loading ? (
                                    <LoadingState text="Searching images..." />
                                ) : images.error ? (
                                    <ErrorState message={images.error} />
                                ) : filteredImages.length === 0 ? (
                                    <EmptyState text={
                                        imageSourceFilter === 'pinterest' && images.assets.length > 0 && images.hasMore
                                            ? 'Loading Pinterest results — scroll down or wait a moment…'
                                            : imageSourceFilter === 'pinterest' && images.assets.length > 0 && !images.hasMore
                                                ? 'No Pinterest results in this page. Try searching for "exhibition booth", "conference stage", or "experiential marketing".'
                                                : imageSearch.trim()
                                                    ? 'No images found for this query. Try a broader term like "exhibition" or "event design".'
                                                    : 'No default inspiration images available right now. Try searching for "exhibition booth", "conference stage", or "experiential marketing".'
                                    } />
                                ) : (
                                    <>
                                        {filteredImages.map(asset => (
                                            <div
                                                key={`${asset.source}-${asset.sourceAssetId}`}
                                                className="asset-card"
                                                onClick={() => window.open(asset.imageUrl || asset.viewerUrl, '_blank')}
                                                title={asset.name}
                                            >
                                                <div className="asset-thumb">
                                                    <img src={asset.thumbnailUrl} alt={asset.name} loading="lazy" />
                                                    <SourceBadge label={asset.sourceLabel} />
                                                </div>
                                                <div className="asset-name">{asset.name}</div>
                                                <div className="asset-badge-row">
                                                    <span className="asset-badge" style={{ background: '#e2e8f0', color: '#334155' }}>
                                                        {asset.license}
                                                    </span>
                                                    {asset.imageWidth && (
                                                        <span className="asset-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                                                            {asset.imageWidth}x{asset.imageHeight}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="asset-btn-row">
                                                    <button
                                                        className="asset-btn asset-btn-primary"
                                                        onClick={(e) => { e.stopPropagation(); window.open(asset.imageUrl, '_blank'); }}
                                                    >
                                                        Open Full
                                                    </button>
                                                    {(asset.imageUrl || asset.thumbnailUrl) && (
                                                        <button
                                                            type="button"
                                                            className="asset-btn asset-btn-secondary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const full = (asset.imageUrl && String(asset.imageUrl).trim()) || '';
                                                                const thumb = (asset.thumbnailUrl && String(asset.thumbnailUrl).trim()) || '';
                                                                if (!full && !thumb) {
                                                                    showToast('No downloadable image URL for this row.', 'warn');
                                                                    return;
                                                                }
                                                                useStore.getState().openLayoutWithAiFromReference({
                                                                    imageUrl: full || thumb,
                                                                    previewUrl: thumb || full,
                                                                    name: asset.name,
                                                                });
                                                            }}
                                                        >
                                                            Use for 3D
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {!images.loading && !images.error && (
                                            <InfiniteScrollSentinel
                                                scrollRootRef={gridScrollRef}
                                                hasMore={images.hasMore}
                                                loading={images.loading}
                                                loadingMore={images.loadingMore}
                                                onLoadMore={images.loadMore}
                                            />
                                        )}
                                    </>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
            {modelPreview?.kind === 'sketchfab' && (
                <SketchfabPreviewModal asset={modelPreview.asset} onClose={closeModelPreview} />
            )}
            {modelPreview?.kind === 'iframe' && (
                <IframePreviewModal title={modelPreview.title} url={modelPreview.url} onClose={closeModelPreview} />
            )}
            {modelPreview?.kind === 'mesh' && (
                <ModelPreviewModal
                    title={modelPreview.title}
                    modelUrl={modelPreview.modelUrl}
                    format={modelPreview.format}
                    onClose={closeModelPreview}
                />
            )}
        </div>
    );
}
