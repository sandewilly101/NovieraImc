'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createFullDemoCatalog;

var _catalog = require('./catalog/catalog');

var _catalog2 = _interopRequireDefault(_catalog);

var _plannerElement = require('../demo/src/catalog/areas/area/planner-element.jsx');

var _plannerElement2 = _interopRequireDefault(_plannerElement);

var _plannerElement3 = require('../demo/src/catalog/lines/wall/planner-element.jsx');

var _plannerElement4 = _interopRequireDefault(_plannerElement3);

var _plannerElement5 = require('../demo/src/catalog/holes/door-double/planner-element.jsx');

var _plannerElement6 = _interopRequireDefault(_plannerElement5);

var _plannerElement7 = require('../demo/src/catalog/holes/door/planner-element.jsx');

var _plannerElement8 = _interopRequireDefault(_plannerElement7);

var _plannerElement9 = require('../demo/src/catalog/holes/gate/planner-element.jsx');

var _plannerElement10 = _interopRequireDefault(_plannerElement9);

var _plannerElement11 = require('../demo/src/catalog/holes/panic-door-double/planner-element.jsx');

var _plannerElement12 = _interopRequireDefault(_plannerElement11);

var _plannerElement13 = require('../demo/src/catalog/holes/panic-door/planner-element.jsx');

var _plannerElement14 = _interopRequireDefault(_plannerElement13);

var _plannerElement15 = require('../demo/src/catalog/holes/sash-window/planner-element.jsx');

var _plannerElement16 = _interopRequireDefault(_plannerElement15);

var _plannerElement17 = require('../demo/src/catalog/holes/sliding-door/planner-element.jsx');

var _plannerElement18 = _interopRequireDefault(_plannerElement17);

var _plannerElement19 = require('../demo/src/catalog/holes/venetian-blind-window/planner-element.jsx');

var _plannerElement20 = _interopRequireDefault(_plannerElement19);

var _plannerElement21 = require('../demo/src/catalog/holes/window-curtain/planner-element.jsx');

var _plannerElement22 = _interopRequireDefault(_plannerElement21);

var _plannerElement23 = require('../demo/src/catalog/holes/window/planner-element.jsx');

var _plannerElement24 = _interopRequireDefault(_plannerElement23);

var _plannerElement25 = require('../demo/src/catalog/items/air-conditioner/planner-element.jsx');

var _plannerElement26 = _interopRequireDefault(_plannerElement25);

var _plannerElement27 = require('../demo/src/catalog/items/armchairs/planner-element.jsx');

var _plannerElement28 = _interopRequireDefault(_plannerElement27);

var _plannerElement29 = require('../demo/src/catalog/items/balcony/planner-element.jsx');

var _plannerElement30 = _interopRequireDefault(_plannerElement29);

var _plannerElement31 = require('../demo/src/catalog/items/bench/planner-element.jsx');

var _plannerElement32 = _interopRequireDefault(_plannerElement31);

var _plannerElement33 = require('../demo/src/catalog/items/blackboard/planner-element.jsx');

var _plannerElement34 = _interopRequireDefault(_plannerElement33);

var _plannerElement35 = require('../demo/src/catalog/items/bookcase/planner-element.jsx');

var _plannerElement36 = _interopRequireDefault(_plannerElement35);

var _plannerElement37 = require('../demo/src/catalog/items/camera/planner-element.jsx');

var _plannerElement38 = _interopRequireDefault(_plannerElement37);

var _plannerElement39 = require('../demo/src/catalog/items/canteen-table/planner-element.jsx');

var _plannerElement40 = _interopRequireDefault(_plannerElement39);

var _plannerElement41 = require('../demo/src/catalog/items/canteencart/planner-element.jsx');

var _plannerElement42 = _interopRequireDefault(_plannerElement41);

var _plannerElement43 = require('../demo/src/catalog/items/chair/planner-element.jsx');

var _plannerElement44 = _interopRequireDefault(_plannerElement43);

var _plannerElement45 = require('../demo/src/catalog/items/chairdesk/planner-element.jsx');

var _plannerElement46 = _interopRequireDefault(_plannerElement45);

var _plannerElement47 = require('../demo/src/catalog/items/child-chair-desk/planner-element.jsx');

var _plannerElement48 = _interopRequireDefault(_plannerElement47);

var _plannerElement49 = require('../demo/src/catalog/items/cleaningcart/planner-element.jsx');

var _plannerElement50 = _interopRequireDefault(_plannerElement49);

var _plannerElement51 = require('../demo/src/catalog/items/coat-hook/planner-element.jsx');

var _plannerElement52 = _interopRequireDefault(_plannerElement51);

var _plannerElement53 = require('../demo/src/catalog/items/column-square/planner-element.jsx');

