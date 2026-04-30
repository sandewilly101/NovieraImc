export const getPremiumColor = (str) => {
    const colors = [
        '#3b82f6',
        '#6366f1',
        '#8b5cf6',
        '#d946ef',
        '#ec4899',
        '#f43f5e',
        '#f59e0b',
        '#10b981',
        '#06b6d4',
        '#0ea5e9',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};
