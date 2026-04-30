import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';
import {
    PlayIcon,
    PauseIcon,
    ArrowPathIcon,
    ScissorsIcon,
    ForwardIcon
} from '@heroicons/react/24/solid';

export default function AudioWaveform() {
    const waveformRef = useRef(null);
    const wavesurfer = useRef(null);
    const regionsRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const {
        customAudioUrl,
        soundEnabled,
        setSoundEnabled,
        audioLoop,
        setAudioLoop,
        audioPlaybackRate,
        setAudioPlaybackRate,
        setAudioCurrentTime
    } = useStore(
        useShallow((s) => ({
            customAudioUrl: s.customAudioUrl,
            soundEnabled: s.soundEnabled,
            setSoundEnabled: s.setSoundEnabled,
            audioLoop: s.audioLoop,
            setAudioLoop: s.setAudioLoop,
            audioPlaybackRate: s.audioPlaybackRate,
            setAudioPlaybackRate: s.setAudioPlaybackRate,
            setAudioCurrentTime: s.setAudioCurrentTime,
        }))
    );

    const AMBIENT_URL = "https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3";
    const audioUrl = customAudioUrl || AMBIENT_URL;

    useEffect(() => {
        if (!waveformRef.current) return;

        setIsReady(false);

        const ws = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: '#e2e8f0',
            progressColor: '#3b82f6',
            cursorColor: '#2563eb',
            barWidth: 2,
            barRadius: 4,
            height: 54,
            normalize: true,
            cursorWidth: 2,
        });

        const wsRegions = ws.registerPlugin(RegionsPlugin.create());
        regionsRef.current = wsRegions;

        ws.load(audioUrl);

        ws.on('ready', () => {
            setIsReady(true);
            const totalDuration = ws.getDuration();
            setDuration(totalDuration);

            wsRegions.clearRegions();
            wsRegions.addRegion({
                id: 'trim-region',
                start: 0,
                end: totalDuration,
                color: 'rgba(59, 130, 246, 0.12)',
                drag: true,
                resize: true,
            });

            if (soundEnabled) ws.play();
        });

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));

        ws.on('audioprocess', () => {
            const time = ws.getCurrentTime();
            setCurrentTime(time);
            setAudioCurrentTime(time);

            const activeRegion = wsRegions.getRegions().find(r => r.id === 'trim-region');
            if (activeRegion) {

                if (time >= activeRegion.end) {
                    if (audioLoop) {
                        ws.setTime(activeRegion.start);
                    } else {
                        ws.pause();
                        setSoundEnabled(false);
                    }
                }

                if (time < activeRegion.start) {
                    ws.setTime(activeRegion.start);
                }
            }
        });

        ws.on('interaction', () => {
            const time = ws.getCurrentTime();
            const activeRegion = wsRegions.getRegions().find(r => r.id === 'trim-region');
            if (activeRegion) {
                if (time < activeRegion.start) ws.setTime(activeRegion.start);
                if (time > activeRegion.end) ws.setTime(activeRegion.end);
            }
            if (soundEnabled && !isPlaying) ws.play();
        });

        wavesurfer.current = ws;

        return () => {
            try {
                ws.pause();
                ws.destroy();
            } catch (e) {

            }
        };
    }, [audioUrl]);

    useEffect(() => {
        if (!regionsRef.current || !isReady) return;

        const wsRegions = regionsRef.current;
        wsRegions.on('region-updated', (region) => {

            if (wavesurfer.current && isReady) {
                const time = wavesurfer.current.getCurrentTime();
                if (time < region.start) wavesurfer.current.setTime(region.start);
                if (time > region.end) wavesurfer.current.setTime(region.end);
            }
        });
    }, [isReady]);

    useEffect(() => {
        if (wavesurfer.current) {
            wavesurfer.current.setPlaybackRate(audioPlaybackRate);
        }
    }, [audioPlaybackRate]);

    useEffect(() => {
        if (!wavesurfer.current) return;
        if (soundEnabled && !isPlaying) {
            wavesurfer.current.play();
        } else if (!soundEnabled && isPlaying) {
            wavesurfer.current.pause();
        }
    }, [soundEnabled]);

    return (
        <div className="audio-waveform-container pro-suite">
            <div className="waveform-controls">
                <button className="waveform-play-btn" onClick={() => setSoundEnabled(!soundEnabled)}>
                    {isPlaying ? <PauseIcon style={{ width: 18, height: 18 }} /> : <PlayIcon style={{ width: 18, height: 18 }} />}
                </button>

                <button
                    className={`waveform-icon-btn ${audioLoop ? 'active' : ''}`}
                    onClick={() => setAudioLoop(!audioLoop)}
                    title="Toggle Loop"
                >
                    <ArrowPathIcon style={{ width: 14, height: 14 }} />
                </button>

                <div className="speed-control-box">
                    <ForwardIcon style={{ width: 12, height: 12, color: '#94a3b8' }} />
                    <select
                        value={audioPlaybackRate}
                        onChange={(e) => setAudioPlaybackRate(parseFloat(e.target.value))}
                        className="speed-select-minimal"
                    >
                        <option value="0.5">0.5x</option>
                        <option value="1">1.0x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2.0x</option>
                    </select>
                </div>
            </div>

            <div className="waveform-visual-well">
                <div ref={waveformRef} className="waveform-visualizer" />
                <div className="trim-hint">
                    <ScissorsIcon style={{ width: 10, height: 10 }} />
                    <span>DRAG HANDLES TO TRIM AUDIO RANGE</span>
                </div>
            </div>

            <div className="waveform-time-info">
                <div className="time-pill">
                    <span className="current">{formatTime(currentTime)}</span>
                    <span className="divider">/</span>
                    <span className="total">{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
}

function formatTime(seconds) {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
