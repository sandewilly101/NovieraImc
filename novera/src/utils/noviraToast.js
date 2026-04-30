/**
 * App-wide toast (see `GlobalToast` in App). Also listened to as `novira:export-toast` for legacy callers.
 * @param {string} message
 * @param {'info'|'ok'|'warn'|'err'} [variant]
 */
export function showToast(message, variant = 'info') {
    if (typeof document === 'undefined' || !message) return;
    document.dispatchEvent(
        new CustomEvent('novira:toast', {
            detail: { message: String(message), variant },
        })
    );
}
