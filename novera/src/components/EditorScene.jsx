import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, RoundedBox, MeshDistortMaterial } from '@react-three/drei';

export default function EditorScene() {
    const group = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (group.current) {
            group.current.rotation.y = t * 0.2;
        }
    });

    return (
        <group ref={group}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                <RoundedBox args={[2, 2, 2]} radius={0.1} smoothness={4}>
                    <MeshDistortMaterial
                        color="#6366f1"
                        attach="material"
                        distort={0.4}
                        speed={2}
                        roughness={0.2}
                        metalness={0.8}
                        clearcoat={1}
                        clearcoatRoughness={0.1}
                    />
                </RoundedBox>
            </Float>

            <Float speed={1.5} rotationIntensity={2} floatIntensity={2}>
                <mesh position={[-3, 1, -2]}>
                    <sphereGeometry args={[0.5, 32, 32]} />
                    <meshStandardMaterial color="#ec4899" roughness={0.1} metalness={0.9} />
                </mesh>
            </Float>

            <Float speed={2.5} rotationIntensity={1.5} floatIntensity={1.5}>
                <mesh position={[2, 2, 2]}>
                    <torusGeometry args={[0.4, 0.15, 16, 32]} />
                    <meshStandardMaterial color="#10b981" roughness={0.2} metalness={0.8} />
                </mesh>
            </Float>
        </group>
    );
}
