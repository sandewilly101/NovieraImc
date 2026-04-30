'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createNoviraIntegratedCatalog;

var _noviraFullCatalog = require('./noviraFullCatalog.generated');

var _noviraFullCatalog2 = _interopRequireDefault(_noviraFullCatalog);

var _gltfItem = require('./catalog/novira/gltf-item');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {Array<{ id: string, name?: string, url: string, source?: string, thumbnail?: string }>} userModels
 */
/* eslint-disable import/no-unresolved */
/**
 * Novira Studio floor-plan catalog: full react-planner demo library (walls, openings, furniture, text, …)
 * plus Novira user GLB entries and a “Novira library” category.
 */
function createNoviraIntegratedCatalog() {
  var userModels = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  var catalog = (0, _noviraFullCatalog2.default)();

  userModels.forEach(function (entry) {
    if (!entry || !entry.url) return;
    catalog.registerElement((0, _gltfItem.cloneGltfItemForEntry)(entry));
  });

  var noviraEls = userModels.filter(function (e) {
    return e && e.url;
  }).map(function (e) {
    return catalog.elements[(0, _gltfItem.noviraCatalogElementName)(e)];
  }).filter(Boolean);

  if (noviraEls.length) {
    catalog.registerCategory('novira-library', 'Novira library', noviraEls);
  }

  return catalog;
}