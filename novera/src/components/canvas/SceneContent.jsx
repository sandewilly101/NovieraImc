import { useMemo } from 'react';
import useStore from '../../store/useStore';
import SceneObject from './models/SceneObject';
import AudioController from './AudioController';
import MeasurementLayer from './MeasurementLayer';
import LiftHandler from './LiftHandler';
import { LayoutOverlayLayer } from './LayoutOverlay';
import ThreeDCursorVisual from './ThreeDCursorVisual';
import ThreeDCursorPlacement from './ThreeDCursorPlacement';
import FrameCameraBridge from './FrameCameraBridge';

export default function SceneContent() {
    const objects = useStore(state => state.objects);
    const hiddenObjectIds = useStore(state => state.hiddenObjectIds);

    const objectById = useMemo(() => {
        const m = new Map();
        for (let i = 0; i < objects.length; i++) {
            const o = objects[i];
            m.set(o.id, o);
        }
        return m;
    }, [objects]);

    return (
        <>
            <AudioController />
            <MeasurementLayer />
            <LiftHandler />
            <LayoutOverlayLayer />
            {objects.filter(o => !hiddenObjectIds.includes(o.id)).map((obj) => (
                <SceneObject
                    key={obj.id}
                    data={obj}
                    parentObject={obj.parentId ? (objectById.get(obj.parentId) ?? null) : null}
                    objectById={objectById}
                />
            ))}
            <ThreeDCursorVisual />
            <ThreeDCursorPlacement />
            <FrameCameraBridge />
        </>
    );
}
