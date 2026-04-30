import React, { Suspense, useMemo, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Center } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import { assetProxyUrl } from '../../utils/sketchfabLoader';

function PreviewGltf({ url }) {
    const { scene } = useGLTF(url);
    const clone = useMemo(() => scene.clone(), [scene]);
    return (
        <Center>
            <primitive object={clone} />
        </Center>
    );
}

function PreviewStl({ url }) {
    const geometry = useLoader(STLLoader, url);
    const geo = useMemo(() => {
        const g = geometry.clone();
        g.center();
        g.computeVertexNormals();
        return g;
    }, [geometry]);
    useEffect(() => () => geo.dispose(), [geo]);
    return (
        <Center>
            <mesh geometry={geo}>
                <meshStandardMaterial color="#94a3b8" metalness={0.22} roughness={0.55} side={THREE.DoubleSide} />
            </mesh>
        </Center>
    );
}

function PreviewScene({ src, kind }) {
    if (kind === 'stl') return <PreviewStl url={src} />;
    return <PreviewGltf url={src} />;
}

/**
 * Fullscreen glTF/GLB/STL preview using the same asset proxy as downloads (CORS-safe).
 */
export default function ModelPreviewModal({ title, modelUrl, format, onClose }) {
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

    const kind = useMemo(() => {
        const f = (format || '').toLowerCase();
        if (f === 'stl') return 'stl';
        const u = (modelUrl || '').toLowerCase();
        if (u.endsWith('.stl') || u.includes('.stl?')) return 'stl';
        return 'gltf';
    }, [format, modelUrl]);

    const proxiedSrc = useMemo(() => (modelUrl ? assetProxyUrl(modelUrl) : ''), [modelUrl]);

    if (!proxiedSrc) return null;

    return (
        <div
            className="sketchfab-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="model-preview-title"
            onClick={onClose}
        >
            <div
                className="sketchfab-preview-modal__dialog"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sketchfab-preview-modal__header">
                    <h2 id="model-preview-title" className="sketchfab-preview-modal__title">{title || 'Preview'}</h2>
                    <button type="button" className="sketchfab-preview-modal__close" onClick={onClose} aria-label="Close preview">
                        ×
                    </button>
                </div>
                <div className="sketchfab-preview-modal__frame" style={{ padding: 0, background: '#0f172a' }}>
                    <Canvas
                        key={proxiedSrc + kind}
                        camera={{ position: [2.2, 1.6, 2.6], fov: 45 }}
                        gl={{ antialias: true, alpha: true }}
                        style={{ width: '100%', height: '100%', display: 'block' }}
                    >
                        <color attach="background" args={['#0f172a']} />
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[4, 6, 4]} intensity={1.1} castShadow />
                        <Suspense fallback={null}>
                            <PreviewScene src={proxiedSrc} kind={kind} />
                            <Environment preset="city" />
                        </Suspense>
                        <OrbitControls makeDefault minDistance={0.4} maxDistance={40} />
                    </Canvas>
                </div>
            </div>
        </div>
    );
}
