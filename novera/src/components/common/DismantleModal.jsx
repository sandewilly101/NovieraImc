import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PuzzlePieceIcon, CheckIcon, EyeIcon, EyeSlashIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';

const PHYSICAL_CAP = 50;

const PAGE_SIZE = 80;

export default function DismantleModal() {
    const {
        isDismantleModalOpen,
        dismantleTarget,
        setIsDismantleModalOpen,
        dismantleObject,
        setHighlightedPartNames,
        isDismantling,
        dismantleProgress,
        dismantleTotal,
        meshVisibilityMap,
        hideAllExcept,
        resetMeshVisibility,
        toggleMeshVisibility,
    } = useStore(
        useShallow((s) => ({
            isDismantleModalOpen: s.isDismantleModalOpen,
            dismantleTarget: s.dismantleTarget,
            setIsDismantleModalOpen: s.setIsDismantleModalOpen,
            dismantleObject: s.dismantleObject,
            setHighlightedPartNames: s.setHighlightedPartNames,
            isDismantling: s.isDismantling,
            dismantleProgress: s.dismantleProgress,
            dismantleTotal: s.dismantleTotal,
            meshVisibilityMap: s.meshVisibilityMap,
            hideAllExcept: s.hideAllExcept,
            resetMeshVisibility: s.resetMeshVisibility,
            toggleMeshVisibility: s.toggleMeshVisibility,
        }))
    );

    const [selectedParts, setSelectedParts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);

    const totalParts = dismantleTarget?.parts?.length ?? 0;

    const isMeshInspectorMode = totalParts > PHYSICAL_CAP;
    const hiddenMeshes = dismantleTarget ? (meshVisibilityMap[dismantleTarget.id] || []) : [];

    const filteredParts = useMemo(() => {
        if (!dismantleTarget?.parts) return [];
        if (!searchQuery.trim()) return dismantleTarget.parts;
        const q = searchQuery.toLowerCase();
        return dismantleTarget.parts.filter(p => p.name?.toLowerCase().includes(q));
    }, [dismantleTarget, searchQuery]);

    const totalPages = Math.ceil(filteredParts.length / PAGE_SIZE);
    const pagedParts = filteredParts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const togglePart = (partName) => {
        const next = selectedParts.includes(partName)
            ? selectedParts.filter(p => p !== partName)
            : [...selectedParts, partName];
        setSelectedParts(next);
        setHighlightedPartNames(next);
    };

    const handleClose = () => {
        if (isDismantling) return;
        setIsDismantleModalOpen(false);
        setSelectedParts([]);
        setSearchQuery('');
        setPage(0);
        setHighlightedPartNames([]);
        if (dismantleTarget) resetMeshVisibility(dismantleTarget.id);
    };

    const handleIsolateSelected = () => {
        if (!dismantleTarget || selectedParts.length === 0) return;
        hideAllExcept(dismantleTarget.id, selectedParts);
    };

    const handleShowAll = () => { if (dismantleTarget) resetMeshVisibility(dismantleTarget.id); };

    const handleExtractSelected = () => {
        if (!dismantleTarget || selectedParts.length === 0) return;
        const toExtract = dismantleTarget.parts
            .filter(p => selectedParts.includes(p.name))
            .slice(0, PHYSICAL_CAP);
        dismantleObject(dismantleTarget.id, toExtract);
    };

    const handleFullDismantle = () => {
        if (!dismantleTarget || isMeshInspectorMode) return;
        const list = selectedParts.length > 0
            ? dismantleTarget.parts.filter(p => selectedParts.includes(p.name))
            : dismantleTarget.parts;
        dismantleObject(dismantleTarget.id, list);
    };

    if (isDismantling) {
        return (
            <AnimatePresence>
                <div className="modal-overlay dismantle-modal-overlay" style={{ zIndex: 1000 }}>
                    <motion.div
                        className="studio-dismantle-card"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        style={{ width: '100%', maxWidth: '340px', background: '#fff', borderRadius: '16px', padding: '28px 24px', boxShadow: '0 20px 50px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0', textAlign: 'center' }}
                    >
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <PuzzlePieceIcon style={{ width: 28, height: 28, color: '#2563eb' }} />
                        </div>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Separating Parts…</h2>
                        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Creating {dismantleTotal} objects — please wait.</p>
                        <div style={{ background: '#f1f5f9', borderRadius: 999, height: 10, overflow: 'hidden', marginBottom: 10 }}>
                            <motion.div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#2563eb,#7c3aed)' }}
                                animate={{ width: `${dismantleProgress}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} />
                        </div>
                        <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                            {dismantleProgress}% — {Math.round((dismantleProgress / 100) * dismantleTotal)}/{dismantleTotal}
                        </p>
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            {isDismantleModalOpen && dismantleTarget && (
                <div className="modal-overlay dismantle-modal-overlay" style={{ zIndex: 1000 }}>
                    <motion.div
                        className="studio-dismantle-card"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        style={{ width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '16px', padding: '22px', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0' }}
                    >
                        <button onClick={handleClose} style={{ position: 'absolute', top: 14, right: 14, border: 'none', background: 'none', cursor: 'pointer' }}>
                            <XMarkIcon style={{ width: 20, height: 20, color: '#94a3b8' }} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: isMeshInspectorMode ? '#fff7ed' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <PuzzlePieceIcon style={{ width: 20, height: 20, color: isMeshInspectorMode ? '#ea580c' : '#2563eb' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                    {isMeshInspectorMode ? 'Mesh Inspector' : 'Dismantle Model'}
                                </h2>
                                <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>
                                    {dismantleTarget.name} &nbsp;·&nbsp;
                                    <strong>{(dismantleTarget.totalMeshCount || totalParts).toLocaleString()}</strong> meshes
                                    {dismantleTarget.totalMeshCount > totalParts && (
                                        <span style={{ color: '#f97316', marginLeft: 4 }}>
                                            (showing first {totalParts.toLocaleString()})
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {isMeshInspectorMode && (
                            <div style={{ marginBottom: 10, padding: '9px 11px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
                                <strong>⚡ Smart Mode</strong> — {(dismantleTarget.totalMeshCount || totalParts).toLocaleString()} meshes is too large for full physical dismantling.
                                Select meshes → <strong>Isolate</strong> to hide all others in-place, or <strong>Extract</strong> up to {PHYSICAL_CAP} into independent objects.
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                            {isMeshInspectorMode ? (
                                <>
                                    <ActionBtn disabled={selectedParts.length === 0} onClick={handleIsolateSelected} color="#ea580c" border="#f97316">
                                        <EyeIcon style={{ width: 12, height: 12 }} /> Isolate ({selectedParts.length})
                                    </ActionBtn>
                                    <ActionBtn onClick={handleShowAll} color="#64748b" border="#e2e8f0">
                                        <EyeIcon style={{ width: 12, height: 12 }} /> Show All
                                    </ActionBtn>
                                    <ActionBtn
                                        disabled={selectedParts.length === 0 || selectedParts.length > PHYSICAL_CAP}
                                        onClick={handleExtractSelected} color="#2563eb" border="#3b82f6"
                                        title={selectedParts.length > PHYSICAL_CAP ? `Max ${PHYSICAL_CAP} at once` : ''}
                                    >
                                        <PuzzlePieceIcon style={{ width: 12, height: 12 }} /> Extract ({Math.min(selectedParts.length, PHYSICAL_CAP)}/{PHYSICAL_CAP})
                                    </ActionBtn>
                                </>
                            ) : (
                                <>
                                    <ActionBtn onClick={() => { const a = dismantleTarget.parts.map(p => p.name); setSelectedParts(a); setHighlightedPartNames(a); }} color="#059669" border="#10b981">Select All</ActionBtn>
                                    <ActionBtn onClick={() => { setSelectedParts([]); setHighlightedPartNames([]); }} color="#64748b" border="#e2e8f0">Clear</ActionBtn>
                                    <ActionBtn onClick={handleFullDismantle} color="#2563eb" border="#3b82f6">
                                        <PuzzlePieceIcon style={{ width: 12, height: 12 }} /> Explode All
                                    </ActionBtn>
                                </>
                            )}
                        </div>

                        <input
                            type="text" placeholder={`Search ${totalParts.toLocaleString()} meshes…`}
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                            style={{ width: '100%', padding: '7px 11px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12, marginBottom: 8, outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
                        />

                        {filteredParts.length > PAGE_SIZE && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredParts.length)} of {filteredParts.length.toLocaleString()}
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                                        style={{ border: '1px solid #e2e8f0', background: page === 0 ? '#f8fafc' : '#fff', borderRadius: 5, padding: '2px 6px', cursor: page === 0 ? 'default' : 'pointer', color: page === 0 ? '#cbd5e1' : '#334155' }}>
                                        <ChevronLeftIcon style={{ width: 12, height: 12 }} />
                                    </button>
                                    <span style={{ fontSize: 10, color: '#64748b', alignSelf: 'center' }}>{page + 1}/{totalPages}</span>
                                    <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                                        style={{ border: '1px solid #e2e8f0', background: page >= totalPages - 1 ? '#f8fafc' : '#fff', borderRadius: 5, padding: '2px 6px', cursor: page >= totalPages - 1 ? 'default' : 'pointer', color: page >= totalPages - 1 ? '#cbd5e1' : '#334155' }}>
                                        <ChevronRightIcon style={{ width: 12, height: 12 }} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="studio-dismantle-parts-grid" style={{ maxHeight: 240, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 14 }}>
                            {pagedParts.map((part, idx) => {
                                const isSelected = selectedParts.includes(part.name);
                                const isHidden = hiddenMeshes.includes(part.name);
                                return (
                                    <div
                                        key={idx}
                                        className={`studio-dismantle-part${isSelected ? ' is-selected' : ''}`}
                                        onClick={() => togglePart(part.name)}
                                        style={{ padding: '6px 8px', borderRadius: 7, border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`, background: isSelected ? '#eff6ff' : '#f8fafc', cursor: 'pointer', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 6, opacity: isHidden ? 0.4 : 1 }}
                                    >
                                        <div style={{ width: 13, height: 13, borderRadius: 3, flexShrink: 0, border: `1px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`, background: isSelected ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {isSelected && <CheckIcon style={{ width: 8, height: 8, color: 'white' }} />}
                                        </div>
                                        {isMeshInspectorMode && (
                                            <button onClick={e => { e.stopPropagation(); toggleMeshVisibility(dismantleTarget.id, part.name); }}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                                {isHidden ? <EyeSlashIcon style={{ width: 10, height: 10 }} /> : <EyeIcon style={{ width: 10, height: 10 }} />}
                                            </button>
                                        )}
                                        <span style={{ fontSize: 10, fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{part.name}</span>
                                    </div>
                                );
                            })}
                            {pagedParts.length === 0 && (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 16 }}>No meshes match "{searchQuery}"</div>
                            )}
                        </div>

                        {selectedParts.length > 0 && (
                            <div style={{ marginBottom: 10, padding: '6px 10px', background: '#eff6ff', borderRadius: 7, fontSize: 11, color: '#2563eb', fontWeight: 600, textAlign: 'center' }}>
                                {selectedParts.length} selected
                                {isMeshInspectorMode && selectedParts.length > PHYSICAL_CAP && <span style={{ color: '#ef4444', marginLeft: 6 }}>⚠ max {PHYSICAL_CAP} for Extract</span>}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" className="studio-dismantle-footer-btn studio-dismantle-footer-btn--ghost" onClick={handleClose} style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                                {isMeshInspectorMode ? 'Done' : 'Cancel'}
                            </button>
                            {!isMeshInspectorMode && (
                                <button type="button" className="studio-dismantle-footer-btn studio-dismantle-footer-btn--primary" disabled={selectedParts.length === 0} onClick={handleFullDismantle}
                                    style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 9, background: selectedParts.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg,#2563eb,#7c3aed)', color: 'white', fontWeight: 700, fontSize: 12, cursor: selectedParts.length === 0 ? 'not-allowed' : 'pointer', boxShadow: selectedParts.length === 0 ? 'none' : '0 4px 12px rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <PuzzlePieceIcon style={{ width: 14, height: 14 }} />
                                    Separate {selectedParts.length} Part{selectedParts.length !== 1 ? 's' : ''}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function ActionBtn({ children, onClick, disabled, color, border, title }) {
    return (
        <button type="button" className="studio-dismantle-chip-btn" onClick={onClick} disabled={disabled} title={title}
            style={{ padding: '5px 11px', borderRadius: 7, border: `1px solid ${disabled ? '#e2e8f0' : border}`, background: disabled ? '#f8fafc' : '#fff', color: disabled ? '#94a3b8' : color, fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            {children}
        </button>
    );
}
