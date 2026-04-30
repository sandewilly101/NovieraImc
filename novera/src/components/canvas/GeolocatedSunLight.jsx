import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SunCalc from 'suncalc';
import useStore from '../../store/useStore';

/**
 * Directional "sun" from latitude / longitude and time-of-day (minutes from midnight).
 * When environment HDR is on, this light is omitted (Environment handles fill).
 */
export default function GeolocatedSunLight() {
  const lat = useStore((s) => s.sunLatitude);
  const lon = useStore((s) => s.sunLongitude);
  const mins = useStore((s) => s.sunMinutesFromMidnight);
  const cloud = useStore((s) => s.sunCloudiness);
  const environmentVisible = useStore((s) => s.environmentVisible);
  const lightingEnabled = useStore((s) => s.lightingEnabled);

  const lightRef = useRef(null);

  const sunDir = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setMinutes(Math.min(1440, Math.max(0, mins)));
    const pos = SunCalc.getPosition(d, lat, lon);
    const { altitude, azimuth } = pos;
    const x = Math.cos(altitude) * Math.sin(azimuth);
    const y = Math.sin(altitude);
    const z = Math.cos(altitude) * Math.cos(azimuth);
    return new THREE.Vector3(-x, Math.max(0.08, -y), -z).normalize();
  }, [lat, lon, mins]);

  useFrame(() => {
    if (!lightRef.current) return;
    lightRef.current.position.copy(sunDir.clone().multiplyScalar(120));
  });

  if (environmentVisible || !lightingEnabled) return null;

  const direct = Math.max(0.15, 1.35 * (1 - cloud * 0.55));
  const color = new THREE.Color().setHSL(0.09 + cloud * 0.03, 0.25 + cloud * 0.15, 0.88 - cloud * 0.15);

  return (
    <directionalLight ref={lightRef} castShadow intensity={direct} color={color} shadow-mapSize={[2048, 2048]}>
      <object3D position={[0, 0.5, 0]} attach="target" />
    </directionalLight>
  );
}
