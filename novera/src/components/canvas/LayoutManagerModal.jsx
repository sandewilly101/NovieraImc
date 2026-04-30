import React, { Suspense, useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, useGLTF, Environment, OrbitControls, Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ViewColumnsIcon, AdjustmentsHorizontalIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';
import { getProxyModelUrl } from '../../utils/proxyModelUrl';

class ModelErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return (
                <Html center>
                    <div style={{ background: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                        LOAD ERROR
                    </div>
                </Html>
            );
        }
        return this.props.children;
    }
}

const SectionModel = ({ url, clipHeight }) => {
    const proxiedUrl = useMemo(() => {
        if (!url) return null;
        const needsProxy =
            url.includes('tripo') ||
            url.includes('tripo3d') ||
            url.includes('amazonaws.com') ||
            url.includes('r2.cloudflarestorage.com');
        if (needsProxy) {
            return getProxyModelUrl(url);
        }
        return url;
    }, [url]);

    const { scene } = useGLTF(proxiedUrl);

    const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), clipHeight), [clipHeight]);

    const clonedScene = useMemo(() => {
        const clone = scene.clone();

        const fullBox = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        fullBox.getSize(size);
        fullBox.getCenter(center);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = maxDim > 3 ? 10 : 1;
        const s = maxDim > 0 ? targetScale / maxDim : 1;

        clone.position.x -= center.x;
        clone.position.z -= center.z;
        clone.position.y -= fullBox.min.y;
        clone.scale.set(s, s, s);
        clone.position.x *= s;
        clone.position.y *= s;
        clone.position.z *= s;

        clone.traverse(child => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.clippingPlanes = [clippingPlane];
                child.material.clipShadows = true;
                child.material.side = THREE.DoubleSide;
            }
        });
        return clone;
    }, [scene, clippingPlane]);

    return <primitive object={clonedScene} />;
};

const PDFOverlay = ({ url, opacity }) => {
    const texture = useMemo(() => {
        if (!url) return null;
        const loader = new THREE.TextureLoader();
        return loader.load(url);
    }, [url]);

    if (!texture) return null;

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <planeGeometry args={[10, 10]} />
            <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
        </mesh>
    );
};

const DimensionMarker = ({ dim, onUpdate, onRemove }) => {
    return (
        <Html position={dim.position}>
            <div className="layout-marker" style={{
                background: 'rgba(59, 130, 246, 0.9)',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                cursor: 'move',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.2)'
            }}>
                <span>{dim.text}</span>
                <button onClick={() => onRemove(dim.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0 2px' }}>×</button>
            </div>
        </Html>
    );
};

export default function LayoutManagerModal() {
    const {
        layoutManagerOpen,
        layoutManagerTargetId,
        setLayoutManagerOpen,
        objects,
        layoutDimensions,
        updateLayoutDimension,
        removeLayoutDimension,
        layoutOverlays,
    } = useStore(
        useShallow((s) => ({
            layoutManagerOpen: s.layoutManagerOpen,
            layoutManagerTargetId: s.layoutManagerTargetId,
            setLayoutManagerOpen: s.setLayoutManagerOpen,
            objects: s.objects,
            layoutDimensions: s.layoutDimensions,
            updateLayoutDimension: s.updateLayoutDimension,
            removeLayoutDimension: s.removeLayoutDimension,
            layoutOverlays: s.layoutOverlays,
        }))
    );
    const [clipHeight, setClipHeight] = useState(1.2);
    const [overlayOpacity, setOverlayOpacity] = useState(0.5);
    const targetBuilding = objects.find(o => o.id === layoutManagerTargetId);
    const activeOverlay = layoutOverlays[0];

    if (!layoutManagerOpen || !targetBuilding) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="layout-manager-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(15, 27, 45, 0.9)', backdropFilter: 'blur(12px)',
                    zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <div style={{
                    background: '#0f172a', width: '95vw', height: '90vh', borderRadius: '24px',
                    display: 'flex', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 50px 100px rgba(0,0,0,0.5)'
                }}>

                    <div style={{ flex: 1, position: 'relative', background: '#020617' }}>
                        <Canvas gl={{ localClippingEnabled: true }}>
                            <OrthographicCamera makeDefault position={[0, 10, 0]} zoom={100} up={[0, 0, -1]} />
                            <ambientLight intensity={1.5} />
                            <pointLight position={[5, 10, 5]} intensity={2} />

                            <Suspense fallback={null}>
                                <ModelErrorBoundary>
                                    <SectionModel url={targetBuilding.url} clipHeight={clipHeight} />
                                </ModelErrorBoundary>
                                {activeOverlay && <PDFOverlay url={activeOverlay.url} opacity={overlayOpacity} />}

                                {layoutDimensions.map(dim => (
                                    <DimensionMarker
                                        key={dim.id}
                                        dim={dim}
                                        onUpdate={(pos) => updateLayoutDimension(dim.id, { position: pos })}
                                        onRemove={removeLayoutDimension}
                                    />
                                ))}
                                <Environment preset="city" />
                            </Suspense>

                            <OrbitControls
                                enableRotate={false}
                                enableZoom={true}
                                enablePan={true}
                                mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
                            />
                        </Canvas>

                        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '10px', pointerEvents: 'none' }}>
                            LEFT CLICK TO PAN • SCROLL TO ZOOM
                        </div>
                    </div>

                    <div style={{ width: '350px', background: '#1e293b', borderLeft: '1px solid rgba(255,255,255,0.1)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 800 }}>Layout Manager</h2>
                            <button onClick={() => setLayoutManagerOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '12px', cursor: 'pointer' }}>
                                <XMarkIcon style={{ width: 20, height: 20 }} />
                            </button>
                        </div>

                        <div className="control-group">
                            <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px' }}>
                                2D Section View
                            </label>
                            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#e2e8f0', fontSize: '12px' }}>Cut Height</span>
                                        <span style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 700 }}>{clipHeight.toFixed(1)}m</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="10" step="0.1"
                                        value={clipHeight} onChange={(e) => setClipHeight(parseFloat(e.target.value))}
                                        style={{ width: '100%', accentColor: '#3b82f6' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="control-group">
                            <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px' }}>
                                PDF Overlay
                            </label>
                            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#e2e8f0', fontSize: '12px' }}>Opacity</span>
                                        <span style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 700 }}>{(overlayOpacity * 100).toFixed(0)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={overlayOpacity} onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                                        style={{ width: '100%', accentColor: '#3b82f6' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="control-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px' }}>
                                Dimensions ({layoutDimensions.length})
                            </label>
                            <div style={{ flex: 1, overflowY: 'auto', background: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '8px' }}>
                                {layoutDimensions.map(dim => (
                                    <div key={dim.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                                        <span style={{ color: '#e2e8f0', fontSize: '11px', flex: 1 }}>{dim.text}</span>
                                        <button onClick={() => removeLayoutDimension(dim.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                            <TrashIcon style={{ width: 14, height: 14 }} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setLayoutManagerOpen(false)}
                            style={{
                                width: '100%', padding: '14px', borderRadius: '14px', background: '#3b82f6', color: 'white',
                                border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'
                            }}
                        >
                            <CheckIcon style={{ width: 18, height: 18 }} />
                            Sync to Scene
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
