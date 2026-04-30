import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as pc from 'playcanvas';
import { resolvePlayCanvasHotkey } from './playcanvasHotkeys';
import { computeMarqueeHitIds, pickObjectAtScreen } from './playcanvasSelection';
import { computeMoveUpdate, computeRotateUpdate, computeScaleUpdate } from './playcanvasTransform';
import { applyGizmoHighlight, createGizmoRoot, updateGizmoPresentation } from './playcanvasGizmo';
import { cleanupOrphanedExternal, fitExternalModels, isExternalType, syncExternalLoads } from './playcanvasAssets';
import {
    closestPointOnAxisFromPointer,
    computeDragAxisMoveUpdate,
    computeDragPlaneMoveUpdate,
    computeDragRotateUpdate,
    computeDragScaleUpdate,
    intersectPointerPlane,
} from './playcanvasDrag';
import {
    createOrbitCameraState,
    orbitPanByKeyboard,
    orbitRotateByMouse,
    orbitZoomByWheel,
    updateOrbitCameraTransform,
} from './playcanvasCamera';
import { createSelectionOutline, updateSelectionOutline } from './playcanvasOutline';
import { computeMarqueeRect, createInteractionState, resetInteractionState } from './playcanvasInteractionState';

export default function PlayCanvasViewport({
    objects = [],
    selectedId = null,
    activeTool = 'select',
    axisConstraint = null,
    transformSpace = 'world',
    objectSnapEnabled = true,
    onSelectObject = () => {},
    onUpdateObject = () => {},
    onDeleteSelected = () => {},
    onDuplicateSelected = () => {},
    onFrameSelection = () => {},
    onUndo = () => {},
    onRedo = () => {},
    onCopySelected = () => {},
    onPasteClipboard = () => {},
    onSelectAll = () => {},
    onGroupSelected = () => {},
    onUngroupSelected = () => {},
    onSetAxisConstraint = () => {},
    onToggleTransformSpace = () => {},
    onEscape = () => {},
    onToggleMultiSelect = () => {},
    onMarqueeSelect = () => {},
    onFocusSelection = () => {},
    onContextPick = () => {},
    background = '#0d1b2a',
    showGround = true,
}) {
    const canvasRef = useRef(null);
    const appRef = useRef(null);
    const cameraRef = useRef(null);
    const objectEntitiesRef = useRef(new Map());
    const objectColorsRef = useRef(new Map());
    const gizmoRootRef = useRef(null);
    const gizmoHandlesRef = useRef(new Map());
    const externalModelRootRef = useRef(new Map());
    const externalLoadStateRef = useRef(new Map());
    const externalFitRef = useRef(new Map());
    const selectionOutlineRef = useRef(null);
    const gizmoBaseColorsRef = useRef(new Map());
    const selectedIdRef = useRef(selectedId);
    const activeToolRef = useRef(activeTool);
    const objectsRef = useRef(objects);
    const objectSnapEnabledRef = useRef(objectSnapEnabled);
    const pendingDragUpdateRef = useRef(null);
    const dragRafRef = useRef(null);
    const [marqueeRect, setMarqueeRect] = useState(null);
    const [marqueeIncludeOccluded, setMarqueeIncludeOccluded] = useState(false);

    const effectiveObjects = useMemo(
        () => objects.filter((o) => o?.type !== 'ground' && Array.isArray(o?.position)),
        [objects]
    );

    useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    useEffect(() => {
        activeToolRef.current = activeTool;
    }, [activeTool]);

    useEffect(() => {
        objectSnapEnabledRef.current = objectSnapEnabled;
    }, [objectSnapEnabled]);

    useEffect(() => {
        objectsRef.current = effectiveObjects;
    }, [effectiveObjects]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const app = new pc.Application(canvas, {
            mouse: new pc.Mouse(canvas),
            touch: new pc.TouchDevice(canvas),
            keyboard: new pc.Keyboard(window),
            graphicsDeviceOptions: {
                antialias: true,
                alpha: false,
                preserveDrawingBuffer: true,
            },
        });

        app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
        app.setCanvasResolution(pc.RESOLUTION_AUTO);
        app.start();
        appRef.current = app;

        const bg = new pc.Color().fromString(background);

        const camera = new pc.Entity('camera');
        camera.addComponent('camera', {
            clearColor: bg,
            farClip: 2000,
        });
        camera.setLocalPosition(8, 8, 8);
        app.root.addChild(camera);
        cameraRef.current = camera;

        const light = new pc.Entity('light');
        light.addComponent('light', {
            type: 'directional',
            intensity: 1.1,
            castShadows: false,
        });
        light.setLocalEulerAngles(45, 35, 0);
        app.root.addChild(light);

        const ambientLight = new pc.Entity('ambient');
        ambientLight.addComponent('light', {
            type: 'omni',
            intensity: 0.2,
            range: 200,
        });
        ambientLight.setLocalPosition(0, 20, 0);
        app.root.addChild(ambientLight);

        if (showGround) {
            const ground = new pc.Entity('ground');
            ground.addComponent('render', { type: 'plane' });
            ground.setLocalScale(200, 1, 200);
            ground.setLocalPosition(0, -0.02, 0);
            const m = new pc.StandardMaterial();
            m.diffuse = new pc.Color(0.74, 0.79, 0.87);
            m.roughness = 1;
            m.metalness = 0;
            m.update();
            ground.render.material = m;
            app.root.addChild(ground);
        }

        const orbitState = createOrbitCameraState();
        const interaction = createInteractionState();
        interaction.dragOffset = new pc.Vec3(0, 0, 0);

        const axisDirForObject = (obj, axis) => {
            const base =
                axis === 'x' ? new pc.Vec3(1, 0, 0) :
                    axis === 'y' ? new pc.Vec3(0, 1, 0) :
                        new pc.Vec3(0, 0, 1);
            if (transformSpace !== 'local') return base;
            const r = obj?.rotation || [0, 0, 0];
            const q = new pc.Quat();
            q.setFromEulerAngles(
                (r[0] * 180) / Math.PI,
                (r[1] * 180) / Math.PI,
                (r[2] * 180) / Math.PI
            );
            return q.transformVector(base, new pc.Vec3()).normalize();
        };

        const updateCamera = () => updateOrbitCameraTransform(camera, orbitState);

        const gizmoRoot = createGizmoRoot(app, gizmoHandlesRef, gizmoBaseColorsRef);
        gizmoRootRef.current = gizmoRoot;

        selectionOutlineRef.current = createSelectionOutline(app);

        const raySphereHitDistance = (rayOrigin, rayDir, center, radius) => {
            const oc = rayOrigin.clone().sub(center);
            const a = rayDir.dot(rayDir);
            const b = 2 * oc.dot(rayDir);
            const c = oc.dot(oc) - radius * radius;
            const disc = b * b - 4 * a * c;
            if (disc < 0) return Infinity;
            const s = Math.sqrt(disc);
            const t1 = (-b - s) / (2 * a);
            const t2 = (-b + s) / (2 * a);
            if (t1 > 0) return t1;
            if (t2 > 0) return t2;
            return Infinity;
        };

        const pickObjectAt = (x, y) =>
            pickObjectAtScreen({
                x,
                y,
                camera,
                objects: objectsRef.current,
                objectEntitiesRef,
                raySphereHitDistance,
            });

        const pickGizmoHandleAt = (x, y) => {
            const id = selectedIdRef.current;
            if (!id) return null;
            const obj = objectsRef.current.find((o) => o.id === id);
            if (!obj) return null;
            const camComp = camera.camera;
            if (!camComp) return null;
            const from = camComp.screenToWorld(x, y, camComp.nearClip);
            const to = camComp.screenToWorld(x, y, camComp.farClip);
            const dir = to.clone().sub(from).normalize();
            const p = obj.position || [0, 0, 0];
            const axisLen = 1;
            const tool = activeToolRef.current;
            const checks = tool === 'move' ? [
                { axis: 'x', center: new pc.Vec3(p[0] + axisLen, p[1], p[2]) },
                { axis: 'y', center: new pc.Vec3(p[0], p[1] + axisLen, p[2]) },
                { axis: 'z', center: new pc.Vec3(p[0], p[1], p[2] + axisLen) },
            ] : tool === 'rotate'
                ? [{ axis: 'ry', center: new pc.Vec3(p[0], p[1] + 0.2, p[2]) }]
                : tool === 'scale'
                    ? [{ axis: 's', center: new pc.Vec3(p[0] + 0.65, p[1] + 0.65, p[2] + 0.65) }]
                    : [];
            let bestAxis = null;
            let bestDist = Infinity;
            checks.forEach((c) => {
                const d = raySphereHitDistance(from, dir, c.center, 0.28);
                if (d < bestDist) {
                    bestDist = d;
                    bestAxis = c.axis;
                }
            });
            return bestDist < Infinity ? bestAxis : null;
        };


        const onMouseDown = (e) => {
            if (e.button === 1) interaction.isCameraDragging = true;
            if (e.button === 2) {
                const picked = pickObjectAt(e.x, e.y);
                onContextPick(picked?.id || null);
                return;
            }
            if (e.button === 0) {
                const toggleSelect = e.shiftKey || e.ctrlKey || e.metaKey;
                const hitAxis = pickGizmoHandleAt(e.x, e.y);
                if (hitAxis) {
                    const st = objectsRef.current.find((o) => o.id === selectedIdRef.current);
                    interaction.dragObjectId = st?.id || null;
                    interaction.dragMode = hitAxis === 's' ? 'scale' : hitAxis === 'ry' ? 'rotate' : 'move-axis';
                    interaction.dragAxis = interaction.dragMode === 'move-axis' ? hitAxis : null;
                    interaction.dragAxisBase = st ? [...(st.position || [0, 0, 0])] : null;
                    interaction.dragAxisDir = st && interaction.dragAxis ? axisDirForObject(st, interaction.dragAxis) : null;
                    interaction.dragStartX = e.x;
                    interaction.dragStartY = e.y;
                    interaction.dragStartRotation = st ? [...(st.rotation || [0, 0, 0])] : null;
                    interaction.dragStartScale = st ? [...(st.scale || [1, 1, 1])] : null;
                    return;
                }
                const picked = pickObjectAt(e.x, e.y);
                if (picked?.id && toggleSelect) onToggleMultiSelect(picked.id);
                else onSelectObject(picked?.id || null);
                if (picked?.id && e.detail >= 2) {
                    onFrameSelection('selection');
                }
                if (!picked && e.shiftKey) {
                    interaction.isMarqueeSelecting = true;
                    interaction.marqueeMode = e.altKey ? 'subtract' : 'add';
                    interaction.marqueeStart = { x: e.x, y: e.y };
                    interaction.marqueeEnd = { x: e.x, y: e.y };
                    setMarqueeRect({ x: e.x, y: e.y, w: 0, h: 0 });
                    return;
                }
                if (!picked && e.altKey) {
                    interaction.isMarqueeSelecting = true;
                    interaction.marqueeMode = 'subtract';
                    interaction.marqueeStart = { x: e.x, y: e.y };
                    interaction.marqueeEnd = { x: e.x, y: e.y };
                    setMarqueeRect({ x: e.x, y: e.y, w: 0, h: 0 });
                    return;
                }
                if (picked && activeToolRef.current === 'move') {
                    interaction.dragObjectId = picked.id;
                    interaction.dragMode = 'plane-move';
                    const planeHit = intersectPointerPlane(camera, e.x, e.y, 0);
                    if (planeHit) {
                        interaction.dragOffset = new pc.Vec3(
                            (picked.position?.[0] || 0) - planeHit.x,
                            (picked.position?.[1] || 0),
                            (picked.position?.[2] || 0) - planeHit.z
                        );
                    }
                } else {
                    interaction.isCameraDragging = true;
                }
            }
        };

        const snapValue = (n, step = 0.25) => Math.round(n / step) * step;

        const onMouseUp = () => {
            if (interaction.isMarqueeSelecting && interaction.marqueeStart && interaction.marqueeEnd) {
                const hitIds = computeMarqueeHitIds({
                    camera: camera.camera,
                    cameraEntity: camera,
                    marqueeStart: interaction.marqueeStart,
                    marqueeEnd: interaction.marqueeEnd,
                    objects: objectsRef.current,
                    objectEntitiesRef,
                    marqueeIncludeOccluded,
                });
                onMarqueeSelect(hitIds, interaction.marqueeMode);
            }
            resetInteractionState(interaction);
            interaction.dragOffset = new pc.Vec3(0, 0, 0);
            setMarqueeRect(null);
        };

        const onMouseMove = (e) => {
            const isSameNumberArray = (a, b) => (
                Array.isArray(a) &&
                Array.isArray(b) &&
                a.length === b.length &&
                a.every((v, i) => Number(v) === Number(b[i]))
            );
            const isNoopUpdate = (obj, updates) => {
                if (!obj || !updates) return true;
                if (updates.position && !isSameNumberArray(updates.position, obj.position || [])) return false;
                if (updates.rotation && !isSameNumberArray(updates.rotation, obj.rotation || [])) return false;
                if (updates.scale && !isSameNumberArray(updates.scale, obj.scale || [])) return false;
                const keys = Object.keys(updates);
                return keys.every((k) => k === 'position' || k === 'rotation' || k === 'scale');
            };
            const scheduleDragUpdate = (id, updates) => {
                if (!id || !updates) return;
                const obj = objectsRef.current.find((o) => o.id === id);
                if (isNoopUpdate(obj, updates)) return;
                pendingDragUpdateRef.current = { id, updates };
                if (dragRafRef.current != null) return;
                dragRafRef.current = window.requestAnimationFrame(() => {
                    dragRafRef.current = null;
                    const payload = pendingDragUpdateRef.current;
                    pendingDragUpdateRef.current = null;
                    if (payload?.id && payload?.updates) onUpdateObject(payload.id, payload.updates);
                });
            };

            if (interaction.isMarqueeSelecting && interaction.marqueeStart) {
                interaction.marqueeEnd = { x: e.x, y: e.y };
                setMarqueeRect(computeMarqueeRect(interaction.marqueeStart, interaction.marqueeEnd));
                return;
            }
            const hoverKey = pickGizmoHandleAt(e.x, e.y);
            applyGizmoHighlight(
                gizmoHandlesRef,
                gizmoBaseColorsRef,
                hoverKey,
                interaction.dragMode === 'move-axis' ? interaction.dragAxis : interaction.dragMode === 'rotate' ? 'ry' : interaction.dragMode === 'scale' ? 's' : null
            );
            if (interaction.dragMode === 'rotate' && interaction.dragObjectId && interaction.dragStartRotation) {
                const obj = objectsRef.current.find((o) => o.id === interaction.dragObjectId);
                if (!obj) return;
                scheduleDragUpdate(
                    interaction.dragObjectId,
                    computeDragRotateUpdate(obj, interaction.dragStartRotation, interaction.dragStartX, e.x, objectSnapEnabledRef.current !== false)
                );
                return;
            }
            if (interaction.dragMode === 'scale' && interaction.dragObjectId && interaction.dragStartScale) {
                const obj = objectsRef.current.find((o) => o.id === interaction.dragObjectId);
                if (!obj) return;
                scheduleDragUpdate(interaction.dragObjectId, computeDragScaleUpdate(obj, interaction.dragStartScale, interaction.dragStartY, e.y));
                return;
            }
            if (interaction.dragMode === 'move-axis' && interaction.dragAxis && interaction.dragObjectId && interaction.dragAxisBase) {
                const obj = objectsRef.current.find((o) => o.id === interaction.dragObjectId);
                if (!obj) return;
                const hit = closestPointOnAxisFromPointer(
                    camera,
                    e.x,
                    e.y,
                    interaction.dragAxis,
                    interaction.dragAxisBase,
                    interaction.dragAxisDir
                );
                if (!hit) return;
                scheduleDragUpdate(
                    interaction.dragObjectId,
                    computeDragAxisMoveUpdate(
                        obj,
                        interaction.dragAxis,
                        hit,
                        objectSnapEnabledRef.current !== false,
                        snapValue,
                        interaction.dragAxisDir,
                        interaction.dragAxisBase
                    )
                );
                return;
            }
            if (interaction.dragMode === 'plane-move' && interaction.dragObjectId && activeToolRef.current === 'move') {
                const hit = intersectPointerPlane(camera, e.x, e.y, 0);
                if (!hit) return;
                const obj = objectsRef.current.find((o) => o.id === interaction.dragObjectId);
                if (!obj) return;
                scheduleDragUpdate(
                    interaction.dragObjectId,
                    computeDragPlaneMoveUpdate({
                        obj,
                        dragOffset: interaction.dragOffset,
                        hitPoint: hit,
                        axisConstraint,
                        objectEntitiesRef,
                        dragObjectId: interaction.dragObjectId,
                        snapEnabled: objectSnapEnabledRef.current !== false,
                        snapValue,
                    })
                );
                return;
            }
            if (!interaction.isCameraDragging) return;
            orbitRotateByMouse(orbitState, e.dx, e.dy);
            updateCamera();
        };
        const onMouseWheel = (e) => {
            orbitZoomByWheel(orbitState, e.wheel);
            updateCamera();
            e.event.preventDefault();
        };

        app.mouse.on('mousedown', onMouseDown);
        app.mouse.on('mouseup', onMouseUp);
        app.mouse.on('mousemove', onMouseMove);
        app.mouse.on('mousewheel', onMouseWheel);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('blur', onMouseUp);

        const onResize = () => app.resizeCanvas();
        window.addEventListener('resize', onResize);

        const onKeyDown = (e) => {
            const action = resolvePlayCanvasHotkey(e);
            if (!action) return;
            e.preventDefault();
            if (action === 'escape') {
                resetInteractionState(interaction);
                interaction.dragOffset = new pc.Vec3(0, 0, 0);
                setMarqueeRect(null);
                onEscape();
                return;
            }
            if (action === 'undo') return onUndo();
            if (action === 'redo') return onRedo();
            if (action === 'duplicate') return onDuplicateSelected();
            if (action === 'toggleTransformSpace') return onToggleTransformSpace();
            if (action === 'ungroup') return onUngroupSelected();
            if (action === 'group') return onGroupSelected();
            if (action === 'copy') return onCopySelected();
            if (action === 'paste') return onPasteClipboard();
            if (action === 'selectAll') return onSelectAll();
            if (action === 'delete') return onDeleteSelected();
            if (action === 'frameAll') return onFrameSelection('all');
            if (action === 'frameSelection') return onFrameSelection('selection');
            if (action === 'toggleMarqueeMode') return setMarqueeIncludeOccluded((v) => !v);
            if (action.startsWith('axis:')) return onSetAxisConstraint(action.split(':')[1]);
            if (action === 'focusSelection') return onFocusSelection();
        };
        window.addEventListener('keydown', onKeyDown);

        const transformSpeed = {
            move: 0.08,
            rotate: (3 * Math.PI) / 180,
            scale: 0.015,
        };

        const applyTransformInput = (dt) => {
            const id = selectedIdRef.current;
            if (!id) return;
            const tool = activeToolRef.current;
            if (tool !== 'move' && tool !== 'rotate' && tool !== 'scale') return;
            const obj = objectsRef.current.find((o) => o.id === id);
            if (!obj) return;

            const left = app.keyboard.isPressed(pc.KEY_LEFT) || app.keyboard.isPressed(pc.KEY_A);
            const right = app.keyboard.isPressed(pc.KEY_RIGHT) || app.keyboard.isPressed(pc.KEY_D);
            const up = app.keyboard.isPressed(pc.KEY_UP) || app.keyboard.isPressed(pc.KEY_W);
            const down = app.keyboard.isPressed(pc.KEY_DOWN) || app.keyboard.isPressed(pc.KEY_S);
            const rise = app.keyboard.isPressed(pc.KEY_R);
            const fall = app.keyboard.isPressed(pc.KEY_F);
            const shrink = app.keyboard.isPressed(pc.KEY_Q) || app.keyboard.isPressed(pc.KEY_Z);
            const grow = app.keyboard.isPressed(pc.KEY_E) || app.keyboard.isPressed(pc.KEY_X);

            const keys = { left, right, up, down, rise, fall, shrink, grow };
            if (tool === 'move') {
                const updates = computeMoveUpdate({
                    obj,
                    keys,
                    axisConstraint,
                    step: transformSpeed.move,
                    snapEnabled: objectSnapEnabledRef.current !== false,
                    snapValue,
                    localAxes: transformSpace === 'local'
                        ? {
                            x: (() => {
                                const v = axisDirForObject(obj, 'x');
                                return [v.x, v.y, v.z];
                            })(),
                            y: (() => {
                                const v = axisDirForObject(obj, 'y');
                                return [v.x, v.y, v.z];
                            })(),
                            z: (() => {
                                const v = axisDirForObject(obj, 'z');
                                return [v.x, v.y, v.z];
                            })(),
                        }
                        : null,
                });
                if (updates) onUpdateObject(id, updates);
                return;
            }
            if (tool === 'rotate') {
                const updates = computeRotateUpdate({
                    obj,
                    keys,
                    axisConstraint,
                    step: transformSpeed.rotate * Math.max(1, dt * 60),
                    snapEnabled: objectSnapEnabledRef.current !== false,
                });
                if (updates) onUpdateObject(id, updates);
                return;
            }
            if (tool === 'scale') {
                const updates = computeScaleUpdate({
                    obj,
                    keys,
                    axisConstraint,
                    step: transformSpeed.scale,
                });
                if (updates) onUpdateObject(id, updates);
            }
        };

        app.on('update', (dt) => {
            orbitPanByKeyboard(orbitState, dt, app);
            applyTransformInput(dt);
            updateCamera();
        });

        updateCamera();

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('blur', onMouseUp);
            if (dragRafRef.current != null) {
                window.cancelAnimationFrame(dragRafRef.current);
                dragRafRef.current = null;
            }
            pendingDragUpdateRef.current = null;
            objectEntitiesRef.current.clear();
            objectColorsRef.current.clear();
            gizmoHandlesRef.current.clear();
            gizmoBaseColorsRef.current.clear();
            externalModelRootRef.current.forEach((modelRoot) => {
                try { modelRoot.destroy(); } catch (_) { /* noop */ }
            });
            externalModelRootRef.current.clear();
            externalLoadStateRef.current.clear();
            externalFitRef.current.clear();
            if (selectionOutlineRef.current) {
                try { selectionOutlineRef.current.destroy(); } catch (_) { /* noop */ }
                selectionOutlineRef.current = null;
            }
            gizmoRootRef.current = null;
            cameraRef.current = null;
            appRef.current = null;
            app.destroy();
        };
    }, [axisConstraint, background, marqueeIncludeOccluded, onContextPick, onCopySelected, onDeleteSelected, onDuplicateSelected, onEscape, onFocusSelection, onFrameSelection, onGroupSelected, onMarqueeSelect, onPasteClipboard, onRedo, onSelectAll, onSelectObject, onSetAxisConstraint, onToggleMultiSelect, onToggleTransformSpace, onUndo, onUngroupSelected, onUpdateObject, showGround, transformSpace]);

    useEffect(() => {
        const app = appRef.current;
        if (!app) return;

        const entities = objectEntitiesRef.current;
        const liveIds = new Set(effectiveObjects.map((o) => o.id));

        entities.forEach((ent, id) => {
            if (!liveIds.has(id)) {
                ent.destroy();
                entities.delete(id);
                objectColorsRef.current.delete(id);
                cleanupOrphanedExternal([id], externalModelRootRef, externalLoadStateRef, externalFitRef);
            }
        });

        effectiveObjects.forEach((obj) => {
            let ent = entities.get(obj.id);
            if (!ent) {
                ent = new pc.Entity(`obj-${obj.id}`);
                const primitiveType = (
                    obj.type === 'sphere' ||
                    obj.type === 'cylinder' ||
                    obj.type === 'cone' ||
                    obj.type === 'capsule' ||
                    obj.type === 'plane'
                ) ? obj.type : 'box';
                ent.addComponent('render', { type: primitiveType });
                entities.set(obj.id, ent);
                app.root.addChild(ent);
            }
            const dims = obj.dimensions || [1, 1, 1];
            const scale = obj.scale || [1, 1, 1];
            const pos = obj.position || [0, 0, 0];
            const rot = obj.rotation || [0, 0, 0];

            ent.setLocalScale(
                Math.max(0.05, Math.abs(dims[0] * scale[0])),
                Math.max(0.05, Math.abs(dims[1] * scale[1])),
                Math.max(0.05, Math.abs(dims[2] * scale[2]))
            );
            ent.setLocalPosition(pos[0], pos[1], pos[2]);
            ent.setLocalEulerAngles(
                (rot[0] * 180) / Math.PI,
                (rot[1] * 180) / Math.PI,
                (rot[2] * 180) / Math.PI
            );

            let mat = ent.render.material;
            if (!mat) {
                mat = new pc.StandardMaterial();
                ent.render.material = mat;
            }
            const baseHex = typeof obj.color === 'string' ? obj.color : '#8b5cf6';
            if (objectColorsRef.current.get(obj.id) !== baseHex) {
                const c = new pc.Color().fromString(baseHex);
                mat.diffuse = c;
                objectColorsRef.current.set(obj.id, baseHex);
            }
            const isSelected = selectedId === obj.id;
            const isExternalAsset = isExternalType(obj);
            const hasLoadedExternal = externalModelRootRef.current.has(obj.id);
            if (isExternalAsset) {
                mat.diffuse = new pc.Color(0.58, 0.64, 0.76);
            }
            mat.emissive = isSelected ? new pc.Color(0.2, 0.35, 0.8) : new pc.Color(0, 0, 0);
            mat.metalness = isSelected ? 0.45 : (isExternalAsset ? 0.3 : 0.15);
            mat.roughness = isSelected ? 0.2 : (isExternalAsset ? 0.45 : 0.7);
            ent.render.enabled = !hasLoadedExternal;
            mat.update();

        });

        syncExternalLoads(
            app,
            effectiveObjects,
            entities,
            externalModelRootRef,
            externalLoadStateRef,
            externalFitRef
        );

        fitExternalModels(effectiveObjects, externalModelRootRef, externalFitRef);

        const gizmoRoot = gizmoRootRef.current;
        if (!gizmoRoot) return;
        const selectedObj = selectedId ? effectiveObjects.find((o) => o.id === selectedId) : null;
        updateGizmoPresentation(gizmoRoot, gizmoHandlesRef, selectedObj, activeTool, cameraRef.current, transformSpace);

        updateSelectionOutline(selectionOutlineRef.current, selectedObj);
    }, [effectiveObjects, selectedId, activeTool, transformSpace]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block' }}
                aria-label="PlayCanvas viewport"
            />
            {marqueeRect && (
                <div
                    style={{
                        position: 'absolute',
                        left: marqueeRect.x,
                        top: marqueeRect.y,
                        width: marqueeRect.w,
                        height: marqueeRect.h,
                        pointerEvents: 'none',
                        border: '1px solid rgba(56, 189, 248, 0.85)',
                        background: 'rgba(56, 189, 248, 0.12)',
                        boxShadow: '0 0 0 1px rgba(2, 132, 199, 0.3) inset',
                        zIndex: 15,
                    }}
                />
            )}
            <div
                style={{
                    position: 'absolute',
                    right: 12,
                    bottom: 12,
                    zIndex: 16,
                    pointerEvents: 'none',
                    padding: '6px 9px',
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    color: '#dbeafe',
                    background: 'rgba(2, 6, 23, 0.78)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                }}
            >
                Marquee: {marqueeIncludeOccluded ? 'X-Ray' : 'Visible'} (Alt+M)
            </div>
            <div
                style={{
                    position: 'absolute',
                    right: 12,
                    bottom: 38,
                    zIndex: 16,
                    pointerEvents: 'none',
                    padding: '5px 8px',
                    borderRadius: 7,
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#cbd5e1',
                    background: 'rgba(15, 23, 42, 0.72)',
                    border: '1px solid rgba(100, 116, 139, 0.35)',
                }}
            >
                Shift+drag: add | Alt+drag: subtract
            </div>
        </div>
    );
}
