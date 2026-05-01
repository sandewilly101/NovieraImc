'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, ExternalLink, Download, Filter } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { assetStoreAPI } from '@/lib/novira-api'
import { useSceneStore } from '@/core/stores/scene-store'
import { useEditorStore } from '@/core/stores/editor-store'
import { debounce } from '@/lib/utils'

interface Asset {
  sourceAssetId: string
  source: string
  name: string
  thumbnailUrl: string
  downloadUrl?: string
  modelUrl?: string
  license?: string
  author?: string
  category?: string
  formats?: string[]
}

const SOURCES = [
  { id: 'all', label: 'All Sources' },
  { id: 'sketchfab', label: 'Sketchfab' },
  { id: 'polyhaven', label: 'Poly Haven' },
  { id: 'poly_pizza', label: 'Poly Pizza' },
  { id: 'smithsonian', label: 'Smithsonian 3D' },
  { id: 'nasa', label: 'NASA 3D' },
  { id: 'free3d', label: 'Free3D' },
  { id: 'thingiverse', label: 'Thingiverse' },
  { id: 'myminifactory', label: 'MyMiniFactory' },
]

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'nature', label: 'Nature & Plants' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'characters', label: 'Characters' },
  { id: 'decorations', label: 'Decorations' },
]

export function NoviraAssetPanel() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const createNode = useSceneStore((s) => s.createNode)
  const setAssetToPlace = useEditorStore((s) => s.setAssetToPlace)

  // Fetch assets
  const fetchAssets = useCallback(async (query: string, source: string, category: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params: Record<string, string | number> = { limit: 30 }
      if (query) params.q = query
      if (source !== 'all') params.source = source
      if (category !== 'all') params.category = category

      const response = query 
        ? await assetStoreAPI.search(params)
        : await assetStoreAPI.getRecommended(30)
      
      setAssets(response.data || [])
    } catch (err) {
      setError('Failed to fetch assets. Please try again.')
      console.error('[v0] Asset fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search
  const debouncedFetch = useCallback(
    debounce((q: string, s: string, c: string) => fetchAssets(q, s, c), 500),
    [fetchAssets]
  )

  useEffect(() => {
    debouncedFetch(searchQuery, selectedSource, selectedCategory)
  }, [searchQuery, selectedSource, selectedCategory, debouncedFetch])

  // Initial fetch
  useEffect(() => {
    fetchAssets('', 'all', 'all')
  }, [fetchAssets])

  // Add asset to scene
  const handleAddAsset = useCallback((asset: Asset) => {
    const modelUrl = asset.modelUrl || asset.downloadUrl
    if (!modelUrl) {
      setError('No download URL available for this asset')
      return
    }

    // Create item node
    createNode({
      type: 'item',
      name: asset.name,
      parentId: null,
      childIds: [],
      visible: true,
      locked: false,
      transform: {
        position: [0, 0, 0],
        rotation: 0,
        scale: [1, 1, 1],
      },
      asset: {
        src: modelUrl,
        type: 'glb',
        source: asset.source,
        sourceId: asset.sourceAssetId,
      },
      castShadow: true,
      receiveShadow: true,
      metadata: {
        sourceAsset: {
          source: asset.source,
          id: asset.sourceAssetId,
          name: asset.name,
        },
      },
    })
  }, [createNode])

  // Drag and drop setup
  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search 3D models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-background border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 text-xs",
            showFilters ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Filter className="w-3 h-3" />
          Filters
        </button>

        {showFilters && (
          <div className="space-y-2">
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full h-8 px-2 rounded-md bg-background border border-input text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SOURCES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-8 px-2 rounded-md bg-background border border-input text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-sm text-destructive px-4 text-center">
            {error}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No assets found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <AssetCard
                key={`${asset.source}-${asset.sourceAssetId}`}
                asset={asset}
                onAdd={() => handleAddAsset(asset)}
                onDragStart={(e) => handleDragStart(e, asset)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AssetCard({
  asset,
  onAdd,
  onDragStart,
}: {
  asset: Asset
  onAdd: () => void
  onDragStart: (e: React.DragEvent) => void
}) {
  const [imageError, setImageError] = useState(false)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group relative rounded-lg border border-border bg-card overflow-hidden cursor-grab active:cursor-grabbing hover:border-primary transition-colors"
    >
      {/* Thumbnail */}
      <div className="aspect-square relative bg-muted">
        {!imageError && asset.thumbnailUrl ? (
          <Image
            src={asset.thumbnailUrl}
            alt={asset.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            sizes="150px"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAdd()
            }}
            className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            title="Add to scene"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Source badge */}
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/50 text-white">
          {asset.source}
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-xs font-medium truncate" title={asset.name}>
          {asset.name}
        </p>
        {asset.author && (
          <p className="text-[10px] text-muted-foreground truncate">
            by {asset.author}
          </p>
        )}
      </div>
    </div>
  )
}
