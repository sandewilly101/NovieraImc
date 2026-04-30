const TRIPO_API_BASE_URL = 'https://api.tripo3d.ai/v2/openapi/task';

const tripoService = {

    textToModel: async (prompt, options = {}) => {
        const payload = {
            type: 'text_to_model',
            prompt: prompt,
            ...options
        };
        console.log(`[TripoService] text_to_model payload: ${JSON.stringify(payload)}`);
        const response = await fetch(TRIPO_API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TRIPO_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to start Text-to-3D task');
        }

        return await response.json();
    },

    imageToModel: async (imageUrl, options = {}) => {
        let filePayload;

        if (imageUrl.startsWith('data:image/')) {

            const match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/s);
            if (!match) {
                throw new Error('Invalid base64 image format');
            }
            let format = match[1];
            const base64Data = match[2];
            if (format === 'jpeg') format = 'jpg';
            filePayload = { type: format, data: base64Data };
        } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {

            const ext = imageUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
            const format = ext === 'jpeg' ? 'jpg' : ext;
            filePayload = { type: format, url: imageUrl };
        } else {
            throw new Error('Unsupported image source. Use a URL or upload a local file.');
        }

        const payload = {
            type: 'image_to_model',
            file: filePayload,
            ...options
        };

        console.log(`[TripoService] image_to_model payload type: ${filePayload.type}, source: ${filePayload.url ? 'url' : 'base64'}, options: ${JSON.stringify(options)}`);

        const response = await fetch(TRIPO_API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TRIPO_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[TripoService] image_to_model error:', JSON.stringify(errorData));
            throw new Error(errorData.message || errorData.error || 'Failed to start Image-to-3D task');
        }

        return await response.json();
    },

    convertModel: async (modelId, format) => {
        const response = await fetch(TRIPO_API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TRIPO_API_KEY}`
            },
            body: JSON.stringify({
                type: 'convert',
                model_id: modelId,
                format: format
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to start conversion task');
        }

        return await response.json();
    },

    getTaskStatus: async (taskId) => {
        const response = await fetch(`${TRIPO_API_BASE_URL}/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.TRIPO_API_KEY}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to get task status');
        }

        return await response.json();
    }
};

module.exports = tripoService;
