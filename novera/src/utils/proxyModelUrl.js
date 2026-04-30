/**
 * Server-side GLB proxy (Tripo, S3, R2, etc.). Uses the same API base as `apiService`.
 */
const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export function getProxyModelUrl(remoteUrl) {
    if (!remoteUrl) return null;
    return `${API_URL}/tripo/proxy-model?url=${encodeURIComponent(remoteUrl)}`;
}
