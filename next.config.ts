import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Désactiver le webpack de base pour utiliser Turbopack
  webpack: (config) => {
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: "bdb-consulting",
  project: "bdb-app",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  

  
  disableLogger: true,
  
  // Options de source maps
  sourceMaps: {
    include: ['./app', './lib'],
    ignore: ['node_modules'],
  },
  
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  
  // Désactiver le téléchargement des source maps en développement
  dryRun: process.env.NODE_ENV !== 'production',
});
