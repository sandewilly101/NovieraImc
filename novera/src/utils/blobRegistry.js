const sessionBlobUrls = new Set();

export function registerBlobUrl(url) {
    if (url && url.startsWith('blob:')) sessionBlobUrls.add(url);
}

export function isBlobFromSession(url) {
    return sessionBlobUrls.has(url);
}
