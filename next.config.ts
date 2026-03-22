import type { NextConfig } from 'next';

const cloudflareScriptSources = [
  'https://*.cloudflare.com',
  'https://*.cloudflareinsights.com',
];

const cloudflareConnectSources = [
  'https://*.cloudflare.com',
  'https://cloudflareinsights.com',
  'https://*.cloudflareinsights.com',
];

const cloudflareFrameSources = ['https://*.cloudflare.com'];

const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval' " : ''}'unsafe-inline' ${cloudflareScriptSources.join(' ')}`,
  `connect-src 'self' ${cloudflareConnectSources.join(' ')}`,
  "font-src 'self' data:",
  `frame-src 'self' ${cloudflareFrameSources.join(' ')}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