var _plannerElement54 = _interopRequireDefault(_plannerElement53);

var _plannerElement55 = require('../demo/src/catalog/items/column/planner-element.jsx');

var _plannerElement56 = _interopRequireDefault(_plannerElement55);

var _plannerElement57 = require('../demo/src/catalog/items/cube/planner-element.jsx');

var _plannerElement58 = _interopRequireDefault(_plannerElement57);

var _plannerElement59 = require('../demo/src/catalog/items/desk/planner-element.jsx');

var _plannerElement60 = _interopRequireDefault(_plannerElement59);

var _plannerElement61 = require('../demo/src/catalog/items/deskdouble/planner-element.jsx');

var _plannerElement62 = _interopRequireDefault(_plannerElement61);

var _plannerElement63 = require('../demo/src/catalog/items/deskoffice/planner-element.jsx');

var _plannerElement64 = _interopRequireDefault(_plannerElement63);

var _plannerElement65 = require('../demo/src/catalog/items/electrical-panel/planner-element.jsx');

var _plannerElement66 = _interopRequireDefault(_plannerElement65);

var _plannerElement67 = require('../demo/src/catalog/items/fire-extinguisher/planner-element.jsx');

var _plannerElement68 = _interopRequireDefault(_plannerElement67);

var _plannerElement69 = require('../demo/src/catalog/items/fridge/planner-element.jsx');

var _plannerElement70 = _interopRequireDefault(_plannerElement69);

var _plannerElement71 = require('../demo/src/catalog/items/hanger/planner-element.jsx');

var _plannerElement72 = _interopRequireDefault(_plannerElement71);

var _plannerElement73 = require('../demo/src/catalog/items/hiroos/planner-element.jsx');

var _plannerElement74 = _interopRequireDefault(_plannerElement73);

var _plannerElement75 = require('../demo/src/catalog/items/hub/planner-element.jsx');

var _plannerElement76 = _interopRequireDefault(_plannerElement75);

var _plannerElement77 = require('../demo/src/catalog/items/image/planner-element.jsx');

var _plannerElement78 = _interopRequireDefault(_plannerElement77);

var _plannerElement79 = require('../demo/src/catalog/items/kitchen/planner-element.jsx');

var _plannerElement80 = _interopRequireDefault(_plannerElement79);

var _plannerElement81 = require('../demo/src/catalog/items/lim/planner-element.jsx');

var _plannerElement82 = _interopRequireDefault(_plannerElement81);

var _plannerElement83 = require('../demo/src/catalog/items/metal-detector/planner-element.jsx');

var _plannerElement84 = _interopRequireDefault(_plannerElement83);

var _plannerElement85 = require('../demo/src/catalog/items/monitor-pc/planner-element.jsx');

var _plannerElement86 = _interopRequireDefault(_plannerElement85);

var _plannerElement87 = require('../demo/src/catalog/items/naspo/planner-element.jsx');

var _plannerElement88 = _interopRequireDefault(_plannerElement87);

var _plannerElement89 = require('../demo/src/catalog/items/projector/planner-element.jsx');

var _plannerElement90 = _interopRequireDefault(_plannerElement89);

var _plannerElement91 = require('../demo/src/catalog/items/radiator-modern-style/planner-element.jsx');

var _plannerElement92 = _interopRequireDefault(_plannerElement91);

var _plannerElement93 = require('../demo/src/catalog/items/radiator-old-style/planner-element.jsx');

var _plannerElement94 = _interopRequireDefault(_plannerElement93);

var _plannerElement95 = require('../demo/src/catalog/items/recycling-bins/planner-element.jsx');

var _plannerElement96 = _interopRequireDefault(_plannerElement95);

var _plannerElement97 = require('../demo/src/catalog/items/router-wifi/planner-element.jsx');

var _plannerElement98 = _interopRequireDefault(_plannerElement97);

var _plannerElement99 = require('../demo/src/catalog/items/schneider/planner-element.jsx');

var _plannerElement100 = _interopRequireDefault(_plannerElement99);

var _plannerElement101 = require('../demo/src/catalog/items/school-desk-double/planner-element.jsx');

var _plannerElement102 = _interopRequireDefault(_plannerElement101);

var _plannerElement103 = require('../demo/src/catalog/items/school-desk/planner-element.jsx');

var _plannerElement104 = _interopRequireDefault(_plannerElement103);

var _plannerElement105 = require('../demo/src/catalog/items/sink/planner-element.jsx');

var _plannerElement106 = _interopRequireDefault(_plannerElement105);

var _plannerElement107 = require('../demo/src/catalog/items/smoke-detector/planner-element.jsx');

var _plannerElement108 = _interopRequireDefault(_plannerElement107);

var _plannerElement109 = require('../demo/src/catalog/items/sofa/planner-element.jsx');

