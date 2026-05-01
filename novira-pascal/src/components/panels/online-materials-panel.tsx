"use client";

import { useState, useCallback } from "react";
import { Search, Loader2, ExternalLink, Check, Grid3X3, List } from "lucide-react";
import { noviraApi, type OnlineMaterial } from "@/lib/novira-api";
import { useSceneStore } from "@/core/stores/scene-store";
import { cn } from "@/lib/utils";

const MATERIAL_SOURCES = [
  { id: "polyhaven", name: "Poly Haven", category: "PBR" },
  { id: "ambientcg", name: "AmbientCG", category: "PBR" },
  { id: "texture_haven", name: "Texture Haven", category: "Textures" },
] as const;

const MATERIAL_CATEGORIES = [
  "All",
  "Wood",
  "Metal",
  "Concrete",
  "Fabric",
  "Stone",
  "Brick",
  "Marble",
  "Tiles",
  "Ground",
  "Plaster",
  "Plastic",
] as const;

interface MaterialsState {
  materials: OnlineMaterial[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}

export function OnlineMaterialsPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("polyhaven");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [applyingMaterial, setApplyingMaterial] = useState<string | null>(null);
  
  const [state, setState] = useState<MaterialsState>({
    materials: [],
    loading: false,
    error: null,
    page: 1,
    hasMore: true,
  });

  const { selectedIds, nodes, updateNode } = useSceneStore();

  const searchMaterials = useCallback(async (resetPage = true) => {
    const page = resetPage ? 1 : state.page;
    
    setState((prev) => ({ 
      ...prev, 
      loading: true, 
      error: null,
      page,
      materials: resetPage ? [] : prev.materials,
    }));

    try {
      const results = await noviraApi.searchMaterials({
        query: searchQuery || selectedCategory.toLowerCase(),
        source: selectedSource,
        category: selectedCategory === "All" ? undefined : selectedCategory.toLowerCase(),
        page,
        limit: 24,
      });

      setState((prev) => ({
        ...prev,
        loading: false,
        materials: resetPage ? results : [...prev.materials, ...results],
        hasMore: results.length === 24,
        page,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch materials",
      }));
    }
  }, [searchQuery, selectedSource, selectedCategory, state.page]);

  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      setState((prev) => ({ ...prev, page: prev.page + 1 }));
      searchMaterials(false);
    }
  }, [state.loading, state.hasMore, searchMaterials]);

  const applyMaterial = useCallback(async (material: OnlineMaterial) => {
    if (selectedIds.length === 0) {
      alert("Please select an object first");
      return;
    }

    setApplyingMaterial(material.id);

    try {
      // Download full material maps
      const fullMaterial = await noviraApi.downloadMaterial(material.id, material.source);

      // Apply to all selected nodes
      for (const nodeId of selectedIds) {
        const node = nodes[nodeId];
        if (node && (node.type === "model" || node.type === "primitive")) {
          updateNode(nodeId, {
            material: {
              type: "pbr",
              color: "#ffffff",
              metalness: fullMaterial.metalness ?? 0,
              roughness: fullMaterial.roughness ?? 0.5,
              maps: {
                diffuse: fullMaterial.maps.diffuse,
                normal: fullMaterial.maps.normal,
                roughness: fullMaterial.maps.roughness,
                metalness: fullMaterial.maps.metalness,
                ao: fullMaterial.maps.ao,
                displacement: fullMaterial.maps.displacement,
              },
            },
          });
        }
      }
    } catch (error) {
      console.error("Failed to apply material:", error);
    } finally {
      setApplyingMaterial(null);
    }
  }, [selectedIds, nodes, updateNode]);

  const hasSelection = selectedIds.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-3">
        <h3 className="mb-3 text-sm font-medium text-foreground">Online Materials</h3>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchMaterials()}
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Source Tabs */}
        <div className="mb-3 flex gap-1">
          {MATERIAL_SOURCES.map((source) => (
            <button
              key={source.id}
              onClick={() => setSelectedSource(source.id)}
              className={cn(
                "rounded-md px-2 py-1 text-xs transition-colors",
                selectedSource === source.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {source.name}
            </button>
          ))}
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1">
          {MATERIAL_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setTimeout(() => searchMaterials(), 0);
              }}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors",
                selectedCategory === category
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {state.materials.length} materials
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded p-1",
              viewMode === "grid" ? "bg-accent" : "hover:bg-muted"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded p-1",
              viewMode === "list" ? "bg-accent" : "hover:bg-muted"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selection Warning */}
      {!hasSelection && (
        <div className="bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Select an object to apply materials
        </div>
      )}

      {/* Materials Grid/List */}
      <div className="flex-1 overflow-y-auto p-2">
        {state.loading && state.materials.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : state.error ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-destructive">{state.error}</p>
            <button
              onClick={() => searchMaterials()}
              className="text-xs text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : state.materials.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">No materials found</p>
            <button
              onClick={() => searchMaterials()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
            >
              Search Materials
            </button>
          </div>
        ) : (
          <>
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-3 gap-2"
                  : "flex flex-col gap-2"
              )}
            >
              {state.materials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  viewMode={viewMode}
                  isApplying={applyingMaterial === material.id}
                  disabled={!hasSelection}
                  onApply={() => applyMaterial(material)}
                />
              ))}
            </div>

            {/* Load More */}
            {state.hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={state.loading}
                  className="flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
                >
                  {state.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-border px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Materials from{" "}
          <a
            href="https://polyhaven.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Poly Haven
          </a>
          {" & "}
          <a
            href="https://ambientcg.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            AmbientCG
          </a>
        </p>
      </div>
    </div>
  );
}

interface MaterialCardProps {
  material: OnlineMaterial;
  viewMode: "grid" | "list";
  isApplying: boolean;
  disabled: boolean;
  onApply: () => void;
}

function MaterialCard({ material, viewMode, isApplying, disabled, onApply }: MaterialCardProps) {
  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2">
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
          {material.thumbnail && (
            <img
              src={material.thumbnail}
              alt={material.name}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{material.name}</p>
          <p className="text-xs text-muted-foreground">{material.source}</p>
        </div>
        <button
          onClick={onApply}
          disabled={disabled || isApplying}
          className={cn(
            "flex h-8 items-center gap-1 rounded-md px-3 text-xs transition-colors",
            disabled
              ? "cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isApplying ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Apply
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted",
        !disabled && "cursor-pointer hover:border-primary"
      )}
      onClick={() => !disabled && !isApplying && onApply()}
    >
      {material.thumbnail && (
        <img
          src={material.thumbnail}
          alt={material.name}
          className="h-full w-full object-cover"
          crossOrigin="anonymous"
        />
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="truncate text-xs font-medium text-white">{material.name}</p>
        <p className="text-xs text-white/70">{material.source}</p>
      </div>

      {/* Applying Indicator */}
      {isApplying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      )}

      {/* Source Badge */}
      <div className="absolute right-1 top-1 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
        {material.source === "polyhaven" ? "PH" : "ACG"}
      </div>
    </div>
  );
}
