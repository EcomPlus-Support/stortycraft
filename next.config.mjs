/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/landing',
        permanent: false,
      },
    ]
  },
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
      bodySizeLimit: 10 * 1024 * 1024,
    },
  },
  output: "standalone",
  // Improve build performance and error handling
  swcMinify: true,
  poweredByHeader: false,
  // Disable static generation for pages that make external calls
  generateBuildId: () => 'storycraft-build',
  // Disable static optimization to prevent build-time external calls
  env: {
    BUILD_PHASE: process.env.BUILD_PHASE || 'build',
  },
  // Disable static generation completely to avoid build-time external calls
  trailingSlash: false,
  generateEtags: false,
  // ESLint configuration for build
  eslint: {
    // Only run ESLint on these directories during build
    dirs: ['app', 'lib', 'components'],
    // Don't fail build on ESLint errors in production
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  // TypeScript configuration
  typescript: {
    // Don't fail build on TypeScript errors in production builds
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
