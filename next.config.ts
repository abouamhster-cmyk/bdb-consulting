 import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  images: {
    domains: ['picsum.photos', 'storage.googleapis.com', 'lh3.googleusercontent.com'],
    unoptimized: true,
  },
  // Désactiver les en-têtes X-Powered-By pour la sécurité
  poweredByHeader: false,
};

// Configuration Sentry
export default withSentryConfig(nextConfig, {
  // Paramètres Sentry
  org: "bdb-consulting",
  project: "bdb-app",
  
  // Options de build
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  
  // Options de source maps
  sourceMaps: {
    deleteSourcemapsAfterUpload: true,
  },
});