/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empêche webpack de bundler ces packages Node.js côté serveur (RSC / API routes)
  serverExternalPackages: ['pg', 'pg-native', 'nodemailer', 'xlsx'],
  images: {
    domains: ['pharmaveille-dz.com'],
  },
  experimental: {
    serverActions: {
      // Augmenter la limite pour l'upload des fichiers Excel MIPH (peuvent dépasser 4 Mo)
      bodySizeLimit: '50mb',
    },
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      // Côté client, remplacer les modules Node.js-only par des stubs vides
      // pour éviter l'erreur "Cannot read properties of undefined (reading 'call')"
      // dans options.factory de webpack.js lors du chargement des chunks RSC
      config.resolve.fallback = {
        ...config.resolve.fallback,
        pg: false,
        'pg-native': false,
        'pg-pool': false,
        'pg-types': false,
        'pg-connection-string': false,
        nodemailer: false,
        xlsx: false,
        net: false,
        tls: false,
        dns: false,
        fs: false,
        child_process: false,
        crypto: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
