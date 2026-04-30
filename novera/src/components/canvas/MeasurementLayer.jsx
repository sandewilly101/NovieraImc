import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../../store/useStore';

const ObjectRuler = ({ object }) => {
    const { position, scale, dimensions, type, geo } = object;

    const w = (dimensions?.[0] || 1) * (scale?.[0] || 1);
    const h = (dimensions?.[1] || 1) * (scale?.[1] || 1);
    const d = (dimensions?.[2] || 1) * (scale?.[2] || 1);

    const halfW = w / 2;
    const halfH = h / 2;
    const halfD = d / 2;

    const labelStyle = {
        background: 'rgba(255, 255, 255, 0.95)',
        color: '#2563eb',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        border: '1px solid #3b82f6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        fontFamily: "'JetBrains Mono', monospace"
    };

    return (
        <group position={position}>

            <Line
                points={[[-halfW, -halfH, halfD], [halfW, -halfH, halfD]]}
                color="#3b82f6"
                lineWidth={1}
                transparent
                opacity={0.6}
            />
            <Html position={[0, -halfH - 0.2, halfD]} center>
                <div style={labelStyle}>{w.toFixed(2)}m</div>
            </Html>

            <Line
                points={[[-halfW, -halfH, halfD], [-halfW, halfH, halfD]]}
                color="#10b981"
                lineWidth={1}
                transparent
                opacity={0.6}
            />
            <Html position={[-halfW - 0.2, 0, halfD]} center>
                <div style={{ ...labelStyle, color: '#059669', borderColor: '#10b981' }}>{h.toFixed(2)}m</div>
            </Html>

            <Line
                points={[[halfW, -halfH, -halfD], [halfW, -halfH, halfD]]}
                color="#6366f1"
                lineWidth={1}
                transparent
                opacity={0.6}
            />
            <Html position={[halfW + 0.2, -halfH, 0]} center>
                <div style={{ ...labelStyle, color: '#4f46e5', borderColor: '#6366f1' }}>{d.toFixed(2)}m</div>
            </Html>
        </group>
    );
};

export default function MeasurementLayer() {
    const objects = useStore(state => state.objects);
    const measurementsEnabled = useStore(state => state.measurementsEnabled);
    return (
        <group name="measurement-layer">

            {measurementsEnabled && objects.map(obj => {
                if (obj.type === 'ground') {
                    return (
                        <group key={obj.id} position={obj.position}>
                            <Html position={[0, 0, obj.dimensions[2] / 2 + 1]} center>
                                <div style={{
                                    background: '#1e293b', color: '#ffffff', padding: '4px 10px',
                                    borderRadius: '20px', fontSize: '11px', fontWeight: '800'
                                }}>
                                    TOTAL SURFACE: {obj.dimensions[0]}m x {obj.dimensions[2]}m
                                </div>
                            </Html>
                        </group>
                    );
                }
                return <ObjectRuler key={obj.id} object={obj} />;
            })}
        </group>
    );
}
