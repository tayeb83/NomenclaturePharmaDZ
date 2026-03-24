/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empêche webpack de bundler ces packages Node.js côté client
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
}

module.exports = nextConfig
