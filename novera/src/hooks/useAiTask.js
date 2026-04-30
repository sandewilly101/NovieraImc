import { useState, useEffect, useCallback } from 'react';
import { tripoService } from '../api/apiService';

export const useAiTask = (initialTaskId = null) => {
    const [taskId, setTaskId] = useState(initialTaskId);
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [resultUrl, setResultUrl] = useState(null);
    const [error, setError] = useState(null);

    const pollStatus = useCallback(async (id) => {
        try {
            const res = await tripoService.getTaskStatus(id);
            const data = res.data.data;

            setStatus(data.status);
            setProgress(data.progress);

            if (data.status === 'success') {
                setResultUrl(data.resultUrl);
                return true;
            } else if (data.status === 'failed') {
                setError('Generation failed');
                return true;
            }
            return false;
        } catch (err) {
            setError(err.message || 'Error polling task status');
            return true;
        }
    }, []);

    useEffect(() => {
        let interval;
        if (taskId && (status === 'queued' || status === 'running')) {
            interval = setInterval(async () => {
                const finished = await pollStatus(taskId);
                if (finished) {
                    clearInterval(interval);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [taskId, status, pollStatus]);

    const startTask = async (type, prompt, imageUrl) => {
        setError(null);
        setStatus('starting');
        try {
            const res = await tripoService.createTask({ type, prompt, imageUrl });
            const data = res.data.data;
            setTaskId(data.id);
            setStatus(data.status);
            return data.id;
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to start AI task');
            setStatus('failed');
            throw err;
        }
    };

    const reset = () => {
        setTaskId(null);
        setStatus('idle');
        setProgress(0);
        setResultUrl(null);
        setError(null);
    };

    return { taskId, status, progress, resultUrl, error, startTask, reset };
};
