/* eslint-disable import/no-unresolved */
/**
 * Novira Studio floor-plan catalog: full react-planner demo library (walls, openings, furniture, text, …)
 * plus Novira user GLB entries and a “Novira library” category.
 */
import createFullDemoCatalog from './noviraFullCatalog.generated';
import { cloneGltfItemForEntry, noviraCatalogElementName } from './catalog/novira/gltf-item';

/**
 * @param {Array<{ id: string, name?: string, url: string, source?: string, thumbnail?: string }>} userModels
 */
export default function createNoviraIntegratedCatalog() {
  var userModels = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  var catalog = createFullDemoCatalog();

  userModels.forEach(function (entry) {
    if (!entry || !entry.url) return;
    catalog.registerElement(cloneGltfItemForEntry(entry));
  });

  var noviraEls = userModels.filter(function (e) {
    return e && e.url;
  }).map(function (e) {
    return catalog.elements[noviraCatalogElementName(e)];
  }).filter(Boolean);

  if (noviraEls.length) {
    catalog.registerCategory('novira-library', 'Novira library', noviraEls);
  }

  return catalog;
}