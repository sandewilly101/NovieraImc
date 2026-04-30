import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, Squares2X2Icon, ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';
import * as THREE from 'three';
import { getProxyModelUrl } from '../../utils/proxyModelUrl';

const Model = ({ url }) => {
    const proxiedUrl = React.useMemo(() => {
        if (
            url?.includes('tripo') ||
            url?.includes('tripo3d') ||
            url?.includes('amazonaws.com') ||
            url?.includes('r2.cloudflarestorage.com')
        ) {
            return getProxyModelUrl(url);
        }
        return url;
    }, [url]);

    const { scene } = useGLTF(proxiedUrl);

    const clonedScene = useMemo(() => {
        const clone = scene.clone();

        const box = new THREE.Box3().setFromObject(clone);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        clone.position.x -= center.x;
        clone.position.y -= box.min.y;
        clone.position.z -= center.z;

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const s = 1.0 / maxDim;
            clone.scale.set(s, s, s);
        }

        clone.traverse(child => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.side = THREE.DoubleSide;
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.roughness = Math.min(child.material.roughness, 0.5);
                child.material.metalness = Math.max(child.material.metalness, 0.2);
            }
        });

        return clone;
    }, [scene]);

    return <primitive object={clonedScene} />;
};

export default function VaultPreviewModal({ task, isOpen, onClose, onLoadToScene }) {
    if (!isOpen || !task) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="vault-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="vault-modal-container"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >

                    <div className="vault-modal-header">
                        <div className="task-info">
                            <span className="task-type">{task.type?.replace('_to_model', '').toUpperCase()}</span>
                            <h3>{task.prompt || 'Untitled Generation'}</h3>
                            <span className="task-date">{new Date(task.createdAt).toLocaleString()}</span>
                        </div>
                        <button className="close-btn" onClick={onClose}>
                            <XMarkIcon className="zeicon" />
                        </button>
                    </div>

                    <div className="vault-modal-content">
                        <div className="viewer-pane">
                            <Canvas shadows dpr={[1, 2]}>
                                <PerspectiveCamera makeDefault position={[3, 3, 3]} fov={35} />
                                <ambientLight intensity={0.7} />
                                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                                <Suspense fallback={null}>
                                    <Model url={task.resultUrl} />
                                    <ContactShadows resolution={1024} scale={10} blur={2} opacity={0.25} far={10} color="#000000" />
                                    <Environment preset="studio" />
                                </Suspense>

                                <OrbitControls
                                    makeDefault
                                    minPolarAngle={0}
                                    maxPolarAngle={Math.PI / 1.75}
                                    enableZoom={true}
                                />
                            </Canvas>

                            <div className="viewer-hint">
                                LEFT CLICK TO ROTATE • RIGHT CLICK TO PAN • SCROLL TO ZOOM
                            </div>
                        </div>

                        <div className="modal-actions-pane">
                            <div className="action-group">
                                <label>Asset Actions</label>
                                <button className="modal-action-btn primary" onClick={() => { onLoadToScene(task); onClose(); }}>
                                    <Squares2X2Icon className="zeicon" />
                                    Load into Workspace
                                </button>
                                <a href={task.resultUrl} download className="modal-action-btn secondary">
                                    <ArrowDownTrayIcon className="zeicon" />
                                    Download Native (GLB)
                                </a>
                            </div>

                            <div className="action-group mt-auto">
                                <label>Asset Metadata</label>
                                <div className="metadata-grid">
                                    <div className="meta-item">
                                        <span>Status</span>
                                        <span className={`status-pill ${task.status}`}>{task.status}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span>Quality</span>
                                        <span>High Fidelity</span>
                                    </div>
                                    <div className="meta-item">
                                        <span>Format</span>
                                        <span>GLB / GLTF</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            <style>{`
                .vault-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 27, 45, 0.85);
                    backdrop-filter: blur(12px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                }
                .vault-modal-container {
                    background: white;
                    width: 100%;
                    max-width: 1200px;
                    height: 85vh;
                    border-radius: 24px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.4);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .vault-modal-header {
                    padding: 24px 32px;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: white;
                }
                .task-type {
                    font-size: 10px;
                    font-weight: 800;
                    color: var(--blue);
                    letter-spacing: 0.1em;
                }
                .task-info h3 {
                    margin: 4px 0;
                    font-size: 20px;
                    font-weight: 800;
                    color: var(--ink);
                }
                .task-date {
                    font-size: 12px;
                    color: var(--silver);
                }
                .close-btn {
                    background: #f1f5f9;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .close-btn:hover {
                    background: #e2e8f0;
                    transform: rotate(90deg);
                }
                .vault-modal-content {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                }
                .viewer-pane {
                    flex: 1;
                    background: radial-gradient(circle at center, #f8fafc 0%, #f1f5f9 100%);
                    position: relative;
                }
                .viewer-hint {
                    position: absolute;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(15, 27, 45, 0.6);
                    backdrop-filter: blur(4px);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 30px;
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    pointer-events: none;
                    opacity: 0.8;
                }
                .modal-actions-pane {
                    width: 320px;
                    background: white;
                    border-left: 1px solid #f1f5f9;
                    padding: 32px;
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                }
                .action-group label {
                    display: block;
                    font-size: 11px;
                    font-weight: 800;
                    color: var(--silver);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 16px;
                }
                .modal-action-btn {
                    width: 100%;
                    padding: 14px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-decoration: none;
                    margin-bottom: 12px;
                    border: none;
                }
                .modal-action-btn.primary {
                    background: var(--blue);
                    color: white;
                    box-shadow: 0 8px 20px rgba(43, 111, 212, 0.25);
                }
                .modal-action-btn.primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 25px rgba(43, 111, 212, 0.35);
                }
                .modal-action-btn.secondary {
                    background: white;
                    color: var(--ink);
                    border: 1.5px solid #e2e8f0;
                }
                .modal-action-btn.secondary:hover {
                    background: #f8fafc;
                    border-color: var(--blue);
                }
                .metadata-grid {
                    display: grid;
                    gap: 16px;
                }
                .meta-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 13px;
                }
                .meta-item span:first-child {
                    color: var(--silver);
                }
                .meta-item span:last-child {
                    font-weight: 700;
                    color: var(--ink);
                }
                .status-pill {
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .status-pill.success {
                    background: #dcfce7;
                    color: #166534;
                }
                .mt-auto { margin-top: auto; }
            `}</style>
        </AnimatePresence>
    );
}
