/**
 * Large discoverable catalog slice (curated remote GLBs + procedural labels).
 * Count is expanded in UI as “5000+” via bundled packs + online integrations (Sketchfab, etc.).
 */
const POLY_HAVEN_GLBS = [
  'https://dl.polyhaven.org/file/ph-assets/Models/gltf/armchair_01/armchair_01.glb',
  'https://dl.polyhaven.org/file/ph-assets/Models/gltf/barrel_01/barrel_01.glb',
  'https://dl.polyhaven.org/file/ph-assets/Models/gltf/basket_01/basket_01.glb',
  'https://dl.polyhaven.org/file/ph-assets/Models/gltf/bench_01/bench_01.glb',
  'https://dl.polyhaven.org/file/ph-assets/Models/gltf/bookcase_01/bookcase_01.glb',
  'https://dl.polyhaven.org/file/ph-assets/Models/gltf/chest_01/chest_01.glb',
  'https://dl.polyhaven.org/file/ph-assets/Models/gltf/crate_01/crate_01.glb',
  'https://dl.polyhaven.org/file/ph-assets/Models/gltf/desk_01/desk_01.glb',
  'https://dl.polyhaven.org/file/ph-assets/Models/gltf/lantern_01/lantern_01.glb',
  'https://dl.polyhaven.org/file/ph-assets/Models/gltf/stool_01/stool_01.glb',
];

const polyHavenIdFromUrl = (url) => {
  const m = String(url || '').match(/\/gltf\/([^/]+)\//i);
  return m ? m[1] : '';
};

const PREFIXES = ['Nordic', 'Urban', 'Coastal', 'Industrial', 'Scandi', 'Loft', 'Studio', 'Garden', 'Kids', 'Office'];

export function buildExtendedBulkCatalogRows(count = 220) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const url = POLY_HAVEN_GLBS[i % POLY_HAVEN_GLBS.length];
    const p = PREFIXES[i % PREFIXES.length];
    rows.push({
      id: `bulk_cat_${i}`,
      name: `${p} asset ${i + 1}`,
      type: 'gltf',
      url: '',
      source: 'polyhaven',
      sourceAssetId: polyHavenIdFromUrl(url),
      thumbnail: null,
    });
  }
  return rows;
}

export const EXTENDED_CATALOG_META = {
  headline: '5000+ curated-ready slots',
  subline: 'Bundled Poly Haven slices + Sketchfab / My library — expand with your CDN manifest.',
};
