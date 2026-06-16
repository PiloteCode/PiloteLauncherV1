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
};

export default nextConfig;
