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
};

export default withSentryConfig(nextConfig, {
  org: "bdb-consulting",
  project: "bdb-app",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  // Désactiver en développement
  dryRun: process.env.NODE_ENV !== 'production',
});
