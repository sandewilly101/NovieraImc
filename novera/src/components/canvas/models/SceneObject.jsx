import React, { Component, useRef, Suspense, useEffect, useLayoutEffect, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import useStore, { physicsState } from '../../../store/useStore';
import { TransformControls, useGLTF, Html } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import { KTX2Loader } from 'three-stdlib';
import { Geometry, Base, Addition, Subtraction, Intersection } from '@react-three/csg';

const _EMPTY = [];
const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
const geometryAdjacencyCache = new Map();

function getTriangleVertexIndices(geometry, faceIndex) {
    if (!geometry || !Number.isFinite(faceIndex)) return null;
    const idx = geometry.index;
    if (idx) {
        const base = faceIndex * 3;
        return [idx.getX(base), idx.getX(base + 1), idx.getX(base + 2)];
    }
    const base = faceIndex * 3;
    return [base, base + 1, base + 2];
}

function buildAdjacencyFromGeometry(geometry) {
    if (!geometry) return null;
    const key = geometry.uuid;
    if (geometryAdjacencyCache.has(key)) return geometryAdjacencyCache.get(key);
    const map = new Map();
    const indexAttr = geometry.index;
    const triCount = indexAttr ? Math.floor(indexAttr.count / 3) : Math.floor((geometry.attributes?.position?.count || 0) / 3);
    for (let f = 0; f < triCount; f += 1) {
        const tri = getTriangleVertexIndices(geometry, f);
        if (!tri) continue;
        for (const v of tri) {
            if (!map.has(v)) map.set(v, new Set());
            for (const n of tri) {
                if (n !== v) map.get(v).add(n);
            }
        }
    }
    geometryAdjacencyCache.set(key, map);
    return map;
}

function floodFillLinked(startVertex, adjacency) {
    if (!adjacency || !Number.isFinite(startVertex)) return [];
    const visited = new Set();
    const stack = [startVertex];
    while (stack.length) {
        const v = stack.pop();
        if (visited.has(v)) continue;
        visited.add(v);
        adjacency.get(v)?.forEach((n) => {
            if (!visited.has(n)) stack.push(n);
        });
    }
    return [...visited];
}

function applyMeshEditStateToGeometry(baseGeometry, meshEditState, baseColor = '#e2e8f0') {
    if (!baseGeometry) return { geometry: null, vertexColors: false };
    const edits = meshEditState || {};
    const deletedSet = new Set(Array.isArray(edits.deletedFaces) ? edits.deletedFaces : []);
    const faceColorsMap = edits.faceColors || {};
    const slots = Array.isArray(edits.materialSlots) && edits.materialSlots.length
        ? edits.materialSlots
        : [{ id: 'slot0', name: 'Material', color: baseColor || '#e2e8f0' }];
    const slotById = new Map(slots.map((s) => [s.id, s]));
    const faceSlots = edits.faceSlots || {};
    const hasFaceColors = Object.keys(faceColorsMap).length > 0;
    const extrusions = edits.extrusions || {};
    const hasExtrusions = Object.keys(extrusions).length > 0;

    const g = baseGeometry.clone();
    if (!g.attributes?.position) return { geometry: g, vertexColors: false };
    if (!g.index) {
        const n = g.attributes.position.count;
        const arr = new (n > 65535 ? Uint32Array : Uint16Array)(n);
        for (let i = 0; i < n; i += 1) arr[i] = i;
        g.setIndex(new THREE.BufferAttribute(arr, 1));
    }

    const idx = g.index.array;
    const pos = g.attributes.position.array.slice();
    const faceCount = Math.floor(idx.length / 3);

    if (hasExtrusions) {
        const va = new THREE.Vector3();
        const vb = new THREE.Vector3();
        const vc = new THREE.Vector3();
        const nrm = new THREE.Vector3();
        for (const [k, dRaw] of Object.entries(extrusions)) {
            const fi = Number(k);
            const d = Number(dRaw);
            if (!Number.isFinite(fi) || !Number.isFinite(d) || d === 0) continue;
            if (fi < 0 || fi >= faceCount) continue;
            const ia = idx[fi * 3];
            const ib = idx[fi * 3 + 1];
            const ic = idx[fi * 3 + 2];
            va.set(pos[ia * 3], pos[ia * 3 + 1], pos[ia * 3 + 2]);
            vb.set(pos[ib * 3], pos[ib * 3 + 1], pos[ib * 3 + 2]);
            vc.set(pos[ic * 3], pos[ic * 3 + 1], pos[ic * 3 + 2]);
            nrm.copy(vb).sub(va).cross(vc.clone().sub(va)).normalize();
            for (const vi of [ia, ib, ic]) {
                pos[vi * 3] += nrm.x * d;
                pos[vi * 3 + 1] += nrm.y * d;
                pos[vi * 3 + 2] += nrm.z * d;
            }
        }
    }

    const keepFaces = [];
    for (let f = 0; f < faceCount; f += 1) {
        if (!deletedSet.has(f)) keepFaces.push(f);
    }
    const base = new THREE.Color(baseColor || '#e2e8f0');
    const outPos = new Float32Array(keepFaces.length * 9);
    const outCol = hasFaceColors ? new Float32Array(keepFaces.length * 9) : null;

    let off = 0;
    for (let i = 0; i < keepFaces.length; i += 1) {
        const fi = keepFaces[i];
        const ia = idx[fi * 3];
        const ib = idx[fi * 3 + 1];
        const ic = idx[fi * 3 + 2];
        for (const vi of [ia, ib, ic]) {
            outPos[off] = pos[vi * 3];
            outPos[off + 1] = pos[vi * 3 + 1];
            outPos[off + 2] = pos[vi * 3 + 2];
            if (outCol) {
                const slotId = faceSlots[String(fi)];
                const slotColor = slotId && slotById.get(slotId)?.color;
                const c = new THREE.Color(faceColorsMap[String(fi)] || slotColor || base);
                outCol[off] = c.r;
                outCol[off + 1] = c.g;
                outCol[off + 2] = c.b;
            }
            off += 3;
        }
    }

    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
    if (outCol) out.setAttribute('color', new THREE.BufferAttribute(outCol, 3));
    out.computeVertexNormals();
    return { geometry: out, vertexColors: !!outCol };
}

function isAncestorOf(root, node) {
    let cur = node;
    while (cur) {
        if (cur === root) return true;
        cur = cur.parent;
    }
    return false;
}

/** World-space AABB wireframe for object selection (not a React hook). */
function SelectionBoundsHelper({ root, visible, color = '#38bdf8' }) {
    const { scene } = useThree();
    const helperRef = useRef(null);

    useEffect(() => {
        if (!visible || !root) {
            if (helperRef.current) {
                scene.remove(helperRef.current);
                if (helperRef.current.geometry) helperRef.current.geometry.dispose();
                if (helperRef.current.material) helperRef.current.material.dispose();
                helperRef.current = null;
            }
            return undefined;
        }
        const h = new THREE.BoxHelper(root, new THREE.Color(color));
        h.material.depthTest = false;
        h.material.transparent = true;
        h.material.opacity = 0.95;
        scene.add(h);
        helperRef.current = h;
        return () => {
            scene.remove(h);
            if (h.geometry) h.geometry.dispose();
            if (h.material) h.material.dispose();
            helperRef.current = null;
        };
    }, [visible, root, scene, color]);

    useFrame(() => {
        if (helperRef.current && root) helperRef.current.update();
    });
    return null;
}

class ModelErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        console.error("GLTF Load Error caught in SceneObject:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <group>
                    <mesh>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial color="#ef4444" wireframe transparent opacity={0.4} />
                    </mesh>
                    <Html center>
                        <div className="bg-black/90 px-2 py-1 rounded border border-red-500 text-[9px] text-red-500 font-mono whitespace-nowrap uppercase tracking-tighter">
                            Load Error
                        </div>
                    </Html>
                </group>
            );
        }
        return this.props.children;
    }
}

import { isBlobFromSession } from '../../../utils/blobRegistry';
import {
    downloadGenericModel,
    downloadFree3DModel,
    downloadBlenderKitModel,
    downloadPolyHavenModel,
    downloadSketchfabModel,
    rewriteRemoteGltfToBlobUrl,
} from '../../../utils/sketchfabLoader';

/** Basis/KTX2 transcoder — version must match installed `three` (see package.json). */
const KTX2_TRANSCODER_BASE = `https://cdn.jsdelivr.net/npm/three@0.${THREE.REVISION}.0/examples/jsm/libs/basis/`;

const ktx2Support = { loader: null, gl: null };

function attachKtx2Loader(gltfLoader, gl) {
    if (!ktx2Support.loader || ktx2Support.gl !== gl) {
        if (ktx2Support.loader?.dispose) {
            try { ktx2Support.loader.dispose(); } catch (_) { /* noop */ }
        }
        const ktx2 = new KTX2Loader();
        ktx2.setTranscoderPath(KTX2_TRANSCODER_BASE);
        ktx2.detectSupport(gl);
        ktx2Support.loader = ktx2;
        ktx2Support.gl = gl;
    }
    gltfLoader.setKTX2Loader(ktx2Support.loader);
}

function forEachMaterial(material, fn) {
    if (!material) return;
    if (Array.isArray(material)) material.forEach(fn);
    else fn(material);
}

function disposeMaterialTextures(material) {
    if (!material) return;
    if (Array.isArray(material)) {
        material.forEach(disposeMaterialTextures);
        return;
    }
    const keys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'displacementMap', 'emissiveMap', 'lightMap', 'bumpMap'];
    keys.forEach((k) => {
        const t = material[k];
        if (t && typeof t.dispose === 'function') t.dispose();
    });
    material.dispose();
}

/** Loaded map name → Texture (not yet assigned to a material). */
function disposeLoadedTextureMap(loaded) {
    if (!loaded) return;
    Object.values(loaded).forEach((t) => {
        if (t && typeof t.dispose === 'function') t.dispose();
    });
}

function loadOnlineMaterialMapsAsync(materialMaps) {
    if (!materialMaps || !Object.values(materialMaps).some(Boolean)) {
        return Promise.resolve(null);
    }
    const entries = Object.entries(materialMaps).filter(([, u]) => typeof u === 'string' && u.length > 0);
    if (!entries.length) return Promise.resolve(null);

    const texLoader = new THREE.TextureLoader();
    texLoader.setCrossOrigin('anonymous');

    const loadOne = ([key, url]) =>
        new Promise((resolve) => {
            texLoader.load(
                url,
                (tex) => {
                    tex.flipY = false;
                    tex.wrapS = THREE.RepeatWrapping;
                    tex.wrapT = THREE.RepeatWrapping;
                    if (key === 'diffuse') tex.colorSpace = THREE.SRGBColorSpace;
                    else tex.colorSpace = THREE.NoColorSpace;
                    resolve([key, tex]);
                },
                undefined,
                () => resolve([key, null])
            );
        });

    return Promise.all(entries.map(loadOne)).then((pairs) => {
        const loaded = Object.fromEntries(pairs.filter(([, t]) => t));
        return Object.keys(loaded).length ? loaded : null;
    });
}