var _plannerElement110 = _interopRequireDefault(_plannerElement109);

var _plannerElement111 = require('../demo/src/catalog/items/table/planner-element.jsx');

var _plannerElement112 = _interopRequireDefault(_plannerElement111);

var _plannerElement113 = require('../demo/src/catalog/items/teaching-post/planner-element.jsx');

var _plannerElement114 = _interopRequireDefault(_plannerElement113);

var _plannerElement115 = require('../demo/src/catalog/items/text-3d/planner-element.jsx');

var _plannerElement116 = _interopRequireDefault(_plannerElement115);

var _plannerElement117 = require('../demo/src/catalog/items/three-phase-panel/planner-element.jsx');

var _plannerElement118 = _interopRequireDefault(_plannerElement117);

var _plannerElement119 = require('../demo/src/catalog/items/trash/planner-element.jsx');

var _plannerElement120 = _interopRequireDefault(_plannerElement119);

var _plannerElement121 = require('../demo/src/catalog/items/tv/planner-element.jsx');

var _plannerElement122 = _interopRequireDefault(_plannerElement121);

var _plannerElement123 = require('../demo/src/catalog/items/umbrella-stand/planner-element.jsx');

var _plannerElement124 = _interopRequireDefault(_plannerElement123);

var _plannerElement125 = require('../demo/src/catalog/items/wardrobe/planner-element.jsx');

var _plannerElement126 = _interopRequireDefault(_plannerElement125);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable */
/* Auto-generated by scripts/generate-novira-full-catalog.mjs — do not edit by hand */
var _areas = {
  "area": _plannerElement2.default.default != null ? _plannerElement2.default.default : _plannerElement2.default
};

var _lines = {
  "wall": _plannerElement4.default.default != null ? _plannerElement4.default.default : _plannerElement4.default
};

var _holes = {
  "door-double": _plannerElement6.default.default != null ? _plannerElement6.default.default : _plannerElement6.default,
  "door": _plannerElement8.default.default != null ? _plannerElement8.default.default : _plannerElement8.default,
  "gate": _plannerElement10.default.default != null ? _plannerElement10.default.default : _plannerElement10.default,
  "panic-door-double": _plannerElement12.default.default != null ? _plannerElement12.default.default : _plannerElement12.default,
  "panic-door": _plannerElement14.default.default != null ? _plannerElement14.default.default : _plannerElement14.default,
  "sash-window": _plannerElement16.default.default != null ? _plannerElement16.default.default : _plannerElement16.default,
  "sliding-door": _plannerElement18.default.default != null ? _plannerElement18.default.default : _plannerElement18.default,
  "venetian-blind-window": _plannerElement20.default.default != null ? _plannerElement20.default.default : _plannerElement20.default,
  "window-curtain": _plannerElement22.default.default != null ? _plannerElement22.default.default : _plannerElement22.default,
  "window": _plannerElement24.default.default != null ? _plannerElement24.default.default : _plannerElement24.default
};

