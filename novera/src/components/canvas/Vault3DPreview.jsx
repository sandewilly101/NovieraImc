import React, { Suspense, useMemo, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Center, Resize, Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getProxyModelUrl } from '../../utils/proxyModelUrl';

const Model = ({ url, onLoaded }) => {
    const proxiedUrl = React.useMemo(() => {
        if (
            url?.includes('tripo') ||
            url?.includes('tripo3d') ||
            url?.includes('amazonaws.com') ||
            url?.includes('r2.cloudflarestorage.com')
        ) {
            return getProxyModelUrl(url);
        }
        return url;
    }, [url]);

    const { scene } = useGLTF(proxiedUrl);

    const clonedScene = useMemo(() => {
        const clone = scene.clone();

        const box = new THREE.Box3().setFromObject(clone);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        clone.position.x -= center.x;
        clone.position.y -= box.min.y;
        clone.position.z -= center.z;

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const s = 1.0 / maxDim;
            clone.scale.set(s, s, s);
        }

        clone.traverse(child => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.side = THREE.DoubleSide;
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.needsUpdate = true;
            }
        });

        if (onLoaded) setTimeout(onLoaded, 100);
        return clone;
    }, [scene, onLoaded]);

    return (
        <group scale={3.2}>
            <primitive object={clonedScene} />
        </group>
    );
};

export default function Vault3DPreview({ url, thumbnailUrl, fallbackIcon: FallbackIcon }) {
    const [isLoaded, setIsLoaded] = React.useState(false);

    useEffect(() => {
        if (!url && thumbnailUrl) setIsLoaded(true);
    }, [url, thumbnailUrl]);

    if (!url && !thumbnailUrl) {
        return (
            <div className="vault-3d-placeholder">
                <FallbackIcon style={{ width: 40, height: 40, opacity: 0.15 }} />
            </div>
        );
    }

    return (
        <div className="vault-3d-canvas-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
            {(!isLoaded && thumbnailUrl) && (
                <img
                    src={thumbnailUrl}
                    alt="Preview"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 1
                    }}
                />
            )}

            {url && (
                <Canvas camera={{ position: [5, 5, 5], fov: 40 }} gl={{ antialias: true, alpha: true }}>
                    <ambientLight intensity={1.2} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} />
                    <Suspense fallback={null}>
                        <Model url={url} onLoaded={() => setIsLoaded(true)} />
                        <Environment preset="studio" />
                    </Suspense>
                    <OrbitControls
                        makeDefault
                        autoRotate={false}
                        autoRotateSpeed={4}
                        enablePan={false}
                        enableZoom={true}
                        minDistance={2}
                        maxDistance={10}
                    />
                </Canvas>
            )}
        </div>
    );
}
