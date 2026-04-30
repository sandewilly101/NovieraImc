import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useStore, { physicsState } from '../../store/useStore';

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export default function LiftHandler() {
    const { camera, raycaster, pointer, gl } = useThree();
    const intersect = useRef(new THREE.Vector3());

    const isShiftHeld = useRef(false);

    const lockedAxis = useRef(null);

    const shiftLockOrigin = useRef(null);

    const liftedObjectId = useStore(s => s.liftedObjectId);
    const updateObject = useStore(s => s.updateObject);
    const setLiftedObjectId = useStore(s => s.setLiftedObjectId);
    const setLiftOrigin = useStore(s => s.setLiftOrigin);
    const liftOrigin = useStore(s => s.liftOrigin);
    const setAxisLock = useStore(s => s.setAxisLock);
    const groundObj = useStore(s => s.objects.find(o => o.type === 'ground'));

    const floorY = groundObj
        ? groundObj.position[1] + ((groundObj.dimensions?.[1] || 0.2) * (groundObj.scale?.[1] || 1)) / 2
        : 0;

    useEffect(() => {
        FLOOR_PLANE.constant = -floorY;
    }, [floorY]);

    const localPosRef = useRef(null);

    useEffect(() => {
        if (!liftedObjectId) {
            localPosRef.current = null;
            physicsState.liftPosition = null;
            lockedAxis.current = null;
            shiftLockOrigin.current = null;
            setAxisLock(null);
            return;
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Shift' && !isShiftHeld.current) {
                isShiftHeld.current = true;

                raycaster.setFromCamera(pointer, camera);
                const hit = raycaster.ray.intersectPlane(FLOOR_PLANE, intersect.current);
                if (hit) {
                    shiftLockOrigin.current = { x: intersect.current.x, z: intersect.current.z };
                    lockedAxis.current = null;
                }
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === 'Shift') {
                isShiftHeld.current = false;
                lockedAxis.current = null;
                shiftLockOrigin.current = null;
                setAxisLock(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [liftedObjectId, camera, pointer, raycaster, setAxisLock]);

    useFrame(() => {
        if (!liftedObjectId) return;

        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.ray.intersectPlane(FLOOR_PLANE, intersect.current);
        if (!hit) return;

        let newX = parseFloat(intersect.current.x.toFixed(3));
        let newZ = parseFloat(intersect.current.z.toFixed(3));

        if (isShiftHeld.current && shiftLockOrigin.current) {
            const ox = shiftLockOrigin.current.x;
            const oz = shiftLockOrigin.current.z;

            if (!lockedAxis.current) {
                const absX = Math.abs(newX - ox);
                const absZ = Math.abs(newZ - oz);

                if (absX > 0.05 || absZ > 0.05) {
                    lockedAxis.current = absX >= absZ ? 'X' : 'Z';
                    setAxisLock(lockedAxis.current);
                }
            }

            if (lockedAxis.current === 'X') {
                newZ = oz;
            } else if (lockedAxis.current === 'Z') {
                newX = ox;
            }
        }

        localPosRef.current = [newX, floorY, newZ];
        physicsState.liftPosition = localPosRef.current;
    });

    useEffect(() => {
        if (!liftedObjectId) return;

        const handlePointerDown = (e) => {
            if (e.button === 0) {
                if (localPosRef.current) {
                    updateObject(liftedObjectId, { position: localPosRef.current });
                }
                localPosRef.current = null;
                physicsState.liftPosition = null;
                setLiftedObjectId(null);
                setLiftOrigin(null);

                lockedAxis.current = null;
                shiftLockOrigin.current = null;
                isShiftHeld.current = false;
                setAxisLock(null);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (localPosRef.current) {
                    updateObject(liftedObjectId, { position: localPosRef.current });
                }
                localPosRef.current = null;
                physicsState.liftPosition = null;
                setLiftedObjectId(null);
                setLiftOrigin(null);
                lockedAxis.current = null;
                shiftLockOrigin.current = null;
                isShiftHeld.current = false;
                setAxisLock(null);
            }
        };

        gl.domElement.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            gl.domElement.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [liftedObjectId, setLiftedObjectId, gl.domElement, setLiftOrigin, setAxisLock]);

    return null;
}
