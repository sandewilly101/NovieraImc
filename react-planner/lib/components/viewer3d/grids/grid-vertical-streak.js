'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (width, height, grid, font) {
  var step = grid.properties.get('step');
  var colors = grid.properties.has('color') ? new _immutable.List([grid.properties.get('color')]) : grid.properties.get('colors');

  var streak = new Three.Object3D();
  streak.name = 'streak';

  var counter = 0;

  for (var i = 0; i <= width; i += step) {

    var positions = new Float32Array([i, 0, 0, i, 0, -height]);
    var geometry = new Three.BufferGeometry();
    geometry.setAttribute('position', new Three.BufferAttribute(positions, 3));
    var color = colors.get(counter % colors.size);
    var material = new Three.LineBasicMaterial({ color: color });

    if (counter % 5 == 0) {
      var shape = new _TextGeometry.TextGeometry('' + counter * step, {
        font: font,
        size: 16,
        depth: 1
      });

      var wrapper = new Three.MeshBasicMaterial({ color: _sharedStyle.COLORS.black });
      var words = new Three.Mesh(shape, wrapper);

      words.rotation.x -= Math.PI / 2;
      words.position.set(i - 20, 0, 50);
      streak.add(words);
    }

    streak.add(new Three.LineSegments(geometry, material));
    counter++;
  }
  return streak;
};

var _three = require('three');

var Three = _interopRequireWildcard(_three);

var _TextGeometry = require('three/examples/jsm/geometries/TextGeometry.js');

var _immutable = require('immutable');

var _sharedStyle = require('../../../shared-style');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }