import React, { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import JSZip from 'jszip';
import { registerBlobUrl } from '../../utils/blobRegistry';
import { showToast } from '../../utils/noviraToast';
import { ensurePlannerReduxStore } from '../../utils/plannerReduxBridge';
import { addResolvedModelToFloorPlan } from '../../utils/plannerAddFromLibrary';

function plannerReduxStore() {
    return ensurePlannerReduxStore(
        typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__
            ? window.__REDUX_DEVTOOLS_EXTENSION__()
            : undefined
    );
}

export default function LibraryBrowser({ isOpen, onClose }) {
    const { addObject, setStudioWorkspace, addToGlobalAssetLibrary } = useStore(
        useShallow((s) => ({
            addObject: s.addObject,
            setStudioWorkspace: s.setStudioWorkspace,
            addToGlobalAssetLibrary: s.addToGlobalAssetLibrary,
        }))
    );

    const stashModelToGlobalLibrary = (m) => {
        if (!m) return;
        if (m.uid.startsWith('demo_')) {
            showToast('Procedural demos cannot be stashed — use + Scene.', 'warn');
            return;
        }
        if (m.uid.startsWith('ph_')) {
            addToGlobalAssetLibrary({
                name: m.name,
                source: 'polyhaven',
                sourceAssetId: m._phId,
                url: null,
                type: 'gltf',
                thumbnail: m.thumbnails?.images?.[0]?.url || null,
            });
        } else {
            addToGlobalAssetLibrary({
                name: m.name,
                source: 'sketchfab',
                sourceAssetId: m.uid,
                url: null,
                type: 'gltf',
                thumbnail: m.thumbnails?.images?.[0]?.url || null,
            });
        }
        showToast('Saved to My library. Open Models → My library to add to scene or plan.', 'ok');
    };
    const [activeTab, setActiveTab] = useState('sf');
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [sfToken, setSfToken] = useState('');
    const [previewModel, setPreviewModel] = useState(null);

    const STABS = [
        { id: 'sf', label: 'Sketchfab' },
        { id: 'ph', label: 'Poly Haven' },
        { id: 'lib', label: 'Library' }
    ];

    const sfCategories = ['ALL', 'stage', 'booth', 'chair', 'table', 'led screen', 'truss', 'light', 'podium'];
    const phCategories = ['ALL', 'furniture', 'food', 'electronics', 'nature', 'architectural'];

    const [activeCat, setActiveCat] = useState('ALL');
    const [activeSort, setActiveSort] = useState('-likeCount');

    useEffect(() => {
        if (isOpen) {
            setResults([]);
            setSearchQuery('');
            if (activeTab === 'lib') loadDemos();
        }
    }, [isOpen, activeTab]);

    const handleSearch = async () => {
        setIsLoading(true);
        setLoadingText(`Searching ${activeTab === 'sf' ? 'Sketchfab' : 'Poly Haven'}...`);
        setResults([]);

        try {
            if (activeTab === 'sf') {
                const query = searchQuery || (activeCat !== 'ALL' ? activeCat : 'free 3D');
                const params = new URLSearchParams({ q: query, count: '24', downloadable: 'true', sort_by: activeSort, restricted: '0' });

                let res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent('https://api.sketchfab.com/v3/models?' + params)}`);
                if (!res.ok) throw new Error('CORS blocked');

                const data = await res.json();
                setResults((data.results || []).filter(m => m.isDownloadable));

            } else if (activeTab === 'ph') {
                const query = searchQuery.toLowerCase();
                let url = 'https://api.polyhaven.com/assets?type=models';
                if (activeCat !== 'ALL') url += '&categories=' + encodeURIComponent(activeCat);

                const res = await fetch(url);
                if (!res.ok) throw new Error('API error');

                const data = await res.json();
                let entries = Object.entries(data);

                if (query) {
                    entries = entries.filter(([id, info]) => id.includes(query) || (info.name || '').toLowerCase().includes(query));
                }

                setResults(entries.slice(0, 24).map(([id, info]) => ({
                    uid: 'ph_' + id,
                    _phId: id,
                    name: info.name || id,
                    user: { username: 'Poly Haven (CC0)' },
                    isDownloadable: true,
                    thumbnails: { images: [{ url: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png`, width: 300 }] },
                    license: { label: 'CC0' },
                    likeCount: info.download_count || 0
                })));
            }
        } catch (err) {
            console.error('Search error:', err);
            showToast('Search blocked or failed — loading demo models instead.', 'warn');
            loadDemos();
        }
        setIsLoading(false);
    };

    const loadDemos = () => {
        const demos = [
            { uid: 'demo_stage', name: 'Concert Stage', cat: 'stage', lc: 240 },
            { uid: 'demo_booth', name: 'Exhibition Booth', cat: 'booth', lc: 180 },
            { uid: 'demo_ledwall', name: 'LED Video Wall', cat: 'led', lc: 320 },
            { uid: 'demo_truss', name: 'Stage Truss Rig', cat: 'truss', lc: 95 },
            { uid: 'demo_chair', name: 'Banquet Chair', cat: 'chair', lc: 210 }
        ];

        setResults(demos.map(d => ({
            uid: d.uid,
            name: d.name,
            user: { username: 'Novira Demo' },
            isDownloadable: true,
            likeCount: d.lc,
            thumbnails: { images: [] },
            license: { label: 'CC-BY-4.0' },
            _demoType: d.cat
        })));
    };

    /** @returns {Promise<string|null>} blob URL for an inlined root .gltf, or null on failure */
    const extractSketchfabGltfBlobUrl = async (uid, nameForLog) => {
        try {
            if (!sfToken) return null;

            const dlr = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, {
                headers: { Authorization: 'Bearer ' + sfToken },
                mode: 'cors'
            });

            if (!dlr.ok) throw new Error('Token auth failed or model not free');

            const dld = await dlr.json();
            const zipUrl = dld.gltf && dld.gltf.url;
            if (!zipUrl) throw new Error('No zip mapping found in payload');

            setLoadingText('Downloading zip...');
            const zr = await fetch(zipUrl);
            const zb = await zr.arrayBuffer();

            setLoadingText('Extracting zip...');
            const zip = await JSZip.loadAsync(zb);

            const blobs = {};
            await Promise.all(Object.keys(zip.files).map(async fn => {
                if (!zip.files[fn].dir) {
                    const burl = URL.createObjectURL(await zip.files[fn].async('blob'));
                    registerBlobUrl(burl);
                    blobs[fn] = burl;
                }
            }));

            const gf = Object.keys(blobs).find(f => f.endsWith('.gltf'));
            if (!gf) throw new Error('No root .gltf found');

            const json = JSON.parse(await zip.files[gf].async('string'));
            const pfx = gf.includes('/') ? gf.replace(/[^/]+$/, '') : '';

            ['buffers', 'images'].forEach(k => {
                (json[k] || []).forEach(i => {
                    if (i.uri && !i.uri.startsWith('data:') && !i.uri.startsWith('blob:')) {
                        i.uri = blobs[pfx + i.uri] || blobs[i.uri] || i.uri;
                    }
                });
            });

            const gurl = URL.createObjectURL(new Blob([JSON.stringify(json)], { type: 'application/json' }));
            registerBlobUrl(gurl);
            return gurl;
        } catch (err) {
            console.error('Sketchfab extract fail:', nameForLog, err);
            return null;
        }
    };

    const downloadRealSketchfab = async (uid, name, meta) => {
        try {
            if (!sfToken) {
                showToast('Sketchfab API token required for real downloads — adding a placeholder instead.', 'warn');
                return false;
            }

            setIsLoading(true);
            setLoadingText('Requesting download...');

            const gurl = await extractSketchfabGltfBlobUrl(uid, name);
            if (!gurl) {
                setIsLoading(false);
                return false;
            }

            addObject({
                type: 'gltf',
                name: name,
                url: gurl,
                source: 'sketchfab',
                sourceAssetId: uid,
                thumbnail: meta?.thumbnails?.images?.[0]?.url || null,
                meta: meta
            });
            showToast('Added to scene; My library updated with this model.', 'ok');

            setIsLoading(false);
            onClose();
            return true;

        } catch (err) {
            console.error('Sketchfab download fail:', err);
            setIsLoading(false);
            return false;
        }
    };

    /** @returns {Promise<string|null>} */
    const fetchPolyhavenGltfUrl = async (model) => {
        const res = await fetch(`https://api.polyhaven.com/files/${model._phId}`);
        const files = await res.json();
        const gs = files.blend && files.blend.gltf ? files.blend.gltf : files.gltf;
        if (!gs) return null;
        const k = Object.keys(gs).find(k => k.includes('2k')) || Object.keys(gs).find(k => k.includes('1k')) || Object.keys(gs)[0];
        if (k && gs[k] && gs[k].gltf) return gs[k].gltf.url;
        return null;
    };

    const resolveModelUrlForFloorPlan = async (model) => {
        if (model.uid.startsWith('demo_')) {
            return { ok: false, reason: 'demo' };
        }
        if (model.uid.startsWith('ph_')) {
            try {
                const url = await fetchPolyhavenGltfUrl(model);
                if (!url) return { ok: false, reason: 'ph_no_url' };
                return { ok: true, modelUrl: url, name: model.name };
            } catch {
                return { ok: false, reason: 'ph_error' };
            }
        }
        if (!sfToken) {
            return { ok: false, reason: 'sf_token' };
        }
        setLoadingText('Requesting Sketchfab download…');
        const gurl = await extractSketchfabGltfBlobUrl(model.uid, model.name);
        if (!gurl) return { ok: false, reason: 'sf_failed' };
        return { ok: true, modelUrl: gurl, name: model.name };
    };

    const handleAddToFloorPlan = async (model) => {
        setIsLoading(true);
        setLoadingText('Preparing model for floor plan…');
        try {
            const resolved = await resolveModelUrlForFloorPlan(model);
            if (!resolved.ok) {
                if (resolved.reason === 'demo') {
                    showToast('Procedural demos only support “+ Scene”. Use Sketchfab or Poly Haven for the floor plan.', 'warn');
                } else if (resolved.reason === 'sf_token') {
                    showToast('Add your Sketchfab API token above to place Sketchfab models on the plan.', 'warn');
                } else if (resolved.reason === 'sf_failed') {
                    showToast('Could not download that Sketchfab model for the plan.', 'err');
                } else {
                    showToast('Could not resolve a GLB/GLTF URL for the floor plan.', 'err');
                }
                return;
            }

            const store = plannerReduxStore();
            const objects = useStore.getState().objects;
            const res = addResolvedModelToFloorPlan(store, {
                modelUrl: resolved.modelUrl,
                name: resolved.name,
                sceneObjects: objects,
            });
            if (!res.ok) {
                if (res.error === 'no_layer') {
                    showToast('Floor plan not ready. Switch to the Floor plan tab, wait for load, then try again.', 'warn');
                } else {
                    showToast(`Could not add to plan (${res.error || 'unknown'}).`, 'err');
                }
                return;
            }
            setStudioWorkspace('floorplan');
            showToast('Model placed on the floor plan.', 'ok');
            setPreviewModel(null);
            onClose();
        } catch (e) {
            console.error('Add to floor plan:', e);
            showToast(`Floor plan add failed: ${e.message}`, 'err');
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickLoad = async (model) => {
        if (model.uid.startsWith('demo_')) {

            addObject({
                type: 'primitive_booth',
                name: model.name,
                meta: model
            });
            onClose();
            return;
        }

        if (model.uid.startsWith('ph_')) {

            setIsLoading(true);
            setLoadingText('Fetching CC0 Model...');
            try {
                const url = await fetchPolyhavenGltfUrl(model);

                if (url) {
                    addObject({
                        type: 'gltf',
                        name: model.name,
                        url,
                        source: 'polyhaven',
                        sourceAssetId: model._phId,
                        thumbnail: model.thumbnails?.images?.[0]?.url || null,
                        meta: model
                    });
                    showToast('Added to scene; My library updated with this model.', 'ok');
                    onClose();
                } else {
                    throw new Error("No glTF URL resolved");
                }
            } catch (e) {
                console.error('PolyHaven error', e);
                showToast('Poly Haven download failed — try another asset or open polyhaven.com.', 'err');
            }
            setIsLoading(false);
            return;
        }

        const ok = await downloadRealSketchfab(model.uid, model.name, model);
        if (!ok) {

            addObject({
                type: 'primitive_booth',
                name: model.name,
                meta: model
            });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0d1117] border border-[#1e2832] rounded-xl w-[92vw] max-w-[1000px] h-[88vh] flex flex-col overflow-hidden relative">

                <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2832]">
                    <div className="text-sm font-bold tracking-widest text-[#00e5ff]">3D LIBRARY</div>
                    <div className="flex items-center gap-4">
                        <input
                            type="password"
                            className="bg-[#080b0f] border border-[#1e2832] rounded px-3 py-1 text-xs text-white outline-none w-48"
                            placeholder="Sketchfab API token..."
                            value={sfToken}
                            onChange={(e) => setSfToken(e.target.value)}
                        />
                        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
                            <XMarkIcon className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {isLoading && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
                        <div className="w-8 h-8 border-2 border-[#1e2832] border-t-[#00e5ff] rounded-full animate-spin mb-4"></div>
                        <div className="text-xs text-slate-300 font-mono tracking-wider">{loadingText}</div>
                    </div>
                )}

                <div className="flex flex-1 min-h-0">

                    <div className="w-72 border-r border-[#1e2832] flex flex-col bg-[#0d1117]">
                        <div className="flex border-b border-[#1e2832]">
                            {STABS.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`flex-1 py-3 text-[10px] font-mono tracking-widest uppercase transition-colors ${activeTab === tab.id ? 'text-[#00e5ff] bg-[#00e5ff]/5 border-b-2 border-[#00e5ff]' : 'text-slate-500 hover:text-slate-300'}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 border-b border-[#1e2832]">
                            <div className="flex gap-2 mb-4">
                                <input
                                    className="flex-1 bg-[#080b0f] border border-[#1e2832] rounded px-3 py-2 text-xs text-white outline-none focus:border-[#00e5ff]"
                                    placeholder={`Search ${activeTab}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button className="bg-[#00e5ff] text-black px-3 py-2 rounded font-bold text-xs" onClick={handleSearch}>
                                    ▶
                                </button>
                            </div>

                            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2">Category</div>
                            <div className="flex flex-wrap gap-1 mb-4">
                                {(activeTab === 'sf' ? sfCategories : phCategories).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => { setActiveCat(cat); setSearchQuery(''); }}
                                        className={`px-2 py-1 text-[9px] font-mono uppercase rounded-full border transition-colors ${activeCat === cat ? 'border-[#ff6b35] text-[#ff6b35] bg-[#ff6b35]/10' : 'border-[#1e2832] text-slate-500 hover:border-[#00e5ff] hover:text-[#00e5ff]'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 border-b border-[#1e2832] flex items-center justify-between">
                            <div className="text-[10px] font-mono text-[#00e5ff] bg-[#00e5ff]/10 px-2 py-1 rounded-full border border-[#00e5ff]/20">
                                {results.length} results
                            </div>
                            <button className="text-[9px] text-slate-400 hover:text-white" onClick={loadDemos}>
                                Load Demos
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-[#080b0f] p-4">
                        {results.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs text-center border-2 border-dashed border-[#1e2832] rounded-xl m-4">
                                <MagnifyingGlassIcon className="w-8 h-8 mb-2 opacity-50" />
                                Search a category to browse models
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {results.map((m, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-[#111820] border border-[#1e2832] rounded-lg overflow-hidden hover:border-[#00e5ff] transition-colors group"
                                        draggable="true"
                                        onDragStart={(e) => {
                                            const dragData = {
                                                type: m.uid.startsWith('demo_') ? 'primitive_booth' : (m.uid.startsWith('ph_') ? 'gltf' : 'gltf'),
                                                name: m.name,
                                                url: m.uid.startsWith('ph_') ? null : (m.uid.startsWith('demo_') ? null : m.uid),
                                                meta: m,
                                                uid: m.uid
                                            };
                                            e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                                            e.dataTransfer.effectAllowed = 'copy';
                                        }}
                                    >
                                        <div className="relative pt-[70%] bg-black cursor-pointer overflow-hidden" onClick={() => setPreviewModel(m)}>
                                            {m.thumbnails?.images?.[0] ? (
                                                <img src={m.thumbnails.images[0].url} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-2xl text-slate-800">◈</div>
                                            )}
                                            <div className="absolute top-2 right-2 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#00d68f] text-black tracking-wider">FREE</div>
                                        </div>
                                        <div className="p-2">
                                            <div className="text-xs font-bold text-slate-200 truncate">{m.name}</div>
                                            <div className="text-[9px] font-mono text-slate-500 truncate mt-1">by {m.user?.username || '?'}</div>
                                        </div>
                                        <div className="flex flex-wrap border-t border-[#1e2832] p-1.5 gap-1.5">
                                            <button type="button" className="flex-1 min-w-[56px] text-[9px] font-mono text-slate-400 border border-[#1e2832] rounded py-1 hover:text-[#00e5ff] hover:border-[#00e5ff] uppercase" onClick={() => setPreviewModel(m)}>Preview</button>
                                            <button type="button" className="flex-1 min-w-[56px] text-[9px] font-mono text-slate-400 border border-[#1e2832] rounded py-1 hover:text-[#00d68f] hover:border-[#00d68f] uppercase" onClick={() => handleQuickLoad(m)}>+ Scene</button>
                                            <button
                                                type="button"
                                                className="flex-1 min-w-[56px] text-[9px] font-mono text-slate-400 border border-[#1e2832] rounded py-1 hover:text-[#a78bfa] hover:border-[#a78bfa] uppercase"
                                                title={m.uid.startsWith('demo_') ? 'Demos are procedural — use + Scene' : 'Add to 2D floor plan'}
                                                onClick={() => handleAddToFloorPlan(m)}
                                            >
                                                + Plan
                                            </button>
                                            <button
                                                type="button"
                                                className="flex-1 min-w-[56px] text-[9px] font-mono text-slate-400 border border-[#1e2832] rounded py-1 hover:text-[#fbbf24] hover:border-[#fbbf24] uppercase"
                                                title="Stash in My library (resolve on first use)"
                                                onClick={() => stashModelToGlobalLibrary(m)}
                                            >
                                                Library
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {previewModel && (
                    <div className="absolute inset-0 bg-black/95 z-[1001] flex items-center justify-center p-8 backdrop-blur-md">
                        <div className="bg-[#0d1117] border border-[#1e2832] rounded-xl w-full max-w-4xl h-full flex flex-col shadow-2xl">
                            <div className="flex items-center justify-between p-4 border-b border-[#1e2832]">
                                <h3 className="font-bold text-white text-lg">{previewModel.name}</h3>
                                <button onClick={() => setPreviewModel(null)} className="p-1 hover:bg-slate-800 rounded"><XMarkIcon className="w-6 h-6 text-slate-400" /></button>
                            </div>
                            <div className="flex flex-1 min-h-0">
                                <div className="flex-1 bg-black relative">
                                    {!previewModel.uid.startsWith('demo_') && !previewModel.uid.startsWith('ph_') ? (
                                        <iframe src={`https://sketchfab.com/models/${previewModel.uid}/embed?autostart=1&ui_controls=1&ui_infos=0&ui_watermark=0`} className="w-full h-full border-0" allow="autoplay; fullscreen" />
                                    ) : (
                                        <div className="w-full h-full flex justify-center bg-black">
                                            {previewModel.thumbnails?.images?.[0] && <img src={previewModel.thumbnails.images[0].url} className="object-contain h-full" alt="Preview" />}
                                        </div>
                                    )}
                                </div>
                                <div className="w-64 border-l border-[#1e2832] p-4 flex flex-col gap-4">
                                    <div>
                                        <div className="text-sm font-bold text-white">{previewModel.user?.username || '?'}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-1">Author</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-center">
                                        <div className="bg-[#080b0f] border border-[#1e2832] rounded p-2">
                                            <div className="text-[#00e5ff] font-bold text-sm">{previewModel.likeCount > 1000 ? (previewModel.likeCount / 1000).toFixed(1) + 'K' : previewModel.likeCount}</div>
                                            <div className="text-[9px] font-mono text-slate-500 uppercase mt-1">Likes</div>
                                        </div>
                                    </div>
                                    <div className="mt-auto flex flex-col gap-2">
                                        <button type="button" className="w-full bg-[#00d68f] text-black font-bold text-xs py-3 rounded hover:bg-[#00e5ff] transition-colors" onClick={() => { setPreviewModel(null); handleQuickLoad(previewModel); }}>↓ LOAD TO SCENE</button>
                                        <button
                                            type="button"
                                            className="w-full bg-[#1e1b2e] border border-[#a78bfa]/40 text-[#e9d5ff] font-bold text-xs py-2.5 rounded hover:bg-[#2e2640] transition-colors"
                                            title={previewModel.uid.startsWith('demo_') ? 'Demos are procedural only' : 'Place on 2D floor plan'}
                                            onClick={() => handleAddToFloorPlan(previewModel)}
                                        >
                                            + LOAD TO FLOOR PLAN
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full bg-[#1a1508] border border-[#fbbf24]/40 text-[#fde68a] font-bold text-xs py-2.5 rounded hover:bg-[#2d2410] transition-colors"
                                            title={previewModel.uid.startsWith('demo_') ? 'Demos are procedural — use LOAD TO SCENE' : 'Stash in My library (resolve on first use)'}
                                            onClick={() => stashModelToGlobalLibrary(previewModel)}
                                        >
                                            STASH IN MY LIBRARY
                                        </button>
                                        <button type="button" className="w-full bg-transparent border border-[#1e2832] text-slate-300 text-xs py-2 rounded hover:bg-slate-800" onClick={() => setPreviewModel(null)}>Cancel</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
