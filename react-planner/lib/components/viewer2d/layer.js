'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Layer;

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _propTypes = require('prop-types');

var _propTypes2 = _interopRequireDefault(_propTypes);

var _line = require('./line');

var _line2 = _interopRequireDefault(_line);

var _area = require('./area');

var _area2 = _interopRequireDefault(_area);

var _vertex = require('./vertex');

var _vertex2 = _interopRequireDefault(_vertex);

var _item = require('./item');

var _item2 = _interopRequireDefault(_item);

var _group = require('./group');

var _group2 = _interopRequireDefault(_group);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Layer(_ref) {
  var layer = _ref.layer,
      scene = _ref.scene,
      catalog = _ref.catalog;
  var unit = scene.unit,
      groups = scene.groups;
  var lines = layer.lines,
      areas = layer.areas,
      vertices = layer.vertices,
      holes = layer.holes,
      layerID = layer.id,
      items = layer.items,
      opacity = layer.opacity;


  return _react2.default.createElement(
    'g',
    { opacity: opacity },
    areas.valueSeq().map(function (area) {
      return _react2.default.createElement(_area2.default, { key: area.id, layer: layer, area: area, unit: unit, catalog: catalog });
    }),
    lines.valueSeq().map(function (line) {
      return _react2.default.createElement(_line2.default, { key: line.id, layer: layer, line: line, scene: scene, catalog: catalog });
    }),
    items.valueSeq().map(function (item) {
      return _react2.default.createElement(_item2.default, { key: item.id, layer: layer, item: item, scene: scene, catalog: catalog });
    }),
    vertices.valueSeq().filter(function (v) {
      return v.selected;
    }).map(function (vertex) {
      return _react2.default.createElement(_vertex2.default, { key: vertex.id, layer: layer, vertex: vertex });
    }),
    groups.valueSeq().filter(function (g) {
      return g.hasIn(['elements', layerID]) && g.get('selected');
    }).map(function (group) {
      return _react2.default.createElement(_group2.default, { key: group.get('id'), layer: layer, group: group, scene: scene, catalog: catalog });
    })
  );
}

Layer.propTypes = {
  layer: _propTypes2.default.object.isRequired,
  scene: _propTypes2.default.object.isRequired,
  catalog: _propTypes2.default.object.isRequired
};