import React from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BoxHelper } from 'three';
import * as SharedStyle from '../../shared-style';

const PLACEHOLDER_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function resolveModelUrl(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw.toJS === 'function') {
    const j = raw.toJS();
    if (typeof j === 'string') return j.trim();
    if (j && typeof j.defaultValue === 'string') return j.defaultValue.trim();
  }
  if (typeof raw === 'object' && typeof raw.defaultValue === 'string') return raw.defaultValue.trim();
  return String(raw).trim();
}

function noviraGltfPlaceholderGroup() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true })
  );
  g.add(box);
  return g;
}

/**
 * Base catalog definition for Novira-supplied GLB/GLTF URLs.
 * Cloned per user model in createNoviraIntegratedCatalog with unique `name` + defaults.
 */
const gltfItemBase = {
  prototype: 'items',

  info: {
    tag: ['Novira'],
    title: '3D model',
    description: 'GLB/GLTF from Novira library',
    image: PLACEHOLDER_IMG,
  },

  properties: {
    modelUrl: {
      label: 'Model URL',
      type: 'string',
      defaultValue: '',
    },
    width: {
      label: 'Width',
      type: 'length-measure',
      defaultValue: { length: 100, unit: 'cm' },
    },
    depth: {
      label: 'Depth',
      type: 'length-measure',
      defaultValue: { length: 100, unit: 'cm' },
    },
    height: {
      label: 'Height',
      type: 'length-measure',
      defaultValue: { length: 100, unit: 'cm' },
    },
    altitude: {
      label: 'Altitude',
      type: 'length-measure',
      defaultValue: { length: 0, unit: 'cm' },
    },
  },

  render2D(element) {
    const w = element.properties.getIn(['width', 'length']) || 100;
    const d = element.properties.getIn(['depth', 'length']) || 100;
    const w2 = w / 2;
    const d2 = d / 2;
    const stroke = element.selected ? SharedStyle.MESH_SELECTED : SharedStyle.LINE_MESH_COLOR.unselected;
    return (
      <g transform={`translate(-${w2}, -${d2})`}>
        <rect x="0" y="0" width={w} height={d} style={{ stroke, strokeWidth: 2, fill: 'rgba(124,58,237,0.15)' }} />
      </g>
    );
  },

  render3D(element) {
    const url = resolveModelUrl(element.properties.get('modelUrl'));
    if (!url) {
      return Promise.resolve(noviraGltfPlaceholderGroup());
    }

    const loader = new GLTFLoader();
    return new Promise((resolve) => {
      loader.load(
        url,
        (gltf) => {
          try {
            const root = gltf.scene || new THREE.Group();
            const box = new THREE.Box3().setFromObject(root);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const targetW = (element.properties.getIn(['width', 'length']) || 100) / 100;
            const scale = targetW / maxDim;
            root.scale.multiplyScalar(scale);

            if (element.selected) {
              const helper = new BoxHelper(root, SharedStyle.MESH_SELECTED);
              helper.material.linewidth = 2;
              helper.renderOrder = 1000;
              root.add(helper);
            }
            resolve(root);
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[Novira planner] GLTF preview post-process failed; placeholder used.', url, e);
            }
            resolve(noviraGltfPlaceholderGroup());
          }
        },
        undefined,
        (err) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[Novira planner] GLTF preview load failed (network/CORS/revoked blob). Placeholder used.',
              url,
              err && err.message ? err.message : err
            );
          }
          resolve(noviraGltfPlaceholderGroup());
        }
      );
    });
  },
};

export default gltfItemBase;

/** Stable catalog element name for a user model entry (must match category registration). */
export function noviraCatalogElementName(entry) {
  const safeId = String(entry.id || entry.url || 'model').replace(/[^a-zA-Z0-9_-]/g, '');
  return `novira-model-${safeId}`;
}

export function cloneGltfItemForEntry(entry) {
  const name = noviraCatalogElementName(entry);
  return {
    ...gltfItemBase,
    name,
    info: {
      ...gltfItemBase.info,
      title: entry.name || 'Model',
      description: entry.source ? `${entry.name || 'Model'} · ${entry.source}` : entry.name || '',
      image: entry.thumbnail || gltfItemBase.info.image,
    },
    properties: {
      ...gltfItemBase.properties,
      modelUrl: {
        ...gltfItemBase.properties.modelUrl,
        defaultValue: entry.url || '',
      },
    },
  };
}
