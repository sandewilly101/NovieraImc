import { useState, useEffect, useCallback } from 'react';
import { communityService, projectService } from '../api/apiService';

const PALETTES = [
    { color: '#3b82f6', color2: '#6366f1' },
    { color: '#f59e0b', color2: '#ef4444' },
    { color: '#8b5cf6', color2: '#6366f1' },
    { color: '#10b981', color2: '#059669' },
    { color: '#ec4899', color2: '#8b5cf6' },
    { color: '#0ea5e9', color2: '#2563eb' },
    { color: '#f97316', color2: '#f59e0b' },
    { color: '#14b8a6', color2: '#10b981' },
    { color: '#a855f7', color2: '#ec4899' },
    { color: '#22c55e', color2: '#0ea5e9' },
];

export function paletteForId(id = '') {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return PALETTES[hash % PALETTES.length];
}

export default function useCommunityProjects() {
    const [finished, setFinished] = useState([]);
    const [shared, setShared] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [finRes, shRes] = await Promise.all([
                communityService.getFinished(),
                communityService.getShared(),
            ]);

            const fin = (finRes.data?.data ?? finRes.data ?? []).map(enrich);

            const rawShared = shRes.data?.data ?? shRes.data ?? [];
            const sh = rawShared.filter(p => Boolean(p.isShared)).map(enrich);

            setFinished(fin);
            setShared(sh);
        } catch (err) {
            console.error('[useCommunityProjects] Fetch failed:', err);
            setFinished([]);
            setShared([]);
            setError('offline');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const toggleLike = useCallback(async (id, tab) => {
        const setter = tab === 'finished' ? setFinished : setShared;
        setter(prev => prev.map(p =>
            p.id === id
                ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
                : p
        ));
        try { await communityService.toggleLike(id); } catch (e) {}
    }, []);

    const recordView = useCallback(async (id, tab) => {
        const setter = tab === 'finished' ? setFinished : setShared;
        setter(prev => prev.map(p =>
            p.id === id ? { ...p, views: (p.views ?? 0) + 1 } : p
        ));
        try { await communityService.recordView(id); } catch (e) {}
    }, []);

    return { finished, shared, loading, error, toggleLike, recordView, refetch: fetchAll };
}

function enrich(project) {
    const palette = project.thumbnailColor
        ? { color: project.thumbnailColor, color2: project.thumbnailColor2 ?? '#6366f1' }
        : paletteForId(String(project.id));
    return { ...project, ...palette };
}
