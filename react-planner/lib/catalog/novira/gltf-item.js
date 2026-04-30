'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.noviraCatalogElementName = noviraCatalogElementName;
exports.cloneGltfItemForEntry = cloneGltfItemForEntry;

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _three = require('three');

var THREE = _interopRequireWildcard(_three);

var _GLTFLoader = require('three/examples/jsm/loaders/GLTFLoader.js');

var _sharedStyle = require('../../shared-style');

var SharedStyle = _interopRequireWildcard(_sharedStyle);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PLACEHOLDER_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function resolveModelUrl(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw.toJS === 'function') {
    var j = raw.toJS();
    if (typeof j === 'string') return j.trim();
    if (j && typeof j.defaultValue === 'string') return j.defaultValue.trim();
  }
  if ((typeof raw === 'undefined' ? 'undefined' : _typeof(raw)) === 'object' && typeof raw.defaultValue === 'string') return raw.defaultValue.trim();
  return String(raw).trim();
}

function noviraGltfPlaceholderGroup() {
  var g = new THREE.Group();
  var box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true }));
  g.add(box);
  return g;
}

/**
 * Base catalog definition for Novira-supplied GLB/GLTF URLs.
 * Cloned per user model in createNoviraIntegratedCatalog with unique `name` + defaults.
 */
var gltfItemBase = {
  prototype: 'items',

  info: {
    tag: ['Novira'],
    title: '3D model',
    description: 'GLB/GLTF from Novira library',
    image: PLACEHOLDER_IMG
  },

  properties: {
    modelUrl: {
      label: 'Model URL',
      type: 'string',
      defaultValue: ''
    },
    width: {
      label: 'Width',
      type: 'length-measure',
      defaultValue: { length: 100, unit: 'cm' }
    },
    depth: {
      label: 'Depth',
      type: 'length-measure',
      defaultValue: { length: 100, unit: 'cm' }
    },
    height: {
      label: 'Height',
      type: 'length-measure',
      defaultValue: { length: 100, unit: 'cm' }
    },
    altitude: {
      label: 'Altitude',
      type: 'length-measure',
      defaultValue: { length: 0, unit: 'cm' }
    }
  },

  render2D: function render2D(element) {
    var w = element.properties.getIn(['width', 'length']) || 100;
    var d = element.properties.getIn(['depth', 'length']) || 100;
    var w2 = w / 2;
    var d2 = d / 2;
    var stroke = element.selected ? SharedStyle.MESH_SELECTED : SharedStyle.LINE_MESH_COLOR.unselected;
    return _react2.default.createElement(
      'g',
      { transform: 'translate(-' + w2 + ', -' + d2 + ')' },
      _react2.default.createElement('rect', { x: '0', y: '0', width: w, height: d, style: { stroke: stroke, strokeWidth: 2, fill: 'rgba(124,58,237,0.15)' } })
    );
  },
  render3D: function render3D(element) {
    var url = resolveModelUrl(element.properties.get('modelUrl'));
    if (!url) {
      return Promise.resolve(noviraGltfPlaceholderGroup());
    }

    var loader = new _GLTFLoader.GLTFLoader();
    return new Promise(function (resolve) {
      loader.load(url, function (gltf) {
        try {
          var root = gltf.scene || new THREE.Group();
          var box = new THREE.Box3().setFromObject(root);
          var size = new THREE.Vector3();
          box.getSize(size);
          var maxDim = Math.max(size.x, size.y, size.z) || 1;
          var targetW = (element.properties.getIn(['width', 'length']) || 100) / 100;
          var scale = targetW / maxDim;
          root.scale.multiplyScalar(scale);

          if (element.selected) {
            var helper = new _three.BoxHelper(root, SharedStyle.MESH_SELECTED);
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
      }, undefined, function (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Novira planner] GLTF preview load failed (network/CORS/revoked blob). Placeholder used.', url, err && err.message ? err.message : err);
        }
        resolve(noviraGltfPlaceholderGroup());
      });
    });
  }
};

exports.default = gltfItemBase;

/** Stable catalog element name for a user model entry (must match category registration). */

function noviraCatalogElementName(entry) {
  var safeId = String(entry.id || entry.url || 'model').replace(/[^a-zA-Z0-9_-]/g, '');
  return 'novira-model-' + safeId;
}

function cloneGltfItemForEntry(entry) {
  var name = noviraCatalogElementName(entry);
  return _extends({}, gltfItemBase, {
    name: name,
    info: _extends({}, gltfItemBase.info, {
      title: entry.name || 'Model',
      description: entry.source ? (entry.name || 'Model') + ' \xB7 ' + entry.source : entry.name || '',
      image: entry.thumbnail || gltfItemBase.info.image
    }),
    properties: _extends({}, gltfItemBase.properties, {
      modelUrl: _extends({}, gltfItemBase.properties.modelUrl, {
        defaultValue: entry.url || ''
      })
    })
  });
}