const express = require('express');
const router = express.Router();
const {
    getProjects,
    createProject,
    getProject,
    updateProject,
    deleteProject,
    toggleStar,
    toggleShare,
    inviteUser,
    acceptInvite,
    heartbeat,
    getCommunityProjects,
    toggleLikeProject,
    recordView,
    getLatestProject,
    updateSceneGraph,
    getSharedActivity
} = require('../controllers/projectController');
const { protect, optionalAuth } = require('../middlewares/authMiddleware');
const { checkStorageLimit } = require('../middlewares/storageMiddleware');

router.get('/community', optionalAuth, getCommunityProjects);
router.post('/:id/view', optionalAuth, recordView);

router.use(protect);

router.get('/activity/shared', getSharedActivity);
router.get('/sync/latest', getLatestProject);

router
    .route('/')
    .get(getProjects)
    .post(checkStorageLimit, createProject);

router
    .route('/:id')
    .get(getProject)
    .put(updateProject)
    .delete(deleteProject);

router.put('/:id/star', toggleStar);
router.put('/:id/share', toggleShare);
router.put('/:id/like', toggleLikeProject);
router.post('/:id/invite', inviteUser);
router.put('/:id/accept', acceptInvite);
router.put('/:id/heartbeat', heartbeat);
router.put('/:id/scenegraph', updateSceneGraph);

module.exports = router;
