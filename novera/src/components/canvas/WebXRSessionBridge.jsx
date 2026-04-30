import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import useStore from '../../store/useStore';

/**
 * Enables Three.js WebXR on the R3F renderer (Quest Browser, desktop SteamVR/OpenXR, etc.).
 * Not a full metaverse stack — standard immersive-vr session with local-floor when supported.
 */
export default function WebXRSessionBridge() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    if (!navigator.xr?.isSessionSupported) {
      useStore.getState().setWebxrImmersiveVRAvailable(false);
      return undefined;
    }
    let cancelled = false;
    navigator.xr
      .isSessionSupported('immersive-vr')
      .then((ok) => {
        if (!cancelled) useStore.getState().setWebxrImmersiveVRAvailable(!!ok);
      })
      .catch(() => {
        if (!cancelled) useStore.getState().setWebxrImmersiveVRAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const xr = gl?.xr;
    if (xr && typeof xr === 'object' && 'enabled' in xr) {
      xr.enabled = true;
    }
    return () => {
      const x = gl?.xr;
      if (x && typeof x === 'object' && typeof x.getSession === 'function') {
        const session = x.getSession?.();
        if (session) {
          session.end().catch(() => {});
        }
        if ('enabled' in x) x.enabled = false;
      }
      useStore.getState().setXrPresenting(false);
    };
  }, [gl]);

  useEffect(() => {
    const onEnter = async () => {
      if (!navigator.xr) return;
      const x = gl?.xr;
      if (!x || typeof x !== 'object' || typeof x.setSession !== 'function') return;
      if (typeof x.getSession === 'function' && x.getSession?.()) return;
      try {
        const session = await navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor'],
        });
        if (typeof gl.makeXRCompatible === 'function') {
          await gl.makeXRCompatible();
        }
        await x.setSession(session);
        useStore.getState().setXrPresenting(true);
        session.addEventListener('end', () => {
          useStore.getState().setXrPresenting(false);
        });
      } catch (err) {
        console.warn('[Novira] WebXR immersive-vr failed:', err);
        document.dispatchEvent(
          new CustomEvent('novira:export-toast', {
            detail: { message: 'WebXR unavailable, blocked, or no headset' },
          })
        );
      }
    };

    const onExit = () => {
      const x = gl?.xr;
      if (x && typeof x.getSession === 'function') {
        const session = x.getSession?.();
        if (session) session.end();
      }
    };

    document.addEventListener('novira:webxr-enter-vr', onEnter);
    document.addEventListener('novira:webxr-exit-vr', onExit);
    return () => {
      document.removeEventListener('novira:webxr-enter-vr', onEnter);
      document.removeEventListener('novira:webxr-exit-vr', onExit);
    };
  }, [gl]);

  return null;
}
