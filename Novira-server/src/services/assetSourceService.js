// Re-exports from the modular source registry for backward compatibility
const {
    PROJECT_FOCUS_TAGS,
    searchAllSources,
    getRecommendedAssets,
    searchByCategory,
    getRecommended,
    getPagedSearch,
    RECOMMENDED_QUERIES
} = require('./assetSources');

module.exports = {
    PROJECT_FOCUS_TAGS,
    searchAllSources,
    getRecommendedAssets,
    searchByCategory,
    getRecommended,
    getPagedSearch,
    RECOMMENDED_QUERIES
};
