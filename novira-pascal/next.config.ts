import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.polyhaven.com' },
      { protocol: 'https', hostname: 'polyhaven.com' },
      { protocol: 'https', hostname: 'acg-media.struffelproductions.com' },
      { protocol: 'https', hostname: 'ambientcg.com' },
      { protocol: 'https', hostname: 'media.sketchfab.com' },
      { protocol: 'https', hostname: 'static.sketchfab.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'pixabay.com' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },
    ],
  },
  transpilePackages: ['three'],
}

export default nextConfig
