/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pharmaveille-dz.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      // Augmenter la limite pour l'upload des fichiers Excel MIPH (peuvent dépasser 4 Mo)
      bodySizeLimit: '50mb',
    },
    // Polices + logo lus via fs par lib/garde-social.tsx (images de garde) —
    // à inclure explicitement dans le bundle des fonctions serverless
    // qui génèrent ces images.
    outputFileTracingIncludes: {
      '/api/garde/social-image': ['./assets/fonts/**', './assets/dwadz-logo.png'],
      '/api/cron/garde-daily': ['./assets/fonts/**', './assets/dwadz-logo.png'],
      '/api/publish': ['./assets/fonts/**', './assets/dwadz-logo.png'],
    },
  },
}

module.exports = nextConfig
