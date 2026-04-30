import React, { useRef, useEffect } from 'react';
import { PositionalAudio } from '@react-three/drei';
import useStore from '../../store/useStore';

export default function AudioController() {
    const soundEnabled = useStore(state => state.soundEnabled);
    const customAudioUrl = useStore(state => state.customAudioUrl);
    const audioLoop = useStore(state => state.audioLoop);

    const AMBIENT_URL = customAudioUrl || "https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3";

    return (
        <group position={[0, 2, 0]}>
            {soundEnabled && (
                <PositionalAudio
                    url={AMBIENT_URL}
                    distance={10}
                    loop={audioLoop}
                    autoplay
                    key={`${AMBIENT_URL}-${audioLoop}`}
                />
            )}
        </group>
    );
}
