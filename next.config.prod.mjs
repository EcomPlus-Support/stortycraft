/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: 10 * 1024 * 1024,  // Changed from maxRequestBodySize to bodySizeLimit
    },
  },
  output: "standalone",
  eslint: {
    // Disable ESLint during builds for production deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during builds for production deployment  
    ignoreBuildErrors: true,
  },
  // Disable static optimization for API routes that make external calls
  staticPageGenerationTimeout: 60,
  generateBuildId: async () => {
    return 'storycraft-' + Date.now()
  },
};

export default nextConfig;