// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,  // Turn off strict mode for build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  swcMinify: true,
  output: 'standalone',
  images: {
    unoptimized: true,  // Skip image optimization
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Disable some optimizations for build
    webpackBuildWorker: false,
  },
  // Suppress all warnings
  onError: (err, req, res) => {
    console.error(err);
    res.status(500).end();
  },
};

module.exports = nextConfig;