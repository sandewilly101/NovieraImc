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
export default function createNoviraIntegratedCatalog(userModels = []) {
  const catalog = createFullDemoCatalog();

  userModels.forEach((entry) => {
    if (!entry || !entry.url) return;
    catalog.registerElement(cloneGltfItemForEntry(entry));
  });

  const noviraEls = userModels
    .filter((e) => e && e.url)
    .map((e) => catalog.elements[noviraCatalogElementName(e)])
    .filter(Boolean);

  if (noviraEls.length) {
    catalog.registerCategory('novira-library', 'Novira library', noviraEls);
  }

  return catalog;
}
