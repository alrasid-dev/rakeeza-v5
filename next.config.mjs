/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      '@libsql/client',
      '@prisma/adapter-libsql',
      'bcryptjs',
      '@sparticuz/chromium',
      'puppeteer-core',
    ],
    outputFileTracingIncludes: {
      '/api/**/*': ['./data/seed-rakeeza.db'],
      '/*': ['./data/seed-rakeeza.db'],
    },
  },
};

export default nextConfig;
