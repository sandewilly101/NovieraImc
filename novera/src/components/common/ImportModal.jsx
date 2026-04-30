import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowUpTrayIcon, DocumentPlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';
import { registerBlobUrl } from '../../utils/blobRegistry';

import { renderPdfToImage } from '../../utils/pdfLoader';
import { showToast } from '../../utils/noviraToast';

export default function ImportModal({ isOpen, onClose }) {
    const { addObject, addLayoutOverlay, addLayoutDimension } = useStore(
        useShallow((s) => ({
            addObject: s.addObject,
            addLayoutOverlay: s.addLayoutOverlay,
            addLayoutDimension: s.addLayoutDimension,
        }))
    );
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = async (file) => {
        if (!file) return;

        const name = file.name;
        const extension = name.split('.').pop().toLowerCase();

        if (extension === 'pdf') {
            setIsLoading(true);
            try {
                const { url, aspectRatio, extractedDimensions } = await renderPdfToImage(file);
                const overlayScale = [15 * aspectRatio, 15, 1];
                const overlayId = `ly_${Date.now()}`;

                addLayoutOverlay({
                    id: overlayId,
                    name: name.replace(/\.[^/.]+$/, ""),
                    url: url,
                    aspectRatio: aspectRatio,
                    scale: overlayScale
                });

                extractedDimensions.forEach((dim, idx) => {
                    const localX = dim.x - 0.5;
                    const localZ = dim.y - 0.5;
                    addLayoutDimension({
                        id: `dim_${overlayId}_${idx}`,
                        label: dim.label,

                        position: [localX, 0.02, localZ],
                        overlayId: overlayId
                    });
                });

            } catch (err) {
                console.error('PDF processing failed:', err);
                showToast(`Failed to process PDF layout: ${err.message}`, 'err');
            } finally {
                setIsLoading(false);
                onClose();
            }
            return;
        }

        if (extension !== 'glb' && extension !== 'gltf') {
            showToast('Please select a valid .glb, .gltf, or .pdf file.', 'warn');
            return;
        }

        const url = URL.createObjectURL(file);
        registerBlobUrl(url);

        addObject({
            name: name.replace(/\.[^/.]+$/, ""),
            type: 'gltf',
            url: url,
            dimensions: [1, 1, 1],
        });

        onClose();
    };

    const onDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <motion.div
                        className="modal-container"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        style={{
                            width: '100%',
                            maxWidth: '500px',
                            background: '#111827',
                            borderRadius: '24px',
                            padding: '32px',
                            position: 'relative',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white'
                        }}
                    >

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Import Local Model
                                </h2>
                                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Add your custom GLB/GLTF assets to the scene</p>
                            </div>
                            <button
                                onClick={onClose}
                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                <XMarkIcon style={{ width: 20, height: 20 }} />
                            </button>
                        </div>

                        <div
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={() => !isLoading && fileInputRef.current?.click()}
                            style={{
                                height: '240px',
                                border: `2px dashed ${isDragging ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                                borderRadius: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px',
                                transition: 'all 0.2s ease',
                                background: isDragging ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                cursor: isLoading ? 'wait' : 'pointer',
                                position: 'relative'
                            }}
                        >
                            {isLoading && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.8)', borderRadius: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                    <div className="animate-spin w-8 h-8 border-2 border-t-[#38bdf8] border-rgba(255,255,255,0.1) rounded-full" />
                                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>Processing PDF...</span>
                                </div>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => handleFile(e.target.files[0])}
                                style={{ display: 'none' }}
                                accept=".glb,.gltf,.pdf"
                            />

                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '20px',
                                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(129, 140, 248, 0.1) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '8px'
                            }}>
                                <ArrowUpTrayIcon style={{ width: 32, height: 32, color: '#38bdf8' }} />
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>
                                    {isDragging ? 'Drop to upload' : 'Drag & drop your file here'}
                                </p>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                                    or <span style={{ color: '#38bdf8' }}>browse your computer</span>
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    .GLB
                                </span>
                                <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    .GLTF
                                </span>
                                <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                    .PDF
                                </span>
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.1)', display: 'flex', gap: '12px' }}>
                            <CheckCircleIcon style={{ width: 18, height: 18, color: '#0ea5e9', flexShrink: 0 }} />
                            <p style={{ fontSize: '11px', color: '#7dd3fc', margin: 0, lineHeight: 1.5 }}>
                                Imported models will be automatically centered and normalized. Local imports are session-based and will not persist unless saved to a project.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
