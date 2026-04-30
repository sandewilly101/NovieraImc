import * as Three from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { List } from 'immutable';
import { COLORS } from '../../../shared-style';

export default function (width, height, grid, font) {
  let step = grid.properties.get('step');
  let colors = grid.properties.has('color') ? new List([grid.properties.get('color')]) : grid.properties.get('colors');

  let streak = new Three.Object3D();
  streak.name = 'streak';

  let counter = 0;

  for (let i = 0; i <= width; i += step) {

    let positions = new Float32Array([
      i, 0, 0,
      i, 0, -height
    ]);
    let geometry = new Three.BufferGeometry();
    geometry.setAttribute('position', new Three.BufferAttribute(positions, 3));
    let color = colors.get(counter % colors.size);
    let material = new Three.LineBasicMaterial({ color });

    if (counter % 5 == 0) {
      let shape = new TextGeometry(('' + (counter * step)), {
        font: font,
        size: 16,
        depth: 1
      });

      let wrapper = new Three.MeshBasicMaterial({ color: COLORS.black });
      let words = new Three.Mesh(shape, wrapper);

      words.rotation.x -= Math.PI / 2;
      words.position.set(i - 20, 0, 50);
      streak.add(words);
    }

    streak.add(new Three.LineSegments(geometry, material));
    counter++;
  }
  return streak;
}
