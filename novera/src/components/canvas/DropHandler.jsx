import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import useStore from '../../store/useStore';
import { raycastGroundPlaneXZ, sceneFloorY } from '../../utils/viewportSpawnPlacement';

export default function DropHandler() {
    const { camera, gl } = useThree();
    const addObject = useStore(state => state.addObject);

    useEffect(() => {
        const handleDrop = async (e) => {
            e.preventDefault();
            try {
                const data = e.dataTransfer.getData('application/json');
                if (!data) return;

                const item = JSON.parse(data);

                const rect = gl.domElement.getBoundingClientRect();
                const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                const floorY = sceneFloorY(useStore.getState().objects);
                const [px, , pz] = raycastGroundPlaneXZ(camera, floorY, ndcX, ndcY);
                addObject(item, [Number(px.toFixed(2)), 0, Number(pz.toFixed(2))]);
            } catch (err) {
                console.error("Drop handling failed", err);
            }
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        };

        gl.domElement.addEventListener('drop', handleDrop);
        gl.domElement.addEventListener('dragover', handleDragOver);

        return () => {
            gl.domElement.removeEventListener('drop', handleDrop);
            gl.domElement.removeEventListener('dragover', handleDragOver);
        };
    }, [camera, gl.domElement, addObject]);

    return null;
}