var _items = {
  "air-conditioner": _plannerElement26.default.default != null ? _plannerElement26.default.default : _plannerElement26.default,
  "armchairs": _plannerElement28.default.default != null ? _plannerElement28.default.default : _plannerElement28.default,
  "balcony": _plannerElement30.default.default != null ? _plannerElement30.default.default : _plannerElement30.default,
  "bench": _plannerElement32.default.default != null ? _plannerElement32.default.default : _plannerElement32.default,
  "blackboard": _plannerElement34.default.default != null ? _plannerElement34.default.default : _plannerElement34.default,
  "bookcase": _plannerElement36.default.default != null ? _plannerElement36.default.default : _plannerElement36.default,
  "camera": _plannerElement38.default.default != null ? _plannerElement38.default.default : _plannerElement38.default,
  "canteen-table": _plannerElement40.default.default != null ? _plannerElement40.default.default : _plannerElement40.default,
  "canteencart": _plannerElement42.default.default != null ? _plannerElement42.default.default : _plannerElement42.default,
  "chair": _plannerElement44.default.default != null ? _plannerElement44.default.default : _plannerElement44.default,
  "chairdesk": _plannerElement46.default.default != null ? _plannerElement46.default.default : _plannerElement46.default,
  "child-chair-desk": _plannerElement48.default.default != null ? _plannerElement48.default.default : _plannerElement48.default,
  "cleaningcart": _plannerElement50.default.default != null ? _plannerElement50.default.default : _plannerElement50.default,
  "coat-hook": _plannerElement52.default.default != null ? _plannerElement52.default.default : _plannerElement52.default,
  "column-square": _plannerElement54.default.default != null ? _plannerElement54.default.default : _plannerElement54.default,
  "column": _plannerElement56.default.default != null ? _plannerElement56.default.default : _plannerElement56.default,
  "cube": _plannerElement58.default.default != null ? _plannerElement58.default.default : _plannerElement58.default,
  "desk": _plannerElement60.default.default != null ? _plannerElement60.default.default : _plannerElement60.default,
  "deskdouble": _plannerElement62.default.default != null ? _plannerElement62.default.default : _plannerElement62.default,
  "deskoffice": _plannerElement64.default.default != null ? _plannerElement64.default.default : _plannerElement64.default,
  "electrical-panel": _plannerElement66.default.default != null ? _plannerElement66.default.default : _plannerElement66.default,
  "fire-extinguisher": _plannerElement68.default.default != null ? _plannerElement68.default.default : _plannerElement68.default,
  "fridge": _plannerElement70.default.default != null ? _plannerElement70.default.default : _plannerElement70.default,
  "hanger": _plannerElement72.default.default != null ? _plannerElement72.default.default : _plannerElement72.default,
  "hiroos": _plannerElement74.default.default != null ? _plannerElement74.default.default : _plannerElement74.default,
  "hub": _plannerElement76.default.default != null ? _plannerElement76.default.default : _plannerElement76.default,
  "image": _plannerElement78.default.default != null ? _plannerElement78.default.default : _plannerElement78.default,
  "kitchen": _plannerElement80.default.default != null ? _plannerElement80.default.default : _plannerElement80.default,
  "lim": _plannerElement82.default.default != null ? _plannerElement82.default.default : _plannerElement82.default,
  "metal-detector": _plannerElement84.default.default != null ? _plannerElement84.default.default : _plannerElement84.default,
  "monitor-pc": _plannerElement86.default.default != null ? _plannerElement86.default.default : _plannerElement86.default,
  "naspo": _plannerElement88.default.default != null ? _plannerElement88.default.default : _plannerElement88.default,
  "projector": _plannerElement90.default.default != null ? _plannerElement90.default.default : _plannerElement90.default,
  "radiator-modern-style": _plannerElement92.default.default != null ? _plannerElement92.default.default : _plannerElement92.default,
  "radiator-old-style": _plannerElement94.default.default != null ? _plannerElement94.default.default : _plannerElement94.default,
  "recycling-bins": _plannerElement96.default.default != null ? _plannerElement96.default.default : _plannerElement96.default,
  "router-wifi": _plannerElement98.default.default != null ? _plannerElement98.default.default : _plannerElement98.default,
  "schneider": _plannerElement100.default.default != null ? _plannerElement100.default.default : _plannerElement100.default,
  "school-desk-double": _plannerElement102.default.default != null ? _plannerElement102.default.default : _plannerElement102.default,
  "school-desk": _plannerElement104.default.default != null ? _plannerElement104.default.default : _plannerElement104.default,
  "sink": _plannerElement106.default.default != null ? _plannerElement106.default.default : _plannerElement106.default,
  "smoke-detector": _plannerElement108.default.default != null ? _plannerElement108.default.default : _plannerElement108.default,
  "sofa": _plannerElement110.default.default != null ? _plannerElement110.default.default : _plannerElement110.default,
  "table": _plannerElement112.default.default != null ? _plannerElement112.default.default : _plannerElement112.default,
  "teaching-post": _plannerElement114.default.default != null ? _plannerElement114.default.default : _plannerElement114.default,
  "text-3d": _plannerElement116.default.default != null ? _plannerElement116.default.default : _plannerElement116.default,
  "three-phase-panel": _plannerElement118.default.default != null ? _plannerElement118.default.default : _plannerElement118.default,
  "trash": _plannerElement120.default.default != null ? _plannerElement120.default.default : _plannerElement120.default,
  "tv": _plannerElement122.default.default != null ? _plannerElement122.default.default : _plannerElement122.default,
  "umbrella-stand": _plannerElement124.default.default != null ? _plannerElement124.default.default : _plannerElement124.default,
  "wardrobe": _plannerElement126.default.default != null ? _plannerElement126.default.default : _plannerElement126.default
};

function createFullDemoCatalog() {
  var catalog = new _catalog2.default();
  ['areas', 'lines', 'holes', 'items'].forEach(function (g) {
    var o = { areas: _areas, lines: _lines, holes: _holes, items: _items }[g];
    Object.keys(o).forEach(function (k) {
      return catalog.registerElement(o[k]);
    });
  });
  catalog.registerCategory('windows', 'Windows', [_holes['window'], _holes['sash-window'], _holes['venetian-blind-window'], _holes['window-curtain']]);
  catalog.registerCategory('doors', 'Doors', [_holes['door'], _holes['door-double'], _holes['panic-door'], _holes['panic-door-double'], _holes['sliding-door']]);
  return catalog;
}