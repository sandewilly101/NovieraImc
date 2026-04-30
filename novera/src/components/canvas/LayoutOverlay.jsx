import { useEffect } from 'react';
import { useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../../store/useStore';

export default function LayoutOverlay({ data }) {
    const { url, position, rotation, scale, opacity, id } = data;
    const selectedId = useStore(s => s.selectedId);
    const setSelectedId = useStore(s => s.setSelectedId);
    const layoutEnabled = useStore(s => s.layoutEnabled);
    const layoutDimensions = useStore(s => s.layoutDimensions);

    const texture = useTexture(url);

    useEffect(() => {
        if (texture) {
            texture.anisotropy = 16;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
        }
    }, [texture]);

    if (!layoutEnabled) return null;

    const isSelected = selectedId === id;

    const handleClick = (e) => {
        e.stopPropagation();
        setSelectedId(id);
    };

    const overlayDims = layoutDimensions.filter(d => d.overlayId === id);

    const labelStyle = {
        background: 'rgba(30, 41, 59, 0.9)',
        color: '#ffffff',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        border: '1px solid rgba(56, 189, 248, 0.5)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        fontFamily: "'JetBrains Mono', monospace"
    };

    const annotationStyle = {
        ...labelStyle,
        background: 'rgba(234, 179, 8, 0.85)',
        borderColor: 'rgba(251, 191, 36, 0.5)',
        color: '#000000',
        fontSize: '8px',
        padding: '1px 5px',
        borderRadius: '2px',
        textTransform: 'uppercase'
    };

    return (
        <group
            position={position}
            rotation={rotation}
            scale={scale}
            onClick={handleClick}
        >
            <mesh receiveShadow>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial
                    map={texture}
                    transparent
                    opacity={opacity}
                    depthWrite={false}
                    polygonOffset
                    polygonOffsetFactor={-1}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {overlayDims.map(dim => {
                const isAnnotation = dim.label.toLowerCase().includes('door') ||
                                     dim.label.toLowerCase().includes('entrance') ||
                                     dim.label.toLowerCase().includes('window');
                return (
                    <group key={dim.id} position={dim.position}>
                        <Html center distanceFactor={10}>
                            <div style={isAnnotation ? annotationStyle : labelStyle}>
                                {dim.label}
                            </div>
                        </Html>
                    </group>
                );
            })}

            {isSelected && (
                <mesh rotation={[0, 0, 0]}>
                    <ringGeometry args={[0.5, 0.52, 64]} />
                    <meshBasicMaterial color="#38bdf8" />
                </mesh>
            )}
        </group>
    );
}

export function LayoutOverlayLayer() {
    const layoutOverlays = useStore(state => state.layoutOverlays);

    return (
        <group name="layout-overlay-layer">
            {layoutOverlays.map(overlay => (
                <LayoutOverlay key={overlay.id} data={overlay} />
            ))}
        </group>
    );
}
