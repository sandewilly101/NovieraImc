import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        const sketchfabToken = localStorage.getItem('provider_sketchfab_token');
        if (sketchfabToken) {
            config.headers['x-provider-sketchfab-token'] = sketchfabToken;
        }
        const free3dToken = localStorage.getItem('provider_free3d_token');
        if (free3dToken) {
            config.headers['x-provider-free3d-token'] = free3dToken;
        }
        const blenderkitToken = localStorage.getItem('provider_blenderkit_token');
        if (blenderkitToken) {
            config.headers['x-provider-blenderkit-token'] = blenderkitToken;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {

            if (!window.location.pathname.includes('/login')) {
                localStorage.removeItem('token');
                localStorage.removeItem('userName');
                localStorage.removeItem('lastActivityAt');
                window.location.href = '/login?reason=session_expired';
            }
        }
        return Promise.reject(error);
    }
);

export const projectService = {
    getProjects: () => api.get('/projects'),
    createProject: (data) => api.post('/projects', data),
    getProject: (id) => api.get(`/projects/${id}`),
    updateProject: (id, data) => api.put(`/projects/${id}`, data),
    deleteProject: (id) => api.delete(`/projects/${id}`),
    toggleStar: (id) => api.put(`/projects/${id}/star`),
    toggleShare: (id) => api.put(`/projects/${id}/share`),
    inviteUser: (id, data) => api.post(`/projects/${id}/invite`, data),
    acceptInvite: (id) => api.put(`/projects/${id}/accept`),
    heartbeat: (id) => api.put(`/projects/${id}/heartbeat`),
    getLatest: () => api.get('/projects/sync/latest'),
    saveSceneGraph: (id, sceneGraph) => api.put(`/projects/${id}/scenegraph`, { sceneGraph }),
    getSharedActivity: () => api.get('/projects/activity/shared'),
};

export const communityService = {
    getFinished: () => api.get('/projects/community?type=finished'),
    getShared: () => api.get('/projects/community?type=shared'),
    toggleLike: (id) => api.put(`/projects/${id}/like`),
    recordView: (id) => api.post(`/projects/${id}/view`),
};

export const dashboardService = {
    getStats: () => api.get('/dashboard/stats')
};

export const notificationService = {
    getNotifications: () => api.get('/notifications'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`)
};

export const userService = {
    getProfile: () => api.get('/users/me'),
    updateProfile: (data) => api.put('/users/me', data),
    uploadAvatar: (formData) => api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updatePassword: (data) => api.put('/users/me/password', data),
    updateEmail: (data) => api.put('/users/me/email', data),
    updatePlan: (data) => api.put('/users/me/plan', data)
};

export const securityService = {
    getStatus: () => api.get('/security/status'),
    setup2FA: () => api.get('/security/2fa/setup'),
    verify2FA: (data) => api.post('/security/2fa/verify', data),
    disable2FA: (data) => api.post('/security/2fa/disable', data),
    validate2FA: (data) => api.post('/security/2fa/validate', data),
};

export const tripoService = {
    createTask: (data) => api.post('/tripo/task', data),
    getTaskStatus: (id) => api.get(`/tripo/task/${id}`),
    getUserTasks: () => api.get('/tripo/tasks'),
    convertTask: (taskId, format) => api.post('/tripo/task', { type: 'convert', model_id: taskId, format }),
};

function withPaging(path, queryKey, queryVal, opts = {}) {
    if (opts.limit == null && opts.offset == null) {
        const q = queryKey ? `?${queryKey}=${encodeURIComponent(queryVal)}` : '';
        return api.get(`${path}${q}`);
    }
    const p = new URLSearchParams();
    if (queryKey) p.set(queryKey, queryVal);
    p.set('limit', String(opts.limit ?? 56));
    if (opts.offset != null) p.set('offset', String(opts.offset));
    if (opts.qidx != null) p.set('qidx', String(opts.qidx));
    if (opts.source) p.set('source', String(opts.source));
    return api.get(`${path}?${p}`);
}

export const assetService = {
    getVaultAssets: () => api.get('/assets'),

    // Models — pass `{ offset, limit }` for infinite scroll (server slices merged catalog cache)
    getRecommendedStoreAssets: (opts) => (opts?.limit == null && opts?.offset == null
        ? api.get('/asset-store/models/recommended')
        : api.get(`/asset-store/models/recommended?limit=${opts.limit ?? 56}${opts.offset != null ? `&offset=${opts.offset}` : ''}`)),

    searchStoreAssets: (query, opts) => withPaging('/asset-store/models/search', 'q', query, opts),

    // HDRIs
    getRecommendedHdris: (opts) => (opts?.limit == null && opts?.offset == null
        ? api.get('/asset-store/hdris/recommended')
        : api.get(`/asset-store/hdris/recommended?limit=${opts.limit ?? 56}${opts.offset != null ? `&offset=${opts.offset}` : ''}`)),

    searchHdris: (query, opts) => withPaging('/asset-store/hdris/search', 'q', query, opts),

    // Materials
    getRecommendedMaterials: (opts) => (opts?.limit == null && opts?.offset == null
        ? api.get('/asset-store/materials/recommended')
        : api.get(`/asset-store/materials/recommended?limit=${opts.limit ?? 56}${opts.offset != null ? `&offset=${opts.offset}` : ''}`)),

    searchMaterials: (query, opts) => withPaging('/asset-store/materials/search', 'q', query, opts),

    // Reference Images
    getRecommendedImages: (opts) => {
        // qidx=0 gives stable cache key across all offset pages.
        const qidx = opts?.qidx ?? 0;
        const source = opts?.source ? `&source=${encodeURIComponent(opts.source)}` : '';
        if (opts?.limit == null && opts?.offset == null)
            return api.get(`/asset-store/images/recommended?qidx=${qidx}${source}`);
        return api.get(
            `/asset-store/images/recommended?limit=${opts.limit ?? 56}&offset=${opts.offset ?? 0}&qidx=${qidx}${source}`
        );
    },

    searchImages: (query, opts) => withPaging('/asset-store/images/search', 'q', query, opts),

    // BlenderKit (proxy via backend, auth token forwarded by interceptor)
    searchBlenderKit: (query, opts = {}) => {
        const p = new URLSearchParams();
        if (opts.next) {
            p.set('next', String(opts.next));
        } else {
            if (query) p.set('q', String(query));
            p.set('assetType', String(opts.assetType || 'model'));
            p.set('limit', String(opts.limit ?? 36));
        }
        return api.get(`/asset-store/blenderkit/search?${p}`);
    },
    getBlenderKitCategories: () => api.get('/asset-store/blenderkit/categories'),
    importBlenderKitAsset: (assetId) => api.post('/asset-store/blenderkit/import', { assetId }),
};

export default api;
