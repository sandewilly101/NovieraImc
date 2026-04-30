const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const designerController = require('../controllers/designerController');

router.get('/profile', protect, designerController.getDesignerProfile);

router.post('/blueprints', protect, designerController.submitBlueprint);

module.exports = router;
