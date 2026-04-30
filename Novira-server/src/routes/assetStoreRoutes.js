const express = require('express');
const router = express.Router();
const {
    getRecommendedStoreAssets,
    searchStoreAssets,
    proxySketchfabDownload,
    proxyFree3dModelDownload,
    proxyBlenderKitModelDownload,
    proxyBlenderKitHdriDownload,
    proxyAssetDownload,
    searchStoreHdris,
    recommendedStoreHdris,
    searchStoreMaterials,
    recommendedStoreMaterials,
    searchStoreImages,
    recommendedStoreImages,
    searchBlenderKitAssets,
    getBlenderKitCategories,
    importBlenderKitAsset,
} = require('../controllers/assetController');
const { optionalAuth } = require('../middlewares/authMiddleware');

/**
 * Catalog + proxy reads are public (optional JWT for future per-user limits).
 * This keeps the editor asset browser working even if the token is missing or expired.
 */
router.get('/models/recommended', optionalAuth, getRecommendedStoreAssets);
router.get('/models/search', optionalAuth, searchStoreAssets);
router.get('/recommended', optionalAuth, getRecommendedStoreAssets);
router.get('/search', optionalAuth, searchStoreAssets);

router.get('/hdris/recommended', optionalAuth, recommendedStoreHdris);
router.get('/hdris/search', optionalAuth, searchStoreHdris);

router.get('/materials/recommended', optionalAuth, recommendedStoreMaterials);
router.get('/materials/search', optionalAuth, searchStoreMaterials);

router.get('/images/recommended', optionalAuth, recommendedStoreImages);
router.get('/images/search', optionalAuth, searchStoreImages);
router.get('/blenderkit/search', optionalAuth, searchBlenderKitAssets);
router.get('/blenderkit/categories', optionalAuth, getBlenderKitCategories);
router.post('/blenderkit/import', optionalAuth, importBlenderKitAsset);

router.get('/sketchfab-download/:uid', optionalAuth, proxySketchfabDownload);
router.get('/free3d/model/:guid', optionalAuth, proxyFree3dModelDownload);
router.get('/blenderkit/model/:id', optionalAuth, proxyBlenderKitModelDownload);
router.get('/blenderkit/hdri/:id', optionalAuth, proxyBlenderKitHdriDownload);

router.get('/proxy', optionalAuth, proxyAssetDownload);
router.get('/proxy-model', optionalAuth, proxyAssetDownload);

module.exports = router;
