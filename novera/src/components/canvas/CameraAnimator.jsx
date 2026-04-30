import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';

export default function CameraAnimator({ orbitRef }) {
    const { cameraFocusTarget, cameraFocusPosition, setCameraFocus, setActiveTool } = useStore(
        useShallow((s) => ({
            cameraFocusTarget: s.cameraFocusTarget,
            cameraFocusPosition: s.cameraFocusPosition,
            setCameraFocus: s.setCameraFocus,
            setActiveTool: s.setActiveTool,
        }))
    );

    const targetVector = useRef(new THREE.Vector3());
    const positionVector = useRef(new THREE.Vector3());
    const isAnimating = useRef(false);

    useEffect(() => {
        if (cameraFocusTarget && cameraFocusPosition) {
            targetVector.current.set(...cameraFocusTarget);
            positionVector.current.set(...cameraFocusPosition);
            isAnimating.current = true;
        } else {
            isAnimating.current = false;
        }
    }, [cameraFocusTarget, cameraFocusPosition]);

    useEffect(() => {
        const controls = orbitRef.current;
        if (!controls) return;

        const onInteractionStart = () => {
            if (isAnimating.current) {
                isAnimating.current = false;
                setCameraFocus(null, null);
                setActiveTool('select');
            }
        };

        controls.addEventListener('start', onInteractionStart);
        return () => controls.removeEventListener('start', onInteractionStart);

    }, [orbitRef.current]);

    useFrame((state, delta) => {
        if (useStore.getState().viewportNavMode === 'walk') return;
        if (!orbitRef.current || !isAnimating.current) return;

        const t = THREE.MathUtils.clamp(delta * 5, 0, 1);

        orbitRef.current.target.lerp(targetVector.current, t);
        state.camera.position.lerp(positionVector.current, t);
        state.camera.lookAt(orbitRef.current.target);
        orbitRef.current.update();

        const distToPos = state.camera.position.distanceTo(positionVector.current);
        const distToTarget = orbitRef.current.target.distanceTo(targetVector.current);

        if (distToPos < 0.01 && distToTarget < 0.01) {
            isAnimating.current = false;
            setActiveTool('select');
        }
    });

    return null;
}
