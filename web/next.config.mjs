/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @pilote/types is a workspace TS package consumed directly.
  transpilePackages: ['@pilote/types'],
  // argon2 (native) must stay external to the server bundle.
  serverExternalPackages: ['@node-rs/argon2', '@prisma/client'],
  eslint: { ignoreDuringBuilds: true },
  // Large file uploads handled in route handlers (Node runtime).
  experimental: {
    serverActions: { bodySizeLimit: '256mb' },
  },
  // @pilote/types ships source-first with explicit ".js" import specifiers (NodeNext style).
  // Teach webpack to resolve those to the real .ts files so no prebuild of the package is
  // required (keeps `start.sh` working on a fresh clone).
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
