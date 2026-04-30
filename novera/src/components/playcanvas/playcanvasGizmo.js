import * as pc from 'playcanvas';

export function createGizmoRoot(app, gizmoHandlesRef, gizmoBaseColorsRef) {
    const gizmoRoot = new pc.Entity('gizmo-root');
    app.root.addChild(gizmoRoot);
    const makeHandle = (name, color, pos, size = 0.16) => {
        const h = new pc.Entity(`gizmo-${name}`);
        h.addComponent('render', { type: 'box' });
        h.setLocalScale(size, size, size);
        h.setLocalPosition(pos.x, pos.y, pos.z);
        const m = new pc.StandardMaterial();
        m.diffuse = color;
        m.emissive = color.clone().mulScalar(0.35);
        m.update();
        h.render.material = m;
        gizmoBaseColorsRef.current.set(name, color.clone());
        gizmoRoot.addChild(h);
        gizmoHandlesRef.current.set(name, h);
    };
    makeHandle('x', new pc.Color(1, 0.35, 0.35), new pc.Vec3(1, 0, 0));
    makeHandle('y', new pc.Color(0.35, 1, 0.35), new pc.Vec3(0, 1, 0));
    makeHandle('z', new pc.Color(0.35, 0.65, 1), new pc.Vec3(0, 0, 1));
    makeHandle('ry', new pc.Color(1, 0.85, 0.3), new pc.Vec3(0, 0.2, 0), 0.2);
    makeHandle('s', new pc.Color(0.95, 0.95, 0.95), new pc.Vec3(0.65, 0.65, 0.65), 0.18);
    gizmoRoot.enabled = false;
    return gizmoRoot;
}

export function applyGizmoHighlight(gizmoHandlesRef, gizmoBaseColorsRef, hovered, active) {
    gizmoHandlesRef.current.forEach((h, key) => {
        const base = gizmoBaseColorsRef.current.get(key) || new pc.Color(0.8, 0.8, 0.8);
        const m = h.render?.material;
        if (!m) return;
        const isActive = active === key;
        const isHovered = hovered === key;
        const mult = isActive ? 1.9 : isHovered ? 1.45 : 1;
        m.diffuse = new pc.Color(
            Math.min(1, base.r * mult),
            Math.min(1, base.g * mult),
            Math.min(1, base.b * mult)
        );
        m.emissive = new pc.Color(
            Math.min(1, base.r * (isActive ? 1.25 : isHovered ? 0.9 : 0.35)),
            Math.min(1, base.g * (isActive ? 1.25 : isHovered ? 0.9 : 0.35)),
            Math.min(1, base.b * (isActive ? 1.25 : isHovered ? 0.9 : 0.35))
        );
        m.update();
    });
}

export function updateGizmoPresentation(gizmoRoot, gizmoHandlesRef, selectedObj, activeTool, cameraEntity, transformSpace = 'world') {
    const showGizmo = !!selectedObj && (activeTool === 'move' || activeTool === 'rotate' || activeTool === 'scale');
    gizmoRoot.enabled = showGizmo;
    if (!showGizmo) return;
    const p = selectedObj.position || [0, 0, 0];
    gizmoRoot.setLocalPosition(p[0], p[1], p[2]);
    const r = selectedObj.rotation || [0, 0, 0];
    if (transformSpace === 'local') {
        gizmoRoot.setLocalEulerAngles(
            (r[0] * 180) / Math.PI,
            (r[1] * 180) / Math.PI,
            (r[2] * 180) / Math.PI
        );
    } else {
        gizmoRoot.setLocalEulerAngles(0, 0, 0);
    }
    const scale = Math.max(0.8, cameraEntity ? cameraEntity.getPosition().distance(gizmoRoot.getPosition()) * 0.06 : 1);
    gizmoRoot.setLocalScale(scale, scale, scale);
    const x = gizmoHandlesRef.current.get('x');
    const y = gizmoHandlesRef.current.get('y');
    const z = gizmoHandlesRef.current.get('z');
    const ry = gizmoHandlesRef.current.get('ry');
    const s = gizmoHandlesRef.current.get('s');
    if (x) x.setLocalPosition(1, 0, 0);
    if (y) y.setLocalPosition(0, 1, 0);
    if (z) z.setLocalPosition(0, 0, 1);
    if (ry) ry.setLocalPosition(0, 0.2, 0);
    if (s) s.setLocalPosition(0.65, 0.65, 0.65);
    gizmoHandlesRef.current.forEach((h, key) => {
        h.enabled = (
            (activeTool === 'move' && (key === 'x' || key === 'y' || key === 'z')) ||
            (activeTool === 'rotate' && key === 'ry') ||
            (activeTool === 'scale' && key === 's')
        );
    });
}
