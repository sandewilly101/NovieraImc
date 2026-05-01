import { z } from 'zod'

// Base node schema
const BaseNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  childIds: z.array(z.string()).default([]),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
})

// Transform schema
export const TransformSchema = z.object({
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.number().default(0), // Y-axis rotation in radians
  scale: z.tuple([z.number(), z.number(), z.number()]).default([1, 1, 1]),
})

// Material schema
export const MaterialSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  color: z.string().default('#ffffff'),
  roughness: z.number().min(0).max(1).default(0.5),
  metalness: z.number().min(0).max(1).default(0),
  opacity: z.number().min(0).max(1).default(1),
  transparent: z.boolean().default(false),
  maps: z.object({
    albedoMap: z.string().optional(),
    normalMap: z.string().optional(),
    roughnessMap: z.string().optional(),
    metalnessMap: z.string().optional(),
    aoMap: z.string().optional(),
    displacementMap: z.string().optional(),
    emissiveMap: z.string().optional(),
  }).optional(),
  mapProperties: z.object({
    repeatX: z.number().default(1),
    repeatY: z.number().default(1),
  }).optional(),
})

// Asset reference schema
export const AssetRefSchema = z.object({
  src: z.string(),
  type: z.enum(['glb', 'gltf', 'obj', 'stl', 'fbx']).default('glb'),
  source: z.string().optional(), // 'sketchfab', 'polyhaven', etc.
  sourceId: z.string().optional(),
})

// Level/Floor schema
export const LevelSchema = BaseNodeSchema.extend({
  type: z.literal('level'),
  elevation: z.number().default(0),
  height: z.number().default(3), // Default 3m ceiling
  floorMaterial: MaterialSchema.optional(),
  ceilingMaterial: MaterialSchema.optional(),
})

// Wall schema
export const WallSchema = BaseNodeSchema.extend({
  type: z.literal('wall'),
  transform: TransformSchema,
  start: z.tuple([z.number(), z.number()]), // 2D floor plan coordinates
  end: z.tuple([z.number(), z.number()]),
  height: z.number().default(3),
  thickness: z.number().default(0.15),
  material: MaterialSchema.optional(),
})

// Room schema
export const RoomSchema = BaseNodeSchema.extend({
  type: z.literal('room'),
  vertices: z.array(z.tuple([z.number(), z.number()])), // 2D polygon
  floorMaterial: MaterialSchema.optional(),
  ceilingMaterial: MaterialSchema.optional(),
  wallMaterial: MaterialSchema.optional(),
})

// Item (3D model) schema
export const ItemSchema = BaseNodeSchema.extend({
  type: z.literal('item'),
  transform: TransformSchema,
  asset: AssetRefSchema,
  materials: z.record(z.string(), MaterialSchema).optional(), // Material overrides by mesh name
  castShadow: z.boolean().default(true),
  receiveShadow: z.boolean().default(true),
  metadata: z.object({
    aiGenerated: z.boolean().optional(),
    tripoTaskId: z.string().optional(),
    sourceAsset: z.object({
      source: z.string(),
      id: z.string(),
      name: z.string(),
    }).optional(),
  }).optional(),
})

// Primitive shapes
export const PrimitiveSchema = BaseNodeSchema.extend({
  type: z.literal('primitive'),
  transform: TransformSchema,
  shape: z.enum(['box', 'sphere', 'cylinder', 'cone', 'plane', 'torus']),
  dimensions: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    depth: z.number().optional(),
    radius: z.number().optional(),
    radiusTop: z.number().optional(),
    radiusBottom: z.number().optional(),
    tube: z.number().optional(),
  }).default({}),
  material: MaterialSchema.optional(),
})

// Light schema
export const LightSchema = BaseNodeSchema.extend({
  type: z.literal('light'),
  transform: TransformSchema,
  lightType: z.enum(['point', 'spot', 'directional', 'ambient']),
  color: z.string().default('#ffffff'),
  intensity: z.number().default(1),
  distance: z.number().optional(),
  decay: z.number().optional(),
  angle: z.number().optional(),
  penumbra: z.number().optional(),
  castShadow: z.boolean().default(true),
})

// Group node
export const GroupSchema = BaseNodeSchema.extend({
  type: z.literal('group'),
  transform: TransformSchema,
})

// Union of all node types
export const AnyNodeSchema = z.discriminatedUnion('type', [
  LevelSchema,
  WallSchema,
  RoomSchema,
  ItemSchema,
  PrimitiveSchema,
  LightSchema,
  GroupSchema,
])

export type Transform = z.infer<typeof TransformSchema>
export type Material = z.infer<typeof MaterialSchema>
export type AssetRef = z.infer<typeof AssetRefSchema>
export type Level = z.infer<typeof LevelSchema>
export type Wall = z.infer<typeof WallSchema>
export type Room = z.infer<typeof RoomSchema>
export type Item = z.infer<typeof ItemSchema>
export type Primitive = z.infer<typeof PrimitiveSchema>
export type Light = z.infer<typeof LightSchema>
export type Group = z.infer<typeof GroupSchema>
export type AnyNode = z.infer<typeof AnyNodeSchema>
export type NodeType = AnyNode['type']

// Scene document schema
export const SceneDocumentSchema = z.object({
  version: z.number().default(1),
  nodes: z.record(z.string(), AnyNodeSchema),
  rootNodeIds: z.array(z.string()),
  activeLevelId: z.string().nullable(),
  settings: z.object({
    gridSize: z.number().default(1),
    snapToGrid: z.boolean().default(true),
    units: z.enum(['meters', 'feet']).default('meters'),
    ambientLight: z.object({
      color: z.string().default('#ffffff'),
      intensity: z.number().default(0.5),
    }).default({}),
    environment: z.object({
      hdriUrl: z.string().optional(),
      backgroundColor: z.string().default('#1a1a2e'),
      showGrid: z.boolean().default(true),
    }).default({}),
  }).default({}),
})

export type SceneDocument = z.infer<typeof SceneDocumentSchema>
