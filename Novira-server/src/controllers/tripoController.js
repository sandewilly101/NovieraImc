const asyncHandler = require('express-async-handler');
const AiTask = require('../models/AiTask');
const User = require('../models/User');
const tripoService = require('../services/tripoService');
const { Op } = require('sequelize');

exports.createTask = asyncHandler(async (req, res) => {
    const { type, prompt, imageUrl, options } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

    if (!isAdmin && (!user || user.aiCredits < 10)) {
        return res.status(400).json({
            success: false,
            message: 'Insufficient AI credits. 10 credits required.'
        });
    }

    let tripoResponse;
    try {

        if (type === 'text_to_model') {
            tripoResponse = await tripoService.textToModel(prompt, options);
        } else if (type === 'image_to_model') {
            tripoResponse = await tripoService.imageToModel(imageUrl, options);
        } else if (type === 'convert') {
            const { model_id, format } = req.body;
            tripoResponse = await tripoService.convertModel(model_id, format);

        } else {
            return res.status(400).json({ success: false, message: 'Invalid task type' });
        }

        const tripoTaskId = tripoResponse.data.task_id;

        const task = await AiTask.create({
            userId,
            tripoTaskId,
            type,
            status: 'queued',
            prompt: type === 'text_to_model' ? prompt : null,
            imageUrl: type === 'image_to_model' ? imageUrl : null,
            metadata: { ...tripoResponse.data, ...options }
        });

        if (!isAdmin && (type === 'text_to_model' || type === 'image_to_model')) {
            user.aiCredits -= 10;
            await user.save();
        }

        res.status(201).json({
            success: true,
            data: task
        });

    } catch (error) {
        console.error('Tripo Task Creation Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error communicating with Tripo AI'
        });
    }
});

exports.getTaskStatus = asyncHandler(async (req, res) => {
    const task = await AiTask.findByPk(req.params.id);

    if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.userId !== req.user.id) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (['success', 'failed', 'cancelled'].includes(task.status)) {

        if (task.status === 'success' && !task.resultUrl) {
            console.log(`[TripoController] Task ${task.id} succeeded but has no resultUrl. Attempting recovery...`);
            try {
                const tripoStatus = await tripoService.getTaskStatus(task.tripoTaskId);
                const output = tripoStatus?.data?.output || {};
                console.log(`[TripoController] Recovery output:`, JSON.stringify(output));
                const modelUrl = output.model || output.pbr_model || output.base_model || null;
                const thumbUrl = output.thumbnail || output.rendered_image || null;
                if (modelUrl) {
                    task.resultUrl = modelUrl;
                    if (thumbUrl) task.thumbnailUrl = thumbUrl;
                    await task.save();
                    console.log(`[TripoController] ✅ Recovered resultUrl: ${modelUrl}`);
                } else {
                    console.warn(`[TripoController] ⚠️ No model URL found. Links may have expired for task ${task.id}.`);
                }
            } catch (fetchErr) {
                console.error('[TripoController] Recovery failed:', fetchErr.message);
            }
        }
        return res.status(200).json({ success: true, data: task });
    }

    try {
        const tripoStatus = await tripoService.getTaskStatus(task.tripoTaskId);
        const { status, progress, output } = tripoStatus.data || {};

        console.log(`[TripoController] Poll task ${task.id}: status=${status} progress=${progress}%`);

        task.status = status || task.status;
        task.progress = progress ?? task.progress;

        if (status === 'success' && output) {
            console.log(`[TripoController] ✅ Task ${task.id} complete. Output:`, JSON.stringify(output));

            const modelUrl = output.model || output.pbr_model || output.base_model || null;
            const thumbUrl = output.thumbnail || output.rendered_image || null;

            if (modelUrl) {
                task.resultUrl = modelUrl;
                console.log(`[TripoController] ✅ resultUrl saved: ${modelUrl.substring(0, 80)}...`);
            } else {
                console.error(`[TripoController] ❌ No model URL in output! Full output:`, JSON.stringify(output));
            }

            if (thumbUrl) task.thumbnailUrl = thumbUrl;
        }

        await task.save();
        res.status(200).json({ success: true, data: task });

    } catch (error) {
        console.error('Tripo Status Poll Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching status from Tripo AI'
        });
    }
});

exports.getUserTasks = asyncHandler(async (req, res) => {
    const tasks = await AiTask.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
        success: true,
        data: tasks
    });
});

exports.proxyModel = asyncHandler(async (req, res) => {
    let { url } = req.query;

    if (!url) {
        return res.status(400).json({ success: false, message: 'URL is required' });
    }

    const fetchWithRetry = async (targetUrl, retryCount = 0) => {
        try {
            console.log(`[ProxyModel] Attempting to fetch (try ${retryCount + 1}): ${targetUrl.substring(0, 100)}...`);

            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (response.status === 403 && retryCount === 0 && targetUrl.includes('tripo')) {
                console.warn(`[ProxyModel] 403 Forbidden detected for Tripo URL. Attempting self-healing refresh...`);

                const baseUrl = targetUrl.split('?')[0];

                const task = await AiTask.findOne({
                    where: {
                        [Op.or]: [
                            { resultUrl: { [Op.like]: `${baseUrl}%` } },
                            { thumbnailUrl: { [Op.like]: `${baseUrl}%` } }
                        ]
                    }
                });

                if (task && task.tripoTaskId) {
                    console.log(`[ProxyModel] Found task ${task.id} (Tripo ID: ${task.tripoTaskId}). Refreshing URL...`);

                    const tripoStatus = await tripoService.getTaskStatus(task.tripoTaskId);
                    const output = tripoStatus?.data?.output || {};
                    const newModelUrl = output.model || output.pbr_model || output.base_model;
                    const newThumbUrl = output.thumbnail || output.rendered_image;

                    if (newModelUrl || newThumbUrl) {

                        if (newModelUrl) task.resultUrl = newModelUrl;
                        if (newThumbUrl) task.thumbnailUrl = newThumbUrl;
                        await task.save();

                        const retryUrl = targetUrl.includes('.glb') ? (newModelUrl || targetUrl) : (newThumbUrl || targetUrl);
                        console.log(`[ProxyModel] URL refreshed. Retrying with new signed URL.`);
                        return await fetchWithRetry(retryUrl, 1);
                    }
                } else {
                    console.warn(`[ProxyModel] Could not find task for URL refresh: ${baseUrl}`);
                }
            }

            if (!response.ok) {
                console.error(`[ProxyModel] Fetch failed with status ${response.status}: ${response.statusText}`);
                return res.status(response.status).json({
                    success: false,
                    message: `Failed to fetch model: ${response.statusText}`,
                    status: response.status,
                    url: targetUrl
                });
            }

            const buffer = await response.arrayBuffer();
            console.log(`[ProxyModel] Successfully fetched ${buffer.byteLength} bytes`);

            res.setHeader('Content-Type', targetUrl.includes('.glb') ? 'model/gltf-binary' : (targetUrl.includes('.png') ? 'image/png' : 'image/jpeg'));
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(Buffer.from(buffer));

        } catch (error) {
            console.error('Model Proxy Error:', error);
            res.status(500).json({ success: false, message: 'Failed to proxy model', url: targetUrl, error: error.message });
        }
    };

    await fetchWithRetry(url);
});
