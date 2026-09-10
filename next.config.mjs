/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
    outputFileTracingIncludes: {
      '/api/**/*': ['./data/seed-rakeeza.db'],
      '/*': ['./data/seed-rakeeza.db'],
    },
  },
};

export default nextConfig;
