import { Line } from '@react-three/drei';
import useStore from '../../store/useStore';

const AXIS_LEN = 0.28;

/** Blender-style 3D cursor gizmo (skipped by cursor-placement raycasts). */
export default function ThreeDCursorVisual() {
  const pos = useStore((s) => s.threeDCursorWorld);
  if (!pos) return null;

  return (
    <group position={pos} userData={{ noviraUiHelper: true }} frustumCulled={false}>
      <Line
        points={[[0, 0, 0], [AXIS_LEN, 0, 0]]}
        color="#f87171"
        lineWidth={2}
        depthTest
        transparent
        opacity={0.95}
      />
      <Line
        points={[[0, 0, 0], [0, AXIS_LEN, 0]]}
        color="#4ade80"
        lineWidth={2}
        depthTest
        transparent
        opacity={0.95}
      />
      <Line
        points={[[0, 0, 0], [0, 0, AXIS_LEN]]}
        color="#60a5fa"
        lineWidth={2}
        depthTest
        transparent
        opacity={0.95}
      />
    </group>
  );
}
