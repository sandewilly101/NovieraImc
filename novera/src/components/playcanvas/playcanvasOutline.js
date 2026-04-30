import * as pc from 'playcanvas';

export function createSelectionOutline(app) {
    const outline = new pc.Entity('selection-outline');
    outline.addComponent('render', { type: 'box' });
    outline.setLocalScale(1.1, 1.1, 1.1);
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(0, 0, 0);
    mat.emissive = new pc.Color(0.22, 0.6, 1);
    mat.blendType = pc.BLEND_ADDITIVEALPHA;
    mat.depthTest = false;
    mat.alpha = 0.95;
    mat.useLighting = false;
    mat.cull = pc.CULLFACE_NONE;
    mat.update();
    outline.render.material = mat;
    outline.enabled = false;
    app.root.addChild(outline);
    return outline;
}

export function updateSelectionOutline(outline, selectedObj) {
    if (!outline) return;
    if (!selectedObj) {
        outline.enabled = false;
        return;
    }
    const d = selectedObj.dimensions || [1, 1, 1];
    const s = selectedObj.scale || [1, 1, 1];
    const p = selectedObj.position || [0, 0, 0];
    const r = selectedObj.rotation || [0, 0, 0];
    outline.enabled = true;
    outline.setLocalPosition(p[0], p[1], p[2]);
    outline.setLocalEulerAngles(
        (r[0] * 180) / Math.PI,
        (r[1] * 180) / Math.PI,
        (r[2] * 180) / Math.PI
    );
    outline.setLocalScale(
        Math.max(0.08, Math.abs(d[0] * s[0]) * 1.06),
        Math.max(0.08, Math.abs(d[1] * s[1]) * 1.06),
        Math.max(0.08, Math.abs(d[2] * s[2]) * 1.06)
    );
}
