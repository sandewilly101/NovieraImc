const express = require('express');
const router = express.Router();
const {
    getAssets,
    claimAsset,
    saveAiGeneration,
    updateAsset,
    deleteAsset
} = require('../controllers/assetController');
const { protect } = require('../middlewares/authMiddleware');
const { checkStorageLimit } = require('../middlewares/storageMiddleware');

router.use(protect);

router.route('/')
    .get(getAssets);

router.post('/claim', checkStorageLimit, claimAsset);
router.post('/ai', checkStorageLimit, saveAiGeneration);

router.route('/:id')
    .put(updateAsset)
    .delete(deleteAsset);

module.exports = router;