/** `MeshStandardMaterial` rejects explicit `map: undefined` etc.; only set slots that loaded. */
function meshStandardParamsFromLoadedMaps(loaded, wireframeEnabled) {
    const p = {
        wireframe: wireframeEnabled,
        side: THREE.DoubleSide,
        roughness: loaded.roughness ? 1 : 0.55,
        metalness: loaded.metalness ? 1 : 0.02,
        aoMapIntensity: loaded.ao ? 1 : 0,
        displacementScale: loaded.displacement ? 0.02 : 0,
        displacementBias: 0,
    };
    if (loaded.diffuse) p.map = loaded.diffuse;
    if (loaded.normal) p.normalMap = loaded.normal;
    if (loaded.roughness) p.roughnessMap = loaded.roughness;
    if (loaded.metalness) p.metalnessMap = loaded.metalness;
    if (loaded.ao) p.aoMap = loaded.ao;
    if (loaded.displacement) p.displacementMap = loaded.displacement;
    return p;
}

function r3fTextureSlotProps(loaded) {
    if (!loaded) return {};
    const o = {};
    if (loaded.diffuse) o.map = loaded.diffuse;
    if (loaded.normal) o.normalMap = loaded.normal;
    if (loaded.roughness) o.roughnessMap = loaded.roughness;
    if (loaded.metalness) o.metalnessMap = loaded.metalness;
    if (loaded.ao) o.aoMap = loaded.ao;
    if (loaded.displacement) o.displacementMap = loaded.displacement;
    return o;
}

/** For primitives (mesh JSX): loads catalog `materialMaps` once per unique map set. */
function usePrimitiveOnlineMaps(serializedKey) {
    const [loaded, setLoaded] = useState(null);

    useEffect(() => {
        if (!serializedKey) {
            setLoaded((prev) => {
                disposeLoadedTextureMap(prev);
                return null;
            });
            return undefined;
        }

        let maps;
        try {
            maps = JSON.parse(serializedKey);
        } catch {
            return undefined;
        }

        let cancelled = false;
        loadOnlineMaterialMapsAsync(maps).then((res) => {
            if (cancelled) {
                disposeLoadedTextureMap(res);
                return;
            }
            setLoaded((prev) => {
                disposeLoadedTextureMap(prev);
                return res;
            });
        });

        return () => {
            cancelled = true;
        };
    }, [serializedKey]);

    return loaded;
}

function cloneMeshMaterials(material) {
    if (!material) return material;
    if (Array.isArray(material)) return material.map((m) => (m ? m.clone() : m));
    return material.clone();
}

