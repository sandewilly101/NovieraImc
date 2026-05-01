'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Wand2, 
  ImageIcon, 
  Type, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Download,
  RefreshCw,
  Upload
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { tripoAPI } from '@/lib/novira-api'
import { useSceneStore } from '@/core/stores/scene-store'
import { useAuth } from '@/providers/auth-provider'

type GenerationType = 'text_to_model' | 'image_to_model'

interface AITask {
  id: string
  taskId: string
  type: GenerationType
  prompt?: string
  imageUrl?: string
  status: 'pending' | 'processing' | 'success' | 'failed'
  progress?: number
  resultUrl?: string
  thumbnailUrl?: string
  createdAt: string
  error?: string
}

const STATUS_ICONS = {
  pending: Clock,
  processing: Loader2,
  success: CheckCircle2,
  failed: XCircle,
}

const STATUS_COLORS = {
  pending: 'text-yellow-500',
  processing: 'text-blue-500',
  success: 'text-green-500',
  failed: 'text-red-500',
}

export function NoviraAIPanel() {
  const [activeTab, setActiveTab] = useState<GenerationType>('text_to_model')
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [tasks, setTasks] = useState<AITask[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createNode = useSceneStore((s) => s.createNode)
  const { user } = useAuth()

  // Fetch existing tasks
  const fetchTasks = useCallback(async () => {
    try {
      const response = await tripoAPI.getTasks()
      setTasks(response.tasks || [])
    } catch (err) {
      console.error('[v0] Failed to fetch AI tasks:', err)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Poll for task updates
  useEffect(() => {
    const processingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'processing')
    if (processingTasks.length === 0) return

    const interval = setInterval(async () => {
      for (const task of processingTasks) {
        try {
          const status = await tripoAPI.getTaskStatus(task.taskId)
          setTasks(prev => prev.map(t => 
            t.taskId === task.taskId 
              ? { ...t, ...status }
              : t
          ))
        } catch (err) {
          console.error('[v0] Failed to poll task:', err)
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [tasks])

  // Handle image file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    setImageUrl('')
    
    // Create preview
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Generate model
  const handleGenerate = async () => {
    setError(null)
    setIsGenerating(true)

    try {
      let params: Parameters<typeof tripoAPI.createTask>[0]

      if (activeTab === 'text_to_model') {
        if (!prompt.trim()) {
          setError('Please enter a prompt')
          return
        }
        params = {
          type: 'text_to_model',
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          texture: true,
          pbr: true,
        }
      } else {
        if (!imageUrl && !imageFile) {
          setError('Please provide an image')
          return
        }
        params = {
          type: 'image_to_model',
          imageUrl: imageUrl || imagePreview || undefined,
          texture: true,
          pbr: true,
        }
      }

      const response = await tripoAPI.createTask(params)
      
      // Add to tasks list
      const newTask: AITask = {
        id: response.id,
        taskId: response.taskId,
        type: activeTab,
        prompt: activeTab === 'text_to_model' ? prompt : undefined,
        imageUrl: activeTab === 'image_to_model' ? (imageUrl || imagePreview || undefined) : undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      setTasks(prev => [newTask, ...prev])

      // Clear inputs
      setPrompt('')
      setNegativePrompt('')
      setImageUrl('')
      setImageFile(null)
      setImagePreview(null)

    } catch (err) {
      setError('Failed to start generation. Please try again.')
      console.error('[v0] AI generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  // Add generated model to scene
  const handleAddToScene = async (task: AITask) => {
    if (!task.resultUrl) return

    try {
      createNode({
        type: 'item',
        name: task.prompt || 'AI Generated Model',
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
          src: task.resultUrl,
          type: 'glb',
          source: 'tripo',
          sourceId: task.taskId,
        },
        castShadow: true,
        receiveShadow: true,
        metadata: {
          aiGenerated: true,
          tripoTaskId: task.taskId,
        },
      })
    } catch (err) {
      console.error('[v0] Failed to add model to scene:', err)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* AI Credits indicator */}
      {user && (
        <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground">
          AI Credits: <span className="text-foreground font-medium">{user.aiCredits}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('text_to_model')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
            activeTab === 'text_to_model'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Type className="w-4 h-4" />
          Text to 3D
        </button>
        <button
          onClick={() => setActiveTab('image_to_model')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
            activeTab === 'image_to_model'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ImageIcon className="w-4 h-4" />
          Image to 3D
        </button>
      </div>

      {/* Generation form */}
      <div className="p-3 border-b border-border space-y-3">
        {activeTab === 'text_to_model' ? (
          <>
            <div>
              <label className="block text-xs font-medium mb-1">Describe your 3D model</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A modern wooden chair with curved armrests..."
                className="w-full h-20 px-3 py-2 rounded-md bg-background border border-input text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                Negative prompt (optional)
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="low quality, blurry..."
                className="w-full h-8 px-3 rounded-md bg-background border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium mb-1">Upload image or paste URL</label>
              
              {/* Image preview */}
              {imagePreview && (
                <div className="relative mb-2 rounded-md overflow-hidden border border-border">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={200}
                    height={200}
                    className="w-full h-32 object-contain bg-muted"
                  />
                  <button
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                      setImageUrl('')
                    }}
                    className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white hover:bg-black/70"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value)
                    setImageFile(null)
                    setImagePreview(e.target.value)
                  }}
                  placeholder="https://..."
                  className="flex-1 h-8 px-3 rounded-md bg-background border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-3 rounded-md bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            "w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            isGenerating ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/90"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generate 3D Model
            </>
          )}
        </button>
      </div>

      {/* Task history */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground">Recent Generations</h3>
            <button
              onClick={fetchTasks}
              className="p-1 rounded hover:bg-accent text-muted-foreground"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No generations yet
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onAddToScene={() => handleAddToScene(task)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, onAddToScene }: { task: AITask; onAddToScene: () => void }) {
  const StatusIcon = STATUS_ICONS[task.status]
  
  return (
    <div className="rounded-md border border-border bg-card p-2">
      <div className="flex items-start gap-2">
        {/* Thumbnail or placeholder */}
        <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
          {task.thumbnailUrl || task.imageUrl ? (
            <Image
              src={task.thumbnailUrl || task.imageUrl || ''}
              alt=""
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">
            {task.prompt || 'Image to 3D'}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <StatusIcon 
              className={cn(
                "w-3 h-3",
                STATUS_COLORS[task.status],
                task.status === 'processing' && "animate-spin"
              )} 
            />
            <span className={cn("text-[10px]", STATUS_COLORS[task.status])}>
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              {task.progress && task.status === 'processing' && ` (${task.progress}%)`}
            </span>
          </div>
        </div>

        {/* Actions */}
        {task.status === 'success' && task.resultUrl && (
          <button
            onClick={onAddToScene}
            className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20"
            title="Add to scene"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
