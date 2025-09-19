/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    runtime: 'edge',
  },
}

export default nextConfig