function AutoRecoverModel({ data, children }) {
    const [recoveredUrl, setRecoveredUrl] = useState(null);
    const [recovering, setRecovering] = useState(false);
    const [failed, setFailed] = useState(false);
    const updateObject = useStore(s => s.updateObject);

    const hasBlobUrl = data.url && data.url.startsWith('blob:');
    /** After refresh, `blob:` URLs from localStorage are never in this session — do not mount GLTFLoader on them first. */
    const staleSessionBlob = hasBlobUrl && !isBlobFromSession(data.url);
    const urlIsSourceUrl = data.url && !data.url.startsWith('blob:') && !data.url.startsWith('data:') &&
        data.originalModelUrl && data.url === data.originalModelUrl;
    const urlIsNull = !data.url && data.originalModelUrl;
    const urlMissingButRecoverableSketchfab = !data.url && data.source === 'sketchfab' && !!data.sourceAssetId;
    const urlMissingButRecoverableBlenderkit = !data.url && data.source === 'blenderkit' && !!data.sourceAssetId;
    const urlMissingButRecoverableFree3d = !data.url && data.source === 'free3d' && !!data.sourceAssetId;

    const needsRecovery = staleSessionBlob || urlIsSourceUrl || urlIsNull || urlMissingButRecoverableSketchfab
        || urlMissingButRecoverableBlenderkit || urlMissingButRecoverableFree3d;
    const canRecover = needsRecovery && (
        data.originalModelUrl
        || (data.source === 'sketchfab' && data.sourceAssetId)
        || (data.source === 'blenderkit' && data.sourceAssetId)
        || (data.source === 'free3d' && data.sourceAssetId)
    );

    useEffect(() => {
        if (!needsRecovery) {
            setFailed(false);
            setRecoveredUrl(null);
        }
    }, [needsRecovery]);

    useEffect(() => {
        if (!canRecover || recovering || recoveredUrl || failed) return;
        setRecovering(true);

        (async () => {
            try {
                let newUrl = null;
                let lastError = null;
                for (let attempt = 0; attempt < 3; attempt += 1) {
                    try {
                        if (data.source === 'sketchfab' && data.sourceAssetId) {
                            newUrl = await downloadSketchfabModel(data.sourceAssetId);
                        } else if (data.source === 'free3d' && data.sourceAssetId) {
                            newUrl = await downloadFree3DModel(data.sourceAssetId, { lod: '10k' });
                        } else if (data.source === 'blenderkit' && data.sourceAssetId) {
                            newUrl = await downloadBlenderKitModel(data.sourceAssetId);
                        } else if (data.source === 'polyhaven' && data.originalModelUrl) {
                            newUrl = await downloadPolyHavenModel(data.originalModelUrl, data.gltfIncludes);
                        } else if (data.originalModelUrl) {
                            const stl =
                                data.type === 'stl'
                                || /\.stl($|\?)/i.test(data.originalModelUrl);
                            newUrl = await downloadGenericModel(data.originalModelUrl, { allowStl: stl });
                        }
                        if (newUrl) break;
                    } catch (err) {
                        lastError = err;
                        if (attempt < 2) {
                            await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
                        }
                    }
                }
                if (newUrl) {
                    setRecoveredUrl(newUrl);
                    if (data.source === 'blenderkit') {
                        updateObject(data.id, { url: newUrl, originalModelUrl: null });
                    } else {
                        updateObject(data.id, { url: newUrl });
                    }
                } else {
                    if (lastError) console.error('[AutoRecover] Last retry error:', lastError);
                    setFailed(true);
                }
            } catch (err) {
                console.error('[AutoRecover] Failed to re-download model:', err);
                setFailed(true);
            } finally {
                setRecovering(false);
            }
        })();
    }, [canRecover, recovering, recoveredUrl, failed, data.id, data.source, data.sourceAssetId, data.originalModelUrl, data.gltfIncludes, data.type, updateObject]);

    if (!needsRecovery) return children;

    if (failed || !canRecover) {
        return (
            <group>
                <mesh>
                    <boxGeometry args={[0.8, 0.8, 0.8]} />
                    <meshStandardMaterial color="#f59e0b" wireframe transparent opacity={0.4} />
                </mesh>
                <Html center>
                    <div style={{ background: 'rgba(0,0,0,0.92)', padding: '4px 8px', borderRadius: 4, border: '1px solid #f59e0b', fontSize: 9, color: '#f59e0b', fontFamily: 'monospace', whiteSpace: 'nowrap', textTransform: 'uppercase', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {data.name || 'Model'} — Expired
                    </div>
                </Html>
            </group>
        );
    }

    const modelUrl = recoveredUrl || data.url;
    const mustNotMountLoader = !modelUrl || staleSessionBlob || urlIsSourceUrl;

    if (mustNotMountLoader) {
        return (
            <group>
                <mesh>
                    <boxGeometry args={[0.8, 0.8, 0.8]} />
                    <meshStandardMaterial color="#3b82f6" wireframe transparent opacity={0.4} />
                </mesh>
                <Html center>
                    <div style={{ background: 'rgba(0,0,0,0.92)', padding: '4px 8px', borderRadius: 4, border: '1px solid #3b82f6', fontSize: 9, color: '#3b82f6', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {recovering ? 'Re-downloading...' : 'Preparing model...'}
                    </div>
                </Html>
            </group>
        );
    }

    try {
        const boundary = React.Children.only(children);
        const inner = boundary.props.children;
        if (inner && typeof inner === 'object' && inner.props != null) {
            return React.cloneElement(boundary, {
                children: React.cloneElement(inner, { url: modelUrl }),
            });
        }
    } catch {
        /* fall through */
    }
    return children;
}

function resolveModelProxyUrl(url) {
    if (!url) return null;
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    if (url.includes('/api/asset-store/proxy?url=')) return url;
    if (url.includes('/api/tripo/proxy-model?url=')) return url;
    // Tripo signed URLs are short-lived; use the Tripo proxy path (it can refresh expired links).
    if (url.includes('tripo') || url.includes('tripo3d')) {
        return `${API_BASE}/api/tripo/proxy-model?url=${encodeURIComponent(url)}`;
    }
    try {
        const parsed = new URL(url, window.location.origin);
        const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
        let backendOrigin = '';
        try {
            backendOrigin = new URL(API_BASE).origin;
        } catch {
            backendOrigin = '';
        }
        if (isHttp && backendOrigin && parsed.origin === backendOrigin && parsed.pathname.includes('/api/asset-store/')) {
            return url;
        }
        const isSameOrigin = parsed.origin === window.location.origin;
        const needsProxy =
            parsed.hostname.includes('tripo') ||
            parsed.hostname.includes('tripo3d') ||
            parsed.hostname.includes('amazonaws.com') ||
            parsed.hostname.includes('r2.cloudflarestorage.com');
        if (isHttp && needsProxy) {
            return `${API_BASE}/api/tripo/proxy-model?url=${encodeURIComponent(parsed.href)}`;
        }
        if (isHttp && !isSameOrigin) {
            return `${API_BASE}/api/asset-store/proxy?url=${encodeURIComponent(parsed.href)}`;
        }
    } catch {
        /* noop */
    }
    if (url.includes('raw.githubusercontent.com')) {
        return `${API_BASE}/api/asset-store/proxy?url=${encodeURIComponent(url)}`;
    }
    const needsProxy =
        url.includes('tripo') ||
        url.includes('tripo3d') ||
        url.includes('amazonaws.com') ||
        url.includes('r2.cloudflarestorage.com');
    if (needsProxy) {
        return `${API_BASE}/api/tripo/proxy-model?url=${encodeURIComponent(url)}`;
    }
    return url;
}

function gltfDocumentPathHint(originalUrl, proxiedUrl) {
    let doc = originalUrl || proxiedUrl || '';
    try {
        const u = new URL(proxiedUrl || '', typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        const inner = u.searchParams.get('url');
        if (inner) doc = decodeURIComponent(inner);
    } catch {
        /* noop */
    }
    return doc.split('#')[0];
}

function needsGltfDependencyRewrite(originalUrl, proxiedUrl) {
    if (originalUrl?.startsWith('blob:') || originalUrl?.startsWith('data:')) return false;
    const doc = gltfDocumentPathHint(originalUrl, proxiedUrl);
    return /\.gltf($|\?)/i.test(doc);
}

/** Thin wrapper: rewrites JSON glTF dependencies for proxy/GitHub URLs so GLTFLoader resolves buffers correctly. */
const Model = (props) => {
    const proxiedUrl = useMemo(() => resolveModelProxyUrl(props.url), [props.url]);
    const [preparedUrl, setPreparedUrl] = useState(null);

    useLayoutEffect(() => {
        if (!proxiedUrl) {
            setPreparedUrl(null);
            return;
        }
        const raw = props.url;
        if (raw?.startsWith('blob:') || raw?.startsWith('data:')) {
            setPreparedUrl(proxiedUrl);
            return;
        }
        if (!needsGltfDependencyRewrite(raw, proxiedUrl)) {
            setPreparedUrl(proxiedUrl);
            return;
        }
        setPreparedUrl(null);
    }, [props.url, proxiedUrl]);

    useEffect(() => {
        if (!proxiedUrl) return undefined;
        const raw = props.url;
        if (raw?.startsWith('blob:') || raw?.startsWith('data:')) return undefined;
        if (!needsGltfDependencyRewrite(raw, proxiedUrl)) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const blobUrl = await rewriteRemoteGltfToBlobUrl(proxiedUrl, raw);
                if (!cancelled) setPreparedUrl(blobUrl || proxiedUrl);
            } catch (e) {
                console.warn('[Model] glTF dependency rewrite failed:', e);
                if (!cancelled) setPreparedUrl(proxiedUrl);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [props.url, proxiedUrl]);

    if (!proxiedUrl || !preparedUrl) return null;
    return <ModelLoaded key={preparedUrl} {...props} proxiedUrl={preparedUrl} />;
};

/** Loads GLTF only when `proxiedUrl` is defined — all hooks run in a stable order. */
function ModelLoaded({
    proxiedUrl,
    modelName,
    wireframeEnabled,
    meshName,
    materialMaps,
    onLoaded,
    highlightedPartNames = [],
    isDismantleModalOpen = false,
    onSubMeshClick,
    enableSubMeshInteraction = false,
    hiddenMeshNames = [],
    isDismantleShortcut = false,
    castShadows = true,
    receiveShadows = true,
    pivotOffset = null,
    isSelected = false,
    objectId,
    meshElementSelection = null,
    selectionMeshId = null,
    partTransforms = null,
}) {
    const [hoveredPartName, setHoveredPartName] = useState(null);
    const dismantleTargetId = useStore((s) => (s.dismantleTarget && s.dismantleTarget.id) || null);
    const interiorMode = useStore((s) => s.interiorMode);
    const interiorObjectId = useStore((s) => s.interiorObjectId);
    const { gl } = useThree();
    const extendGltfLoader = useCallback(
        (loader) => {
            attachKtx2Loader(loader, gl);
        },
        [gl]
    );

    const { scene } = useGLTF(proxiedUrl, true, true, extendGltfLoader);

    const clonedSceneRef = useRef(null);
    const cloneOnLoadMetaRef = useRef(null);
    const onLoadedRef = useRef(onLoaded);
    onLoadedRef.current = onLoaded;

    const clonedScene = useMemo(() => {
        const clone = scene.clone();
        clonedSceneRef.current = clone;

        const fullBox = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        fullBox.getSize(size);
        fullBox.getCenter(center);

        clone.position.x -= center.x;
        clone.position.z -= center.z;
        clone.position.y -= fullBox.min.y;
        if (meshName && Array.isArray(pivotOffset) && pivotOffset.length === 3) {
            // Re-center isolated mesh around its own pivot so transform gizmo sits on the part.
            clone.position.x -= Number(pivotOffset[0]) || 0;
            clone.position.y -= Number(pivotOffset[1]) || 0;
            clone.position.z -= Number(pivotOffset[2]) || 0;
        }

        const clonePartNameSeen = new Map();
        const tmpBox = new THREE.Box3();
        const tmpCenter = new THREE.Vector3();
        const parts = [];
        const PARTS_CAP = 2000;
        let cloneOrdinal = 0;
        let totalMeshCount = 0;

        clone.traverse((c) => {
            if (!c.isMesh) return;
            totalMeshCount += 1;
            cloneOrdinal += 1;
            const rawBase = (c.name || '').trim() || `Mesh ${cloneOrdinal}`;
            const nextCount = (clonePartNameSeen.get(rawBase) || 0) + 1;
            clonePartNameSeen.set(rawBase, nextCount);
            const partLabel = nextCount === 1 ? rawBase : `${rawBase} (${nextCount})`;
            c.userData.noviraPartName = partLabel;
            c.userData.noviraObjectId = objectId;
            c.userData.noviraMeshOrdinal = totalMeshCount - 1;

            if (meshName) {
                c.visible = c.userData.noviraPartName === meshName;
            }
            if (c.material) {
                c.material = cloneMeshMaterials(c.material);
                forEachMaterial(c.material, (mat) => {
                    mat.wireframe = wireframeEnabled;
                    mat.side = THREE.DoubleSide;
                    mat.needsUpdate = true;
                });
            }

            if (parts.length < PARTS_CAP) {
                c.updateWorldMatrix(true, false);
                tmpBox.setFromObject(c);
                tmpBox.getCenter(tmpCenter);
                const nx = tmpCenter.x - center.x;
                const ny = tmpCenter.y - fullBox.min.y;
                const nz = tmpCenter.z - center.z;
                parts.push({ name: partLabel, center: [nx, ny, nz] });
            }
        });

        cloneOnLoadMetaRef.current = {
            parts,
            totalMeshCount,
            dimensions: [size.x, size.y, size.z],
            originalDimensions: [size.x, size.y, size.z],
        };

        return clone;
    }, [scene, wireframeEnabled, meshName, pivotOffset, objectId]);

    useEffect(() => {
        if (!clonedScene || !onLoadedRef.current || !cloneOnLoadMetaRef.current) return;
        onLoadedRef.current(cloneOnLoadMetaRef.current);
    }, [clonedScene]);

    useEffect(() => {
        const root = clonedSceneRef.current;
        if (!root) return;
        root.traverse((c) => {
            if (!c.isMesh || c.userData.noviraMeshOrdinal === undefined) return;
            const key = String(c.userData.noviraMeshOrdinal);
            const pt = partTransforms?.[key];
            if (!c.userData._noviraBindPose) {
                c.userData._noviraBindPose = {
                    pos: c.position.clone(),
                    rot: c.rotation.clone(),
                    scl: c.scale.clone(),
                };
            }
            const base = c.userData._noviraBindPose;
            if (pt) {
                if (Array.isArray(pt.position) && pt.position.length === 3) {
                    c.position.set(pt.position[0], pt.position[1], pt.position[2]);
                } else {
                    c.position.copy(base.pos);
                }
                if (Array.isArray(pt.rotation) && pt.rotation.length === 3) {
                    c.rotation.set(pt.rotation[0], pt.rotation[1], pt.rotation[2]);
                } else {
                    c.rotation.copy(base.rot);
                }
                if (Array.isArray(pt.scale) && pt.scale.length === 3) {
                    c.scale.set(pt.scale[0], pt.scale[1], pt.scale[2]);
                } else {
                    c.scale.copy(base.scl);
                }
            } else {
                c.position.copy(base.pos);
                c.rotation.copy(base.rot);
                c.scale.copy(base.scl);
            }
        });
    }, [clonedScene, partTransforms]);

    useEffect(() => {
        const clone = clonedSceneRef.current;
        if (!clone) return;
        const cs = castShadows !== false;
        const rs = receiveShadows !== false;
        clone.traverse((c) => {
            if (c.isMesh) {
                c.castShadow = cs;
                c.receiveShadow = rs;
            }
        });
    }, [clonedScene, castShadows, receiveShadows]);

    useEffect(() => {
        const root = clonedSceneRef.current;
        if (!root || !materialMaps || !Object.values(materialMaps).some(Boolean)) return undefined;

        let cancelled = false;
        loadOnlineMaterialMapsAsync(materialMaps).then((loaded) => {
            if (!loaded) return;
            if (cancelled) {
                disposeLoadedTextureMap(loaded);
                return;
            }

            root.traverse((node) => {
                if (!node.isMesh) return;
                const prev = node.material;
                const slotCount = Array.isArray(prev) ? prev.length : 1;
                if (prev) disposeMaterialTextures(prev);

                const mkMat = () => {
                    const m = new THREE.MeshStandardMaterial(meshStandardParamsFromLoadedMaps(loaded, wireframeEnabled));
                    m.needsUpdate = true;
                    return m;
                };

                if (slotCount > 1) {
                    node.material = Array.from({ length: slotCount }, () => mkMat());
                } else {
                    node.material = mkMat();
                }

                if (loaded.ao && node.geometry) {
                    const g = node.geometry;
                    if (g.attributes.uv && !g.attributes.uv2) {
                        g.setAttribute('uv2', g.attributes.uv);
                    }
                }
            });
        });

        return () => {
            cancelled = true;
        };
    }, [clonedScene, materialMaps, wireframeEnabled]);

    useEffect(() => {
        return () => {
            const clone = clonedSceneRef.current;
            if (clone) {
                clone.traverse((child) => {
                    if (child.isMesh) {
                        child.geometry?.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                            else child.material.dispose();
                        }
                    }
                });
            }
        };
    }, [clonedScene]);

    useEffect(() => {
        const clone = clonedScene;
        if (!clone) return;

        clone.traverse(node => {
            if (!node.isMesh || !node.material) return;

            const nodeName = node.userData?.noviraPartName || node.name;
            const meshOrd = node.userData?.noviraMeshOrdinal;
            const selOrdinals = meshElementSelection?.meshOrdinals;
            const hasOrdinalPick = Array.isArray(selOrdinals) && selOrdinals.length > 0;

            const isModalHighlight = isDismantleModalOpen
                && dismantleTargetId === objectId
                && highlightedPartNames.includes(nodeName);
            const isInteriorHighlight = interiorMode && interiorObjectId === objectId && highlightedPartNames.includes(nodeName);
            const isQuickHighlight = isDismantleShortcut && hoveredPartName !== null && hoveredPartName === nodeName;
            const isHoverHighlight = enableSubMeshInteraction && hoveredPartName !== null && hoveredPartName === nodeName && !isQuickHighlight;
            const isPartSelection = meshElementSelection?.type === 'part'
                && meshElementSelection.objectId === objectId
                && (
                    (hasOrdinalPick && Number.isFinite(meshOrd) && selOrdinals.includes(meshOrd))
                    || (!hasOrdinalPick && Array.isArray(meshElementSelection.partNames) && meshElementSelection.partNames.includes(nodeName))
                );
            const isPartSubSelOnThisObject = meshElementSelection?.type === 'part' && meshElementSelection?.objectId === objectId;
            const isObjectSelectedForEmissive = isSelected && !(isPartSubSelOnThisObject && !isPartSelection);

            forEachMaterial(node.material, (mat) => {
                if (!mat?.emissive) return;

                if (!node.userData._noviraEmOrigByMat) {
                    node.userData._noviraEmOrigByMat = new Map();
                }
                const origMap = node.userData._noviraEmOrigByMat;
                if (!origMap.has(mat.uuid)) {
                    origMap.set(mat.uuid, {
                        emissive: mat.emissive.clone(),
                        intensity: mat.emissiveIntensity || 0,
                    });
                }

                if (isModalHighlight || isInteriorHighlight || isQuickHighlight || isHoverHighlight) {
                    mat.emissive.set('#f97316');
                    mat.emissiveIntensity = 2.0;
                } else if (isPartSelection) {
                    mat.emissive.set('#3b82f6');
                    mat.emissiveIntensity = 2.0;
                } else if (isObjectSelectedForEmissive) {
                    mat.emissive.set('#6366f1');
                    mat.emissiveIntensity = 0.18;
                } else {
                    const orig = origMap.get(mat.uuid);
                    if (orig) {
                        mat.emissive.copy(orig.emissive);
                        mat.emissiveIntensity = orig.intensity;
                    }
                    origMap.delete(mat.uuid);
                    if (origMap.size === 0) {
                        delete node.userData._noviraEmOrigByMat;
                    }
                }
                mat.needsUpdate = true;
            });
        });
    }, [
        clonedScene,
        isSelected,
        highlightedPartNames,
        isDismantleModalOpen,
        dismantleTargetId,
        interiorMode,
        interiorObjectId,
        isDismantleShortcut,
        hoveredPartName,
        enableSubMeshInteraction,
        meshElementSelection,
        objectId,
    ]);

    useEffect(() => {
        if (!enableSubMeshInteraction && hoveredPartName !== null) {
            setHoveredPartName(null);
            document.body.style.cursor = 'default';
        }
    }, [enableSubMeshInteraction, hoveredPartName]);

    useEffect(() => {
        const clone = clonedScene;
        if (!clone) return;
        if (clone.userData.noviraElementOverlay) {
            clone.remove(clone.userData.noviraElementOverlay);
            clone.userData.noviraElementOverlay.traverse((o) => {
                if (o.geometry) o.geometry.dispose?.();
                if (o.material) o.material.dispose?.();
            });
            delete clone.userData.noviraElementOverlay;
        }
        if (!meshElementSelection || meshElementSelection.objectId !== objectId) return;
        if (!['face', 'edge', 'vertex'].includes(meshElementSelection.type)) return;
        let targetMesh = null;
        if (selectionMeshId) {
            clone.traverse((node) => {
                if (node.isMesh && (node.userData?.noviraPartName || node.name) === selectionMeshId) {
                    targetMesh = node;
                }
            });
        }
        if (!targetMesh && meshElementSelection.meshId) {
            const mid = String(meshElementSelection.meshId);
            clone.traverse((node) => {
                if (node.isMesh && String(node.id) === mid) {
                    targetMesh = node;
                }
            });
        }
        if (!targetMesh && meshElementSelection.type === 'face' && Number.isFinite(meshElementSelection.faceIndex)) {
            clone.traverse((node) => {
                if (node.isMesh && node.geometry?.attributes?.position && !targetMesh) {
                    targetMesh = node;
                }
            });
        }
        if (!targetMesh?.isMesh || !targetMesh.geometry?.attributes?.position) return;
        const posAttr = targetMesh.geometry.attributes.position;
        const overlay = new THREE.Group();
        overlay.renderOrder = 9999;

        if (meshElementSelection.type === 'vertex') {
            const verts = meshElementSelection.indices || [];
            const pts = [];
            verts.forEach((vi) => {
                if (!Number.isFinite(vi) || vi < 0 || vi >= posAttr.count) return;
                pts.push(new THREE.Vector3().fromBufferAttribute(posAttr, vi));
            });
            if (pts.length) {
                const g = new THREE.BufferGeometry().setFromPoints(pts);
                const m = new THREE.PointsMaterial({ color: '#f97316', size: 0.09, sizeAttenuation: true, depthTest: false });
                overlay.add(new THREE.Points(g, m));
            }
        } else if (meshElementSelection.type === 'edge' && (meshElementSelection.indices || []).length >= 2) {
            const [a, b] = meshElementSelection.indices;
            if (Number.isFinite(a) && Number.isFinite(b) && a < posAttr.count && b < posAttr.count) {
                const p1 = new THREE.Vector3().fromBufferAttribute(posAttr, a);
                const p2 = new THREE.Vector3().fromBufferAttribute(posAttr, b);
                const g = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const m = new THREE.LineBasicMaterial({ color: '#f97316', depthTest: false });
                overlay.add(new THREE.LineSegments(g, m));
            }
        } else if (meshElementSelection.type === 'face') {
            let a; let b; let c;
            const idxs = meshElementSelection.indices || [];
            if (idxs.length >= 3) {
                [a, b, c] = idxs;
            } else if (Number.isFinite(meshElementSelection.faceIndex)) {
                const tri = getTriangleVertexIndices(targetMesh.geometry, meshElementSelection.faceIndex);
                if (tri) [a, b, c] = tri;
            }
            if ([a, b, c].every((v) => Number.isFinite(v) && v >= 0 && v < posAttr.count)) {
                const p1 = new THREE.Vector3().fromBufferAttribute(posAttr, a);
                const p2 = new THREE.Vector3().fromBufferAttribute(posAttr, b);
                const p3 = new THREE.Vector3().fromBufferAttribute(posAttr, c);
                const g = new THREE.BufferGeometry();
                g.setAttribute('position', new THREE.Float32BufferAttribute([
                    p1.x, p1.y, p1.z,
                    p2.x, p2.y, p2.z,
                    p3.x, p3.y, p3.z,
                ], 3));
                g.computeVertexNormals();
                const m = new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthTest: false });
                overlay.add(new THREE.Mesh(g, m));
            }
        }
        targetMesh.add(overlay);
        clone.userData.noviraElementOverlay = overlay;
    }, [clonedScene, meshElementSelection, objectId, selectionMeshId]);

    useEffect(() => {
        const clone = clonedSceneRef.current;
        if (!clone) return;
        clone.traverse((node) => {
            if (node.isMesh) {
                const partName = node.userData?.noviraPartName || node.name;

                if (!meshName) {
                    node.visible = !hiddenMeshNames.includes(partName);
                }
            }
        });
    }, [clonedScene, hiddenMeshNames, meshName]);

    const handlePointerOver = (e) => {
        if (!enableSubMeshInteraction) return;
        const mesh = e.object;
        if (mesh?.isMesh) {
            e.stopPropagation();
            const name = mesh.userData?.noviraPartName || mesh.name || null;
            setHoveredPartName(name);
            document.body.style.cursor = 'crosshair';
        }
    };

    const handlePointerOut = () => {
        if (hoveredPartName !== null) {
            setHoveredPartName(null);
            document.body.style.cursor = 'default';
        }
    };

    const handleGroupClick = (e) => {
        if (!onSubMeshClick || !enableSubMeshInteraction) return;
        const mesh = e.object;
        if (!mesh?.isMesh) return;
        e.stopPropagation();
        const belongsToThis = mesh.userData?.noviraObjectId === objectId
            || isAncestorOf(clonedSceneRef.current, mesh);
        if (!belongsToThis) return;
        onSubMeshClick({
            mesh,
            faceIndex: Number.isFinite(e.faceIndex) ? e.faceIndex : null,
            point: e.point ? [e.point.x, e.point.y, e.point.z] : null,
            originalEvent: e,
        });
    };

    return (
        <group
            onClick={handleGroupClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        >
            <primitive object={clonedScene} />
        </group>
    );
}

const StlModel = (props) => {
    const proxiedUrl = useMemo(() => resolveModelProxyUrl(props.url), [props.url]);
    if (!proxiedUrl) return null;
    return <StlModelLoaded key={proxiedUrl} {...props} proxiedUrl={proxiedUrl} />;
};

function StlModelLoaded({
    proxiedUrl,
    wireframeEnabled,
    onLoaded,
    castShadows = true,
    receiveShadows = true,
    onMeshClick = null,
    meshEditState = null,
    baseColor = '#94a3b8',
}) {
    const geometry = useLoader(STLLoader, proxiedUrl);
    const onLoadedRef = useRef(onLoaded);
    onLoadedRef.current = onLoaded;

    const { processed, liftY, uniformScale } = useMemo(() => {
        const g = geometry.clone();
        g.center();
        g.computeVertexNormals();
        g.computeBoundingBox();
        const box = g.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = maxDim > 3 ? 10 : 1;
        const s = maxDim > 0 ? targetScale / maxDim : 1;
        return { processed: g, liftY: -box.min.y, uniformScale: s };
    }, [geometry]);

    useEffect(() => {
        if (!processed || !onLoadedRef.current) return;
        const box = processed.boundingBox;
        if (!box) return;
        const size = new THREE.Vector3();
        box.getSize(size);
        const s = uniformScale;
        onLoadedRef.current({
            parts: [{ name: 'mesh', center: [0, 0, 0] }],
            totalMeshCount: 1,
            dimensions: [size.x * s, size.y * s, size.z * s],
            originalDimensions: [size.x, size.y, size.z],
        });
    }, [processed, uniformScale]);

    useEffect(() => () => processed.dispose(), [processed]);

    const edited = useMemo(
        () => applyMeshEditStateToGeometry(processed, meshEditState, baseColor),
        [processed, meshEditState, baseColor]
    );

    useEffect(() => () => {
        if (edited?.geometry && edited.geometry !== processed) edited.geometry.dispose?.();
    }, [edited, processed]);

    return (
        <group scale={[uniformScale, uniformScale, uniformScale]}>
            <mesh
                position={[0, liftY, 0]}
                geometry={edited?.geometry || processed}
                castShadow={castShadows !== false}
                receiveShadow={receiveShadows !== false}
                onClick={onMeshClick || undefined}
            >
                <meshStandardMaterial
                    color={baseColor || '#94a3b8'}
                    vertexColors={!!edited?.vertexColors}
                    wireframe={wireframeEnabled}
                    metalness={0.22}
                    roughness={0.52}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}

function BreakSphere({ position, onBreak }) {
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);
    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        const s = hovered ? 1.5 + Math.sin(t * 10) * 0.15 : 1 + Math.sin(t * 3) * 0.08;
        meshRef.current.scale.setScalar(s);
    });
    return (
        <mesh
            ref={meshRef}
            position={position}
            onClick={onBreak}
            onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        >
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial
                color={hovered ? '#ef4444' : '#34d399'}
                emissive={hovered ? '#ef4444' : '#34d399'}
                emissiveIntensity={hovered ? 6 : 3}
            />
        </mesh>
    );
}

function sceneObjectPropsAreEqual(prev, next) {
    return prev.data === next.data
        && prev.parentObject === next.parentObject
        && prev.objectById === next.objectById;
}

function SceneObject({ data, parentObject = null, objectById }) {
    const { id, dimensions = [1, 1, 1], color = '#ffffff', position = [0, dimensions[1] / 2, 0], rotation = [0, 0, 0], scale = [1, 1, 1], visible = true, locked = false } = data;

    const isSelected = useStore(s => s.selectedId === id);
    const setSelectedId = useStore(s => s.setSelectedId);
    const updateObject = useStore(s => s.updateObject);
    const activeTool = useStore(s => s.activeTool);
    const wireframe = useStore(s => s.wireframe);
    const transformSpace = useStore((s) => (s.transformSpace === 'local' ? 'local' : 'world'));
    const objectSnapEnabled = useStore((s) => s.objectSnapEnabled !== false);
    const groundRef = useStore(s => s.groundRef);
    const isLifted = useStore(s => s.liftedObjectId === id);
    const liftOrigin = useStore(s => s.liftOrigin);
    const setCameraFocus = useStore(s => s.setCameraFocus);
    const axisConstraintWhenSelected = useStore(s => (s.selectedId === id ? s.axisConstraint : null));
    const shiftHeldForSnap = useStore(s => s.selectedId === id && s.shiftPressed);
    const interiorMode = useStore(s => s.interiorMode);
    const highlightedPartNames = useStore(s => s.highlightedPartNames);
    const isDismantleModalOpen = useStore(s => s.isDismantleModalOpen);
    const setSelectedSubMeshName = useStore(s => s.setSelectedSubMeshName);
    const setHighlightedPartNames = useStore(s => s.setHighlightedPartNames);
    const meshEditSelectMode = useStore(s => s.meshEditSelectMode);
    const meshEditTransformMode = useStore(s => s.meshEditTransformMode);
    const translationSnap =
        objectSnapEnabled &&
        (activeTool === 'move' || (activeTool === 'parts' && meshEditTransformMode === 'translate'))
            ? 0.25
            : undefined;
    const scaleSnap =
        objectSnapEnabled &&
        (activeTool === 'scale' || (activeTool === 'parts' && meshEditTransformMode === 'scale'))
            ? 0.05
            : undefined;
    const isRotateGizmo =
        activeTool === 'rotate' || (activeTool === 'parts' && meshEditTransformMode === 'rotate');
    const rotationSnapVal = isRotateGizmo
        ? objectSnapEnabled || shiftHeldForSnap
            ? Math.PI / 12
            : null
        : null;
    const meshElementSelection = useStore(s => s.meshElementSelection);
    const setMeshElementSelection = useStore(s => s.setMeshElementSelection);
    const ctrlPressed = useStore(s => s.ctrlPressed);
    const shiftPressed = useStore(s => s.shiftPressed);

    const hiddenMeshNames = useStore(state => state.meshVisibilityMap[id] ?? _EMPTY);

    const isColliding = useStore(s => s.collidingPairs.some(p => p.id1 === id || p.id2 === id));
    const isGlobalLocked = useStore(s => s.lockedObjectIds.includes(id));

    const objectLookup = objectById instanceof Map ? objectById : new Map();

    const objectRef = useRef();
    const lastPickedMeshRef = useRef(null);
    const [selectedMeshId, setSelectedMeshId] = useState(null);
    const [partTransformObject, setPartTransformObject] = useState(null);
    const partTransformObjectRef = useRef(null);
    useEffect(() => {
        partTransformObjectRef.current = partTransformObject;
    }, [partTransformObject]);
    /** Drei TransformControls must not receive a ref object while `.current` is still null (it would call attach(null) and crash the render loop). */
    const [transformTarget, setTransformTarget] = useState(null);
    const bindObjectRef = useCallback((node) => {
        objectRef.current = node;
        if (node) {
            node.userData.noviraSceneObjectId = id;
        }
        setTransformTarget(node);
    }, [id]);
    const liftRingRef = useRef();
    const currentBoxRef = useRef(new THREE.Box3());

    const isTransformTool = ['move', 'rotate', 'scale', 'parts'].includes(activeTool);

    const localWidth = Math.abs((data.dimensions?.[0] || 1) * scale[0]);
    const localHeight = Math.abs((data.dimensions?.[1] || 1) * scale[1]);
    const localThickness = Math.abs((data.dimensions?.[2] || 1) * scale[2]);

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    const partTcReady = !!partTransformObject && isMounted;

    useEffect(() => {
        if (data.type === 'ground') {
            groundRef.current = objectRef.current;
        }
        return () => {
            physicsState.objectBounds.delete(id);
        };
    }, [id, data.type, groundRef]);

    useFrame(({ clock }) => {
        try {

            if (liftRingRef.current && isLifted) {
                const t = clock.getElapsedTime();
                liftRingRef.current.scale.setScalar(1 + Math.sin(t * 5) * 0.06);
                liftRingRef.current.material.opacity = 0.5 + Math.sin(t * 5) * 0.3;
            }

            if (isLifted && physicsState.liftPosition && objectRef.current) {
                objectRef.current.position.set(
                    physicsState.liftPosition[0],
                    physicsState.liftPosition[1],
                    physicsState.liftPosition[2]
                );
            }

            const { liftedObjectId, isTransformDragging } = useStore.getState();
            if (id !== liftedObjectId && !isTransformDragging) return;

            if (objectRef.current && data.type !== 'ground' && currentBoxRef.current) {
                objectRef.current.updateWorldMatrix(true, false);
                const currentBox = currentBoxRef.current.setFromObject(objectRef.current);
                if (currentBox.isEmpty()) return;
                physicsState.objectBounds.set(id, currentBox);

                const newCollisions = [];
                const currentObjects = useStore.getState().objects;
                physicsState.objectBounds.forEach((otherBox, otherId) => {
                    if (otherId === id) return;
                    const otherObj = currentObjects.find(o => o.id === otherId);
                    if (!otherObj || otherObj.type === 'ground') return;
                    if (currentBox.intersectsBox(otherBox)) {
                        const intersectBox = new THREE.Box3().copy(currentBox).intersect(otherBox);
                        const contactPoint = new THREE.Vector3();
                        intersectBox.getCenter(contactPoint);
                        newCollisions.push({ id1: id, id2: otherId, point: [contactPoint.x, contactPoint.y, contactPoint.z] });
                    }
                });
                const store = useStore.getState();
                store.setCollidingPairs(newCollisions);
            }
        } catch (err) {

        }
    });

    const primitiveOnlineMatKey = useMemo(() => {
        const isGltf = data.type === 'gltf' || data.type === 'gltf-part' || data.type === 'stl';
        const m = data.materialMaps;
        if (isGltf || data.type === 'light' || data.type === 'ai-hologram' || !m || !Object.values(m).some(Boolean)) {
            return '';
        }
        return JSON.stringify(m);
    }, [data.type, data.materialMaps]);

    const onlinePrimitiveMaps = usePrimitiveOnlineMaps(primitiveOnlineMatKey);

    const [transformAttachOk, setTransformAttachOk] = useState(false);
    useLayoutEffect(() => {
        if (!isSelected || !isTransformTool || !isMounted || isLifted) {
            setTransformAttachOk(false);
            return;
        }
        setTransformAttachOk(!!objectRef.current);
        const idRaf = requestAnimationFrame(() => {
            setTransformAttachOk(!!objectRef.current);
        });
        return () => cancelAnimationFrame(idRaf);
    }, [isSelected, isTransformTool, isMounted, isLifted, id, data.type, data.url, position, rotation, scale, meshEditSelectMode]);

    useEffect(() => {
        if (!onlinePrimitiveMaps?.ao) return undefined;
        const idRaf = requestAnimationFrame(() => {
            const mesh = objectRef.current;
            const g = mesh?.geometry;
            if (!g?.attributes?.uv || g.attributes.uv2) return;
            g.setAttribute('uv2', g.attributes.uv);
        });
        return () => cancelAnimationFrame(idRaf);
    }, [onlinePrimitiveMaps, dimensions, data.geo, data.modifiers]);

    useEffect(() => {
        const onKeyDown = (ev) => {
            const st = useStore.getState();
            if (ev.key === 'Escape') {
                if (st.activeTool === 'parts') {
                    st.setActiveTool('select');
                    st.setMeshElementSelection(null);
                }
                return;
            }
            if (ev.key.toLowerCase() !== 'l') return;
            if (st.activeTool !== 'parts') return;
            const sel = st.meshElementSelection;
            if (!sel || sel.objectId !== id) return;
            if (!['vertex', 'edge', 'face'].includes(sel.type)) return;
            const mesh = lastPickedMeshRef.current;
            if (!mesh?.geometry) return;
            const adjacency = buildAdjacencyFromGeometry(mesh.geometry);
            const seed = Number.isFinite(sel.indices?.[0]) ? sel.indices[0] : null;
            if (!Number.isFinite(seed)) return;
            const linked = floodFillLinked(seed, adjacency);
            st.setMeshElementSelection({
                type: 'vertex',
                objectId: id,
                meshId: mesh.id,
                indices: linked,
            });
            ev.preventDefault();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [id]);

    useEffect(() => {
        if (meshElementSelection?.type !== 'part' || meshElementSelection.objectId !== id || meshEditSelectMode !== 'part') {
            setPartTransformObject(null);
            return;
        }
        const outerGroup = objectRef.current;
        if (!outerGroup) {
            setPartTransformObject(null);
            return;
        }
        const selectedPartNames = meshElementSelection.partNames || [];
        const ordinals = meshElementSelection.meshOrdinals || [];
        if (!selectedPartNames.length && !ordinals.length) {
            setPartTransformObject(null);
            return;
        }
        let found = null;
        outerGroup.traverse((node) => {
            if (!node.isMesh || found) return;
            const name = node.userData?.noviraPartName || node.name;
            const ord = node.userData?.noviraMeshOrdinal;
            if (ordinals.length) {
                if (Number.isFinite(ord) && ordinals.includes(ord)) found = node;
            } else if (selectedPartNames.includes(name)) {
                found = node;
            }
        });
        setPartTransformObject(found);
    }, [meshElementSelection, id, meshEditSelectMode, activeTool, data.url, wireframe, position, rotation, scale]);

    const handlePartTransformMouseUp = useCallback(() => {
        const mesh = partTransformObjectRef.current;
        if (!mesh?.isMesh || meshElementSelection?.objectId !== id) return;
        const ord = mesh.userData?.noviraMeshOrdinal;
        if (!Number.isFinite(ord)) return;
        const key = String(ord);
        const next = { ...(data.partTransforms || {}) };
        next[key] = {
            position: [mesh.position.x, mesh.position.y, mesh.position.z],
            rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
            scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
        };
        updateObject(id, { partTransforms: next });
    }, [meshElementSelection, id, data.partTransforms, updateObject]);

    if (data.isDismantled || visible === false) return null;

    const handleClick = (e) => {
        e.stopPropagation();
        if (locked || isGlobalLocked) return;
        if (useStore.getState().liftedObjectId) return;
        if (useStore.getState().activeTool === 'cursor' && e.point) {
            useStore.getState().setThreeDCursorWorld([e.point.x, e.point.y, e.point.z]);
            return;
        }
        if (useStore.getState().linkingMode) {
            const sel = useStore.getState().selectedId;
            if (data.parentId) {
                useStore.getState().breakParent(id);
            } else if (sel && sel !== id) {
                useStore.getState().setParent(id, sel);
            } else {
                setSelectedId(id);
            }
            return;
        }

        if (useStore.getState().activeTool === 'cursor') {
            e.stopPropagation();
            if (e.point) {
                useStore.getState().setThreeDCursorWorld([e.point.x, e.point.y, e.point.z]);
            }
            return;
        }

        if (useStore.getState().shiftPressed) {
            useStore.getState().toggleMultiSelect(id);
            return;
        }

        if (useStore.getState().selectedId !== id) {
            useStore.getState().selectObject(id);
        }

        const currentActiveTool = useStore.getState().activeTool;
        if (currentActiveTool !== 'parts') {
            const stClick = useStore.getState();
            if ((currentActiveTool === 'focus' || (stClick.smartZoomEnabled && currentActiveTool === 'select')) && e.face && e.object) {
                const normalMatrix = new THREE.Matrix3().getNormalMatrix(e.object.matrixWorld);
                const worldNormal = e.face.normal.clone().applyMatrix3(normalMatrix).normalize();

                const box = new THREE.Box3().setFromObject(objectRef.current);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);

                let focusDistance = 1.0;
                if (interiorMode) {
                    if (id !== useStore.getState().interiorObjectId) {

                        focusDistance = Math.min(Math.max(maxDim * 1.5, 0.45), 2.2);
                    } else {

                        focusDistance = 1.05;
                    }
                } else {

                    focusDistance = Math.max(maxDim * 1.8, 2.5);
                }

                setCameraFocus([e.point.x, e.point.y, e.point.z], [
                    e.point.x + worldNormal.x * focusDistance,
                    e.point.y + worldNormal.y * focusDistance,
                    e.point.z + worldNormal.z * focusDistance
                ]);
            }
        }
    };

    const applyMeshPickSelection = (hit) => {
        const stMesh = useStore.getState();
        const currentTool = stMesh.activeTool;
        const mesh = hit?.mesh;
        const faceIndex = hit?.faceIndex;
        const worldPoint = hit?.point;
        if (!mesh?.isMesh) return;
        const geometry = mesh.geometry;
        lastPickedMeshRef.current = mesh;
        setSelectedMeshId(mesh.userData?.noviraPartName || mesh.name || String(mesh.id));
        const tri = getTriangleVertexIndices(geometry, faceIndex);

        if (stMesh.ctrlPressed && stMesh.shiftPressed) {
            if (data.type === 'gltf-part') {
                stMesh.quickReassemblePart(id);
            } else {
                const meshName = mesh.userData?.noviraPartName || mesh.name || `Mesh ${mesh.id}`;
                const wp = worldPoint || null;
                stMesh.quickExtractPart(id, meshName, wp);
                setTimeout(() => stMesh.setActiveTool('move'), 0);
            }
            return;
        }

        if (currentTool === 'parts') {
            const mode = stMesh.meshEditSelectMode || 'object';

            if (mode === 'object') {
                stMesh.selectObject(id);
                setMeshElementSelection({
                    type: 'object',
                    objectId: id,
                    meshId: String(mesh.id),
                    faceIndex: Number.isFinite(faceIndex) ? faceIndex : null,
                    indices: [],
                });
                return;
            }

            if (mode === 'part') {
                const partName = mesh.userData?.noviraPartName || mesh.name || `Mesh_${mesh.id}`;
                const ord = mesh.userData?.noviraMeshOrdinal;
                setMeshElementSelection({
                    type: 'part',
                    objectId: id,
                    meshId: String(mesh.id),
                    faceIndex: Number.isFinite(faceIndex) ? faceIndex : null,
                    indices: [],
                    partNames: [partName],
                    meshOrdinals: Number.isFinite(ord) ? [ord] : [],
                });
                return;
            }

            if (!tri) return;
            const [a, b, c] = tri;

            if (mode === 'face') {
                setMeshElementSelection({
                    type: 'face',
                    objectId: id,
                    meshId: String(mesh.id),
                    faceIndex: Number.isFinite(faceIndex) ? faceIndex : null,
                    indices: [a, b, c],
                });
                return;
            }

            const posAttr = geometry?.attributes?.position;
            if (!posAttr || !worldPoint) return;

            if (mode === 'vertex') {
                const point = new THREE.Vector3(worldPoint[0], worldPoint[1], worldPoint[2]);
                let best = a;
                let bestDist = Infinity;
                for (const vi of [a, b, c]) {
                    const vLocal = new THREE.Vector3().fromBufferAttribute(posAttr, vi);
                    const vWorld = mesh.localToWorld(vLocal.clone());
                    const d = vWorld.distanceTo(point);
                    if (d < bestDist) {
                        bestDist = d;
                        best = vi;
                    }
                }
                setMeshElementSelection({
                    type: 'vertex',
                    objectId: id,
                    meshId: String(mesh.id),
                    faceIndex: Number.isFinite(faceIndex) ? faceIndex : null,
                    indices: [best],
                });
                return;
            }

            if (mode === 'edge') {
                const edges = [[a, b], [b, c], [c, a]];
                const point = new THREE.Vector3(worldPoint[0], worldPoint[1], worldPoint[2]);
                const pointToSegDist = (p, p1, p2) => {
                    const seg = p2.clone().sub(p1);
                    const t = THREE.MathUtils.clamp(
                        p.clone().sub(p1).dot(seg) / Math.max(seg.lengthSq(), 1e-9),
                        0,
                        1
                    );
                    return p1.clone().add(seg.multiplyScalar(t)).distanceTo(p);
                };
                let bestEdge = edges[0];
                let bestDist = Infinity;
                for (const edge of edges) {
                    const p1 = mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(posAttr, edge[0]));
                    const p2 = mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(posAttr, edge[1]));
                    const d = pointToSegDist(point, p1, p2);
                    if (d < bestDist) {
                        bestDist = d;
                        bestEdge = edge;
                    }
                }
                setMeshElementSelection({
                    type: 'edge',
                    objectId: id,
                    meshId: String(mesh.id),
                    faceIndex: Number.isFinite(faceIndex) ? faceIndex : null,
                    indices: bestEdge,
                });
            }
        } else if (stMesh.interiorMode) {

            const meshName = mesh.userData?.noviraPartName || mesh.name || `Mesh ${mesh.id}`;
            setSelectedSubMeshName(meshName);
            setHighlightedPartNames([meshName]);

            if (useStore.getState().smartZoomEnabled && currentTool === 'select' && Number.isFinite(faceIndex) && hit?.originalEvent?.face) {
                const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
                const worldNormal = hit.originalEvent.face.normal.clone().applyMatrix3(normalMatrix).normalize();

                const box = new THREE.Box3().setFromObject(objectRef.current);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);

                let focusDistance = 1.0;
                if (id !== useStore.getState().interiorObjectId) {

                    focusDistance = Math.min(Math.max(maxDim * 1.5, 0.45), 2.2);
                } else {

                    focusDistance = 1.05;
                }

                const p = worldPoint || [0, 0, 0];
                setCameraFocus([p[0], p[1], p[2]], [
                    p[0] + worldNormal.x * focusDistance,
                    p[1] + worldNormal.y * focusDistance,
                    p[2] + worldNormal.z * focusDistance
                ]);
            }
        }
    };

    const handleSubMeshClick = (hit) => {
        applyMeshPickSelection(hit);
    };

    const handleDoubleClickHandler = (e) => {
        e.stopPropagation();
        if (data.type === 'ground' || locked) return;
        if (data.type === 'gltf' || data.type === 'gltf-part') {
            useStore.getState().selectObject(id);
            useStore.getState().setActiveTool('parts');
            useStore.getState().clearSubMeshSelection();
            return;
        }
        useStore.getState().selectObject(id);
        if (objectRef.current) {
            const box = new THREE.Box3().setFromObject(objectRef.current);
            const center = new THREE.Vector3();
            box.getCenter(center);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            setCameraFocus(
                [center.x, center.y, center.z],
                [center.x, center.y + maxDim * 0.5, center.z + maxDim * 2]
            );
        }
    };

    const handleTransformMouseUp = () => {
        if (!objectRef.current) return;
        if (activeTool === 'move' || activeTool === 'parts') {
            updateObject(id, {
                position: [
                    objectRef.current.position.x,
                    objectRef.current.position.y,
                    objectRef.current.position.z
                ]
            });
        } else if (activeTool === 'rotate') {
            updateObject(id, { rotation: [objectRef.current.rotation.x, objectRef.current.rotation.y, objectRef.current.rotation.z] });
        } else if (activeTool === 'scale') {
            updateObject(id, { scale: [objectRef.current.scale.x, objectRef.current.scale.y, objectRef.current.scale.z] });
        }
    };

    const liftOffset = isLifted ? 0.3 : 0;
    let mainContent = null;
    let ghostContent = null;

    if (data.type === 'light') {
        const lt = data.lightType || 'point';
        const lc = color || '#ffffff';
        const li = data.intensity ?? 1;
        const ld = data.distance ?? 15;
        const la = data.angle ?? Math.PI / 6;

        mainContent = (
            <group
                ref={bindObjectRef}
                position={position}
                rotation={rotation}
                scale={scale}
                onClick={handleClick}
            >
                {lt === 'point' && <pointLight color={lc} intensity={li} distance={ld} castShadow />}
                {lt === 'spot' && <spotLight color={lc} intensity={li} distance={ld} angle={la} penumbra={0.5} castShadow />}
                {lt === 'directional' && <directionalLight color={lc} intensity={li} castShadow shadow-mapSize={[1024, 1024]} />}
                {lt === 'hemisphere' && <hemisphereLight args={[lc, '#3b4252', li]} />}
                <mesh>
                    <sphereGeometry args={[0.12, 12, 12]} />
                    <meshBasicMaterial color={lc} transparent opacity={isSelected ? 1 : 0.7} />
                </mesh>
                {isSelected && (
                    <>
                        <mesh>
                            <sphereGeometry args={[0.22, 16, 16]} />
                            <meshBasicMaterial color={lc} wireframe transparent opacity={0.35} />
                        </mesh>
                        {lt === 'spot' && (
                            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -ld / 2, 0]}>
                                <coneGeometry args={[Math.tan(la) * ld, ld, 16, 1, true]} />
                                <meshBasicMaterial color={lc} wireframe transparent opacity={0.12} />
                            </mesh>
                        )}
                        {lt === 'point' && (
                            <mesh>
                                <sphereGeometry args={[ld * 0.2, 16, 16]} />
                                <meshBasicMaterial color={lc} wireframe transparent opacity={0.08} />
                            </mesh>
                        )}
                    </>
                )}
            </group>
        );
    } else if (data.type === 'ai-hologram') {
        mainContent = (
            <group position={position} rotation={rotation} scale={scale}>
                <mesh>
                    <sphereGeometry args={[1, 32, 32]} />
                    <meshStandardMaterial color="#00e5ff" wireframe transparent opacity={0.5} emissive="#00e5ff" emissiveIntensity={2} />
                </mesh>
                <mesh rotation={[0, Math.PI / 4, 0]}>
                    <torusGeometry args={[1.2, 0.02, 16, 100]} />
                    <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={5} />
                </mesh>
                <pointLight color="#00e5ff" intensity={2} distance={5} />
            </group>
        );
    } else if ((data.type === 'gltf' || data.type === 'gltf-part') && (data.url || (
        (data.source === 'blenderkit' || data.source === 'sketchfab' || data.source === 'free3d') && data.sourceAssetId
    ))) {
        const enableSubMeshInteraction = activeTool === 'parts' || interiorMode || (ctrlPressed && shiftPressed);

        mainContent = (
            <group
                ref={bindObjectRef}
                position={[position[0], position[1] + liftOffset, position[2]]}
                rotation={rotation}
                scale={scale}
                onClick={handleClick}
                onDoubleClick={handleDoubleClickHandler}
            >
                <Suspense fallback={<mesh><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial wireframe color="#00e5ff" transparent opacity={0.5} /></mesh>}>
                    <AutoRecoverModel data={data}>
                    <ModelErrorBoundary>
                        <Model
                            url={data.url}
                            modelName={data.name}
                            wireframeEnabled={wireframe}
                            meshName={data.meshName}
                            materialMaps={data.materialMaps}
                            pivotOffset={data.partPivot}
                            partTransforms={data.partTransforms || null}
                            isSelected={isSelected}
                            objectId={id}
                            meshElementSelection={meshElementSelection}
                            selectionMeshId={selectedMeshId}
                            highlightedPartNames={highlightedPartNames}
                            isDismantleModalOpen={isDismantleModalOpen}
                            enableSubMeshInteraction={enableSubMeshInteraction}
                            onSubMeshClick={handleSubMeshClick}
                            hiddenMeshNames={hiddenMeshNames}
                            isDismantleShortcut={ctrlPressed && shiftPressed}
                            castShadows={data.castShadows}
                            receiveShadows={data.receiveShadows}
                            onLoaded={({ parts, totalMeshCount, dimensions, originalDimensions }) => {
                                const updates = {};
                                if (parts && parts.length > 0 && (!data.parts || data.parts.length === 0)) {
                                    updates.parts = parts;
                                }
                                if (totalMeshCount && !data.totalMeshCount) {
                                    updates.totalMeshCount = totalMeshCount;
                                }

                                const currentDims = data.dimensions || [1, 1, 1];
                                const isDefault = Math.abs(currentDims[0] - 1) < 0.001 &&
                                                Math.abs(currentDims[1] - 1) < 0.001 &&
                                                Math.abs(currentDims[2] - 1) < 0.001;

                                if (dimensions && (!data.dimensions || isDefault)) {
                                    updates.dimensions = dimensions;
                                }

                                if (originalDimensions && (!data.originalDimensions)) {
                                    updates.originalDimensions = originalDimensions;
                                }

                                if (Object.keys(updates).length > 0) {
                                    useStore.getState().updateObject(id, updates);
                                }
                            }}
                        />
                    </ModelErrorBoundary>
                    </AutoRecoverModel>
                </Suspense>
                {isLifted && (
                    <mesh ref={liftRingRef} position={[0, -liftOffset, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[2, 0.04, 8, 48]} />
                        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={3} transparent opacity={0.7} />
                    </mesh>
                )}
            </group>
        );

        if (isLifted && liftOrigin) {
            const ox = liftOrigin[0], oy = liftOrigin[1], oz = liftOrigin[2];
            ghostContent = (
                <>
                    <mesh position={[ox, oy + 0.4, oz]}>
                        <cylinderGeometry args={[0.02, 0.02, 0.8, 6]} />
                        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2} transparent opacity={0.6} />
                    </mesh>
                    <mesh position={[ox, oy + 0.01, oz]} rotation={[-Math.PI / 2, 0, 0]}>
                        <circleGeometry args={[0.25, 24]} />
                        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={3} transparent opacity={0.7} />
                    </mesh>
                    <line>
                        <bufferGeometry attach="geometry" {...{ attributes: new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ox, oy, oz), new THREE.Vector3(position[0], oy, position[2])]).attributes }} />
                        <lineBasicMaterial color="#38bdf8" transparent opacity={0.8} />
                    </line>
                    <Html position={[0, dimensions[1] / 2 + 0.5, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
                        <div className="drag-distance-label">
                            {Math.sqrt(Math.pow((position[0] - ox) * 100, 2) + Math.pow((position[2] - oz) * 100, 2)).toFixed(1)}
                            <span style={{ fontSize: '0.7em', marginLeft: '2px', opacity: 0.8 }}>cm</span>
                        </div>
                    </Html>
                </>
            );
        }
    } else if (data.type === 'stl' && (data.url || (
        (data.source === 'blenderkit' || data.source === 'sketchfab' || data.source === 'free3d') && data.sourceAssetId
    ))) {
        mainContent = (
            <group
                ref={bindObjectRef}
                position={[position[0], position[1] + liftOffset, position[2]]}
                rotation={rotation}
                scale={scale}
                onClick={handleClick}
                onDoubleClick={handleDoubleClickHandler}
            >
                <Suspense fallback={<mesh><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial wireframe color="#00e5ff" transparent opacity={0.5} /></mesh>}>
                    <AutoRecoverModel data={data}>
                        <ModelErrorBoundary>
                            <StlModel
                                url={data.url}
                                wireframeEnabled={wireframe}
                                castShadows={data.castShadows}
                                receiveShadows={data.receiveShadows}
                                meshEditState={data.meshEditState || null}
                                baseColor={color || '#94a3b8'}
                                onMeshClick={(e) => {
                                    if (useStore.getState().activeTool !== 'parts') return;
                                    e.stopPropagation();
                                    applyMeshPickSelection({
                                        mesh: e.object,
                                        faceIndex: Number.isFinite(e.faceIndex) ? e.faceIndex : null,
                                        point: e.point ? [e.point.x, e.point.y, e.point.z] : null,
                                        originalEvent: e,
                                    });
                                }}
                                onLoaded={({ parts, totalMeshCount, dimensions, originalDimensions }) => {
                                    const updates = {};
                                    if (parts && parts.length > 0 && (!data.parts || data.parts.length === 0)) {
                                        updates.parts = parts;
                                    }
                                    if (totalMeshCount && !data.totalMeshCount) {
                                        updates.totalMeshCount = totalMeshCount;
                                    }
                                    const currentDims = data.dimensions || [1, 1, 1];
                                    const isDefault = Math.abs(currentDims[0] - 1) < 0.001
                                        && Math.abs(currentDims[1] - 1) < 0.001
                                        && Math.abs(currentDims[2] - 1) < 0.001;
                                    if (dimensions && (!data.dimensions || isDefault)) {
                                        updates.dimensions = dimensions;
                                    }
                                    if (originalDimensions && !data.originalDimensions) {
                                        updates.originalDimensions = originalDimensions;
                                    }
                                    if (Object.keys(updates).length > 0) {
                                        useStore.getState().updateObject(id, updates);
                                    }
                                }}
                            />
                        </ModelErrorBoundary>
                    </AutoRecoverModel>
                </Suspense>
                {isLifted && (
                    <mesh ref={liftRingRef} position={[0, -liftOffset, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[2, 0.04, 8, 48]} />
                        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={3} transparent opacity={0.7} />
                    </mesh>
                )}
            </group>
        );

        if (isLifted && liftOrigin) {
            const ox = liftOrigin[0], oy = liftOrigin[1], oz = liftOrigin[2];
            ghostContent = (
                <>
                    <mesh position={[ox, oy + 0.4, oz]}>
                        <cylinderGeometry args={[0.02, 0.02, 0.8, 6]} />
                        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2} transparent opacity={0.6} />
                    </mesh>
                    <mesh position={[ox, oy + 0.01, oz]} rotation={[-Math.PI / 2, 0, 0]}>
                        <circleGeometry args={[0.25, 24]} />
                        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={3} transparent opacity={0.7} />
                    </mesh>
                    <line>
                        <bufferGeometry attach="geometry" {...{ attributes: new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ox, oy, oz), new THREE.Vector3(position[0], oy, position[2])]).attributes }} />
                        <lineBasicMaterial color="#38bdf8" transparent opacity={0.8} />
                    </line>
                    <Html position={[0, dimensions[1] / 2 + 0.5, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
                        <div className="drag-distance-label">
                            {Math.sqrt(Math.pow((position[0] - ox) * 100, 2) + Math.pow((position[2] - oz) * 100, 2)).toFixed(1)}
                            <span style={{ fontSize: '0.7em', marginLeft: '2px', opacity: 0.8 }}>cm</span>
                        </div>
                    </Html>
                </>
            );
        }
    } else {
        const geoType = data.geo || 'box';
        const d = dimensions;
        const radialSegments = data.radialSegments || 32;
        const widthSegments = data.widthSegments || (geoType === 'sphere' ? 16 : 1);
        const tubeRadius = data.tubeRadius || (d[0] / 4);

        let geoContent;
        if (geoType === 'sphere') geoContent = <sphereGeometry args={[d[0] / 2, radialSegments, widthSegments]} />;
        else if (geoType === 'cylinder') geoContent = <cylinderGeometry args={[d[0] / 2, d[0] / 2, d[1], radialSegments]} />;
        else if (geoType === 'torus') geoContent = <torusGeometry args={[d[0] / 2, tubeRadius, 16, radialSegments]} />;
        else if (geoType === 'cone') geoContent = <coneGeometry args={[d[0] / 2, d[1], radialSegments]} />;
        else if (geoType === 'plane') geoContent = <planeGeometry args={[d[0], d[2], widthSegments, widthSegments]} />;
        else geoContent = <boxGeometry args={[d[0], d[1], d[2], widthSegments, widthSegments, widthSegments]} />;

        const hasModifiers = data.modifiers && data.modifiers.length > 0;

        let primitiveBaseGeometry = null;
        let primitiveEdited = null;
        if (!hasModifiers) {
            if (geoType === 'sphere') primitiveBaseGeometry = new THREE.SphereGeometry(d[0] / 2, radialSegments, widthSegments);
            else if (geoType === 'cylinder') primitiveBaseGeometry = new THREE.CylinderGeometry(d[0] / 2, d[0] / 2, d[1], radialSegments);
            else if (geoType === 'torus') primitiveBaseGeometry = new THREE.TorusGeometry(d[0] / 2, tubeRadius, 16, radialSegments);
            else if (geoType === 'cone') primitiveBaseGeometry = new THREE.ConeGeometry(d[0] / 2, d[1], radialSegments);
            else if (geoType === 'plane') primitiveBaseGeometry = new THREE.PlaneGeometry(d[0], d[2], widthSegments, widthSegments);
            else primitiveBaseGeometry = new THREE.BoxGeometry(d[0], d[1], d[2], widthSegments, widthSegments, widthSegments);
            primitiveEdited = applyMeshEditStateToGeometry(primitiveBaseGeometry, data.meshEditState || null, color || '#e2e8f0');
        }

        let finalGeometry = geoContent;
        if (hasModifiers) {
            finalGeometry = (
                <Geometry>
                    <Base>{geoContent}</Base>
                    {data.modifiers.map((mod, idx) => {
                        const target = objectLookup.get(mod.targetId);
                        if (!target || target.isDismantled) return null;

                        const tgtGeoType = target.geo || 'box';
                        const tD = target.dimensions || [1, 1, 1];
                        const tRs = target.radialSegments || 32;
                        const tWs = target.widthSegments || (tgtGeoType === 'sphere' ? 16 : 1);
                        const tTr = target.tubeRadius || (tD[0] / 4);

                        let targetGeo;
                        if (tgtGeoType === 'sphere') targetGeo = <sphereGeometry args={[tD[0] / 2, tRs, tWs]} />;
                        else if (tgtGeoType === 'cylinder') targetGeo = <cylinderGeometry args={[tD[0] / 2, tD[0] / 2, tD[1], tRs]} />;
                        else if (tgtGeoType === 'torus') targetGeo = <torusGeometry args={[tD[0] / 2, tTr, 16, tRs]} />;
                        else if (tgtGeoType === 'cone') targetGeo = <coneGeometry args={[tD[0] / 2, tD[1], tRs]} />;
                        else if (tgtGeoType === 'plane') targetGeo = <planeGeometry args={[tD[0], tD[2], tWs, tWs]} />;
                        else targetGeo = <boxGeometry args={[tD[0], tD[1], tD[2], tWs, tWs, tWs]} />;

                        const tgtPos = target.position || [0, 0, 0];
                        const myPos = position || [0, 0, 0];

                        const relPos = [
                            tgtPos[0] - myPos[0],
                            tgtPos[1] - myPos[1],
                            tgtPos[2] - myPos[2]
                        ];

                        const relRot = [
                            (target.rotation?.[0] || 0) - (rotation?.[0] || 0),
                            (target.rotation?.[1] || 0) - (rotation?.[1] || 0),
                            (target.rotation?.[2] || 0) - (rotation?.[2] || 0)
                        ];

                        const OpComponent = mod.type === 'union' ? Addition : mod.type === 'intersect' ? Intersection : Subtraction;

                        return (
                            <OpComponent key={idx} position={relPos} rotation={relRot} scale={target.scale || [1,1,1]}>
                                {targetGeo}
                            </OpComponent>
                        );
                    })}
                </Geometry>
            );
        }

        mainContent = (
            <mesh
                ref={bindObjectRef}
                position={[position[0], position[1] + liftOffset, position[2]]}
                rotation={rotation}
                scale={scale}
                castShadow={data.castShadows !== false}
                receiveShadow={data.receiveShadows !== false}
                onClick={(e) => {
                    handleClick(e);
                    if (useStore.getState().activeTool !== 'parts') return;
                    applyMeshPickSelection({
                        mesh: e.object,
                        faceIndex: Number.isFinite(e.faceIndex) ? e.faceIndex : null,
                        point: e.point ? [e.point.x, e.point.y, e.point.z] : null,
                        originalEvent: e,
                    });
                }}
                onDoubleClick={handleDoubleClickHandler}
            >
                {hasModifiers ? (
                    finalGeometry
                ) : (
                    <primitive object={primitiveEdited?.geometry || primitiveBaseGeometry} attach="geometry" />
                )}
                {onlinePrimitiveMaps ? (
                    <meshStandardMaterial
                        {...r3fTextureSlotProps(onlinePrimitiveMaps)}
                        color={isColliding ? '#ef4444' : isLifted ? '#f97316' : isSelected ? '#6366f1' : (onlinePrimitiveMaps.diffuse ? '#ffffff' : color)}
                        vertexColors={!!primitiveEdited?.vertexColors}
                        roughness={onlinePrimitiveMaps.roughness ? 1 : (data.roughness ?? 0.3)}
                        metalness={onlinePrimitiveMaps.metalness ? 1 : (data.metalness ?? 0.2)}
                        aoMapIntensity={onlinePrimitiveMaps.ao ? 1 : 0}
                        displacementScale={onlinePrimitiveMaps.displacement ? 0.02 : 0}
                        displacementBias={0}
                        wireframe={wireframe}
                        emissive={isColliding ? '#ef4444' : isLifted ? '#f97316' : (data.emissive || '#000000')}
                        emissiveIntensity={isColliding ? 0.6 : isLifted ? 0.4 : (data.emissive && data.emissive !== '#000000' ? 1.5 : 0)}
                        transparent={data.opacity !== undefined && data.opacity < 1}
                        opacity={data.opacity ?? 1}
                        side={interiorMode ? THREE.DoubleSide : THREE.FrontSide}
                    />
                ) : (
                    <meshStandardMaterial
                        color={isColliding ? '#ef4444' : isLifted ? '#f97316' : isSelected ? '#6366f1' : color}
                        vertexColors={!!primitiveEdited?.vertexColors}
                        roughness={data.roughness ?? 0.3} metalness={data.metalness ?? 0.2} wireframe={wireframe}
                        emissive={isColliding ? '#ef4444' : isLifted ? '#f97316' : (data.emissive || '#000000')}
                        emissiveIntensity={isColliding ? 0.6 : isLifted ? 0.4 : (data.emissive && data.emissive !== '#000000' ? 1.5 : 0)}
                        transparent={data.opacity !== undefined && data.opacity < 1}
                        opacity={data.opacity ?? 1}
                        side={interiorMode ? THREE.DoubleSide : THREE.FrontSide}
                    />
                )}
                {isLifted && (
                    <mesh ref={liftRingRef} position={[0, -liftOffset - dimensions[1] / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[Math.max(dimensions[0], dimensions[2]) * 0.8, 0.04, 8, 48]} />
                        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={3} transparent opacity={0.7} />
                    </mesh>
                )}
            </mesh>
        );

        if (isLifted && liftOrigin) {
            const ox = liftOrigin[0], oy = liftOrigin[1], oz = liftOrigin[2];
            ghostContent = (
                <>
                    <mesh position={[ox, oy - dimensions[1] / 2 + 0.01, oz]} rotation={[-Math.PI / 2, 0, 0]}>
                        <circleGeometry args={[Math.max(dimensions[0], dimensions[2]) * 0.6, 24]} />
                        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={3} transparent opacity={0.6} />
                    </mesh>
                    <line>
                        <bufferGeometry attach="geometry" {...{ attributes: new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ox, oy, oz), new THREE.Vector3(position[0], oy, position[2])]).attributes }} />
                        <lineBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                    </line>
                    <Html position={[0, dimensions[1] / 2 + 0.4, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
                        <div className="drag-distance-label">
                            {Math.sqrt(Math.pow((position[0] - ox) * 100, 2) + Math.pow((position[2] - oz) * 100, 2)).toFixed(1)}
                            <span style={{ fontSize: '0.7em', marginLeft: '2px', opacity: 0.8 }}>cm</span>
                        </div>
                    </Html>
                </>
            );
        }
    }

    const parentConnector = parentObject ? (() => {
        const from = new THREE.Vector3(position[0], position[1], position[2]);
        const to = new THREE.Vector3(parentObject.position[0], parentObject.position[1], parentObject.position[2]);
        const dir = to.clone().sub(from);
        const len = dir.length();
        const mid = from.clone().add(dir.clone().multiplyScalar(0.5));
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        const euler = new THREE.Euler().setFromQuaternion(q);

        const doBreak = (e) => {
            e.stopPropagation();
            useStore.getState().breakParent(id);
        };

        return (
            <>
                <line>
                    <bufferGeometry attach="geometry" {...{ attributes: new THREE.BufferGeometry().setFromPoints([from, to]).attributes }} />
                    <lineBasicMaterial color="#34d399" transparent opacity={0.5} />
                </line>
                <mesh position={[mid.x, mid.y, mid.z]} rotation={[euler.x, euler.y, euler.z]} onClick={doBreak} onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'default'; }}>
                    <cylinderGeometry args={[0.12, 0.12, len, 6]} />
                    <meshStandardMaterial transparent opacity={0} />
                </mesh>
                <BreakSphere position={[mid.x, mid.y + 0.25, mid.z]} onBreak={doBreak} />
            </>
        );
    })() : null;

    const showSelectionBounds = isSelected && !!transformTarget && !isLifted
        && !(activeTool === 'parts' && meshEditSelectMode === 'part' && meshElementSelection?.objectId === id && meshElementSelection?.type === 'part');

    return (
        <>
            {mainContent}
            {ghostContent}
            {parentConnector}
            <SelectionBoundsHelper root={transformTarget} visible={showSelectionBounds} />

            {isSelected && isTransformTool && isMounted && !isLifted && transformAttachOk && transformTarget
                && !(activeTool === 'parts' && meshEditSelectMode === 'part' && meshElementSelection?.objectId === id && meshElementSelection?.type === 'part' && partTcReady)
                && (
                    <TransformControls
                        key={`tc-${id}`}
                        object={transformTarget}
                        enabled={transformAttachOk}
                        space={transformSpace}
                        mode={activeTool === 'parts' ? 'translate' : (activeTool === 'move' ? 'translate' : activeTool)}
                        translationSnap={translationSnap}
                        scaleSnap={scaleSnap}
                        rotationSnap={rotationSnapVal}
                        showX={!axisConstraintWhenSelected || axisConstraintWhenSelected === 'x'}
                        showY={!axisConstraintWhenSelected || axisConstraintWhenSelected === 'y'}
                        showZ={!axisConstraintWhenSelected || axisConstraintWhenSelected === 'z'}
                        onDraggingChanged={(e) => {
                            useStore.getState().setIsTransformDragging(e.value);
                            if (e.value) {
                                useStore.getState().saveHistory(id);
                            } else {
                                handleTransformMouseUp();
                            }
                        }}
                        onMouseUp={handleTransformMouseUp}
                    />
                )
            }

            {isSelected && activeTool === 'parts' && meshEditSelectMode === 'part'
                && meshElementSelection?.objectId === id && meshElementSelection?.type === 'part'
                && partTcReady && partTransformObject && !isLifted
                && (
                    <TransformControls
                        key={`tc-part-${id}-${(meshElementSelection?.meshOrdinals || []).join('-')}-${meshEditTransformMode}`}
                        object={partTransformObject}
                        enabled={!!partTransformObject}
                        space={transformSpace}
                        mode={meshEditTransformMode}
                        translationSnap={translationSnap}
                        scaleSnap={scaleSnap}
                        rotationSnap={rotationSnapVal}
                        showX={!axisConstraintWhenSelected || axisConstraintWhenSelected === 'x'}
                        showY={!axisConstraintWhenSelected || axisConstraintWhenSelected === 'y'}
                        showZ={!axisConstraintWhenSelected || axisConstraintWhenSelected === 'z'}
                        onDraggingChanged={(e) => {
                            useStore.getState().setIsTransformDragging(e.value);
                            if (e.value) {
                                useStore.getState().saveHistory(id);
                            } else {
                                handlePartTransformMouseUp();
                            }
                        }}
                    />
                )
            }

        </>
    );
}

export default React.memo(SceneObject, sceneObjectPropsAreEqual);
