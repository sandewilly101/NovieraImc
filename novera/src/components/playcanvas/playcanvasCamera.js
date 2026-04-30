import * as pc from 'playcanvas';

export function createOrbitCameraState() {
    return {
        target: new pc.Vec3(0, 0, 0),
        yaw: -45,
        pitch: -25,
        distance: 14,
    };
}

export function updateOrbitCameraTransform(cameraEntity, state) {
    const yawR = (state.yaw * Math.PI) / 180;
    const pitchR = (state.pitch * Math.PI) / 180;
    const x = Math.cos(pitchR) * Math.sin(yawR) * state.distance;
    const y = Math.sin(pitchR) * state.distance;
    const z = Math.cos(pitchR) * Math.cos(yawR) * state.distance;
    cameraEntity.setLocalPosition(state.target.x + x, state.target.y + y, state.target.z + z);
    cameraEntity.lookAt(state.target);
}

export function orbitPanByKeyboard(state, dt, app) {
    if (app.keyboard.isPressed(pc.KEY_W)) state.target.z -= 5 * dt;
    if (app.keyboard.isPressed(pc.KEY_S)) state.target.z += 5 * dt;
    if (app.keyboard.isPressed(pc.KEY_A)) state.target.x -= 5 * dt;
    if (app.keyboard.isPressed(pc.KEY_D)) state.target.x += 5 * dt;
}

export function orbitRotateByMouse(state, dx, dy) {
    state.yaw -= dx * 0.25;
    state.pitch = Math.min(85, Math.max(-85, state.pitch - dy * 0.25));
}

export function orbitZoomByWheel(state, wheelDelta) {
    state.distance = Math.min(80, Math.max(3, state.distance + wheelDelta * 0.02));
}
