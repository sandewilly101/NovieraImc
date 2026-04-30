import React, { useEffect, useState } from 'react';
import { Environment, Clouds, Cloud, Sky } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import useStore from '../../store/useStore';

const DREI_PRESETS = ['apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'studio', 'sunset', 'warehouse'];

function bufferLooksLikeRadianceHdr(buffer) {
    const head = new TextDecoder('ascii', { fatal: false }).decode(new Uint8Array(buffer.slice(0, 2048)));
    return /#\?RADIANCE/i.test(head) || head.includes('RADIANCE');
}

function BlobHdriEnvironment({ url }) {
    const [texture, setTexture] = useState(null);
    const gl = useThree(s => s.gl);

    useEffect(() => {
        if (!url) { setTexture(null); return undefined; }

        let cancelled = false;
        const pmrem = new THREE.PMREMGenerator(gl);
        pmrem.compileEquirectangularShader();

        fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error(`HDR fetch HTTP ${r.status}`);
                return r.arrayBuffer();
            })
            .then((buffer) => {
                if (cancelled) return;
                if (!bufferLooksLikeRadianceHdr(buffer)) {
                    throw new Error('Not Radiance HDR data (wrong file type or truncated download).');
                }
                /** `RGBELoader.parse` returns `{ width, height, data, type, … }`, not a `DataTexture` (see `DataTextureLoader` in three.js). */
                const loader = new RGBELoader();
                let texData;
                try {
                    texData = loader.parse(buffer);
                } catch (e) {
                    throw new Error(e?.message || 'RGBELoader.parse failed');
                }
                if (!texData?.width || !texData?.height || !texData?.data) {
                    throw new Error('HDR decode produced no dimensions');
                }
                const hdrTexture = new THREE.DataTexture(
                    texData.data,
                    texData.width,
                    texData.height,
                    THREE.RGBAFormat,
                    texData.type
                );
                hdrTexture.colorSpace = THREE.LinearSRGBColorSpace;
                hdrTexture.minFilter = THREE.LinearFilter;
                hdrTexture.magFilter = THREE.LinearFilter;
                hdrTexture.generateMipmaps = false;
                hdrTexture.flipY = true;
                hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
                hdrTexture.needsUpdate = true;
                const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
                hdrTexture.dispose();
                pmrem.dispose();
                if (!cancelled) setTexture(envMap);
            })
            .catch((err) => {
                console.error('[EnvSystem] Failed to load HDR blob:', err);
                try { pmrem.dispose(); } catch (_) { /* noop */ }
                if (!cancelled) {
                    setTexture((prev) => {
                        if (prev) prev.dispose();
                        return null;
                    });
                    useStore.getState().setCustomHdriUrl(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [url, gl]);

    if (!texture) return <Environment preset="apartment" />;
    return <Environment map={texture} />;
}

export default function EnvSystem() {
    const envPreset = useStore(s => s.envPreset);
    const customHdriUrl = useStore(s => s.customHdriUrl);

    const isBuiltInPreset = DREI_PRESETS.includes(envPreset);

    return (
        <>
            <Sky
                distance={450000}
                sunPosition={[100, 10, 100]}
                turbidity={0.1}
                rayleigh={0.5}
                mieCoefficient={0.005}
                mieDirectionalG={0.8}
            />

            <Clouds material={THREE.MeshLambertMaterial} limit={400} range={1000}>
                <Cloud seed={1} bounds={[500, 10, 50]} scale={0.5} color="#ffffff" position={[0, 15, -400]} volume={10} opacity={0.3} growth={10} speed={0} fade={100} />
                <Cloud seed={42} bounds={[200, 20, 200]} scale={1} color="#f8fafc" position={[100, 40, -200]} volume={5} opacity={0.1} speed={0} />
                <Cloud seed={100} bounds={[300, 10, 300]} scale={0.8} color="#ffffff" position={[-150, 30, -300]} volume={8} opacity={0.15} speed={0} />
            </Clouds>

            {customHdriUrl ? (
                <BlobHdriEnvironment url={customHdriUrl} />
            ) : (
                <Environment preset={isBuiltInPreset ? envPreset : 'apartment'} />
            )}

            <hemisphereLight intensity={0.6} color="#bae6fd" groundColor="#334155" />
            <directionalLight
                position={[100, 100, 100]}
                intensity={1.5}
                color="#fff7ed"
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-bias={-0.0001}
                shadow-normalBias={0.02}
            />
            <ambientLight intensity={0.4} />
        </>
    );
}
