const express = require('express');
const router = express.Router();
const tripoController = require('../controllers/tripoController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/task', protect, tripoController.createTask);
router.get('/task/:id', protect, tripoController.getTaskStatus);
router.get('/tasks', protect, tripoController.getUserTasks);
router.get('/proxy-model', tripoController.proxyModel);

module.exports = router;
