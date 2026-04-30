import * as Three from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { List } from 'immutable';
import { COLORS } from '../../../shared-style';

export default function (width, height, grid, font) {
  var step = grid.properties.get('step');
  var colors = grid.properties.has('color') ? new List([grid.properties.get('color')]) : grid.properties.get('colors');

  var streak = new Three.Object3D();
  streak.name = 'streak';
  var counter = 0;

  for (var i = 0; i <= height; i += step) {

    var positions = new Float32Array([0, 0, -i, width, 0, -i]);
    var geometry = new Three.BufferGeometry();
    geometry.setAttribute('position', new Three.BufferAttribute(positions, 3));
    var color = colors.get(counter % colors.size);
    var material = new Three.LineBasicMaterial({ color: color });

    if (counter % 5 == 0) {
      var shape = new TextGeometry('' + counter * step, {
        font: font,
        size: 16,
        depth: 1
      });

      var wrapper = new Three.MeshBasicMaterial({ color: COLORS.black });
      var words = new Three.Mesh(shape, wrapper);

      words.rotation.x -= Math.PI / 2;
      words.position.set(-90, 0, -i);
      streak.add(words);
    }

    streak.add(new Three.LineSegments(geometry, material));
    counter++;
  }
  return streak;
}