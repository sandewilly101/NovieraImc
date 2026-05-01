import axios, { AxiosInstance, AxiosError } from 'axios'

const NOVIRA_API_URL = process.env.NEXT_PUBLIC_NOVIRA_API_URL || 'http://localhost:5000'

// Create axios instance with interceptors
const api: AxiosInstance = axios.create({
  baseURL: NOVIRA_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('novira_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('novira_token')
        localStorage.removeItem('novira_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password })
    return res.data
  },

  register: async (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
  }) => {
    const res = await api.post('/api/auth/register', userData)
    return res.data
  },

  getProfile: async () => {
    const res = await api.get('/api/auth/profile')
    return res.data
  },

  logout: async () => {
    const res = await api.post('/api/auth/logout')
    return res.data
  },
}

// Projects API
export const projectsAPI = {
  getAll: async () => {
    const res = await api.get('/api/projects')
    return res.data
  },

  getOne: async (id: string) => {
    const res = await api.get(`/api/projects/${id}`)
    return res.data
  },

  create: async (data: { name: string; description?: string; category?: string }) => {
    const res = await api.post('/api/projects', data)
    return res.data
  },

  update: async (id: string, data: { name?: string; description?: string; sceneGraph?: unknown }) => {
    const res = await api.put(`/api/projects/${id}`, data)
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/api/projects/${id}`)
    return res.data
  },

  updateSceneGraph: async (id: string, sceneGraph: unknown) => {
    const res = await api.put(`/api/projects/${id}/scene`, { sceneGraph })
    return res.data
  },
}

// Asset Store API
export const assetStoreAPI = {
  search: async (params: {
    q?: string
    source?: string
    category?: string
    type?: string
    page?: number
    limit?: number
  }) => {
    const res = await api.get('/api/asset-store/search', { params })
    return res.data
  },

  getRecommended: async (limit = 20) => {
    const res = await api.get('/api/asset-store/recommended', { params: { limit } })
    return res.data
  },

  // Materials
  searchMaterials: async (params: { q?: string; source?: string; page?: number; limit?: number }) => {
    const res = await api.get('/api/asset-store/materials/search', { params })
    return res.data
  },

  getRecommendedMaterials: async (limit = 20) => {
    const res = await api.get('/api/asset-store/materials/recommended', { params: { limit } })
    return res.data
  },

  getMaterialDetails: async (source: string, assetId: string) => {
    const res = await api.get(`/api/asset-store/materials/${source}/${assetId}`)
    return res.data
  },

  // HDRIs
  searchHdris: async (params: { q?: string; source?: string; page?: number; limit?: number }) => {
    const res = await api.get('/api/asset-store/hdris/search', { params })
    return res.data
  },

  getRecommendedHdris: async (limit = 20) => {
    const res = await api.get('/api/asset-store/hdris/recommended', { params: { limit } })
    return res.data
  },

  // Download/proxy endpoints
  downloadAsset: async (source: string, assetId: string) => {
    const res = await api.get(`/api/asset-store/download/${source}/${assetId}`)
    return res.data
  },
}

// Tripo AI API
export const tripoAPI = {
  createTask: async (params: {
    type: 'text_to_model' | 'image_to_model' | 'multiview_to_model'
    prompt?: string
    imageUrl?: string
    imageUrls?: string[]
    negativePrompt?: string
    modelVersion?: string
    faceLimit?: number
    texture?: boolean
    pbr?: boolean
  }) => {
    const res = await api.post('/api/tripo/task', params)
    return res.data
  },

  getTaskStatus: async (taskId: string) => {
    const res = await api.get(`/api/tripo/task/${taskId}`)
    return res.data
  },

  getTasks: async () => {
    const res = await api.get('/api/tripo/tasks')
    return res.data
  },

  downloadModel: async (taskId: string, format = 'glb') => {
    const res = await api.get(`/api/tripo/task/${taskId}/download`, {
      params: { format },
    })
    return res.data
  },
}

// User Assets API
export const userAssetsAPI = {
  getAll: async () => {
    const res = await api.get('/api/user-assets')
    return res.data
  },

  upload: async (file: File, metadata?: { name?: string; category?: string }) => {
    const formData = new FormData()
    formData.append('file', file)
    if (metadata?.name) formData.append('name', metadata.name)
    if (metadata?.category) formData.append('category', metadata.category)

    const res = await api.post('/api/user-assets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/api/user-assets/${id}`)
    return res.data
  },
}

export default api
