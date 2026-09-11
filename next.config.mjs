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
      'docx',
      'exceljs',
      'qrcode',
      'jspdf',
    ],
    outputFileTracingIncludes: {
      '/api/**/*': ['./data/seed-rakeeza.db', './public/fonts/**'],
      '/*': ['./data/seed-rakeeza.db'],
      '/api/export/pdf': [
        './node_modules/@sparticuz/chromium/**',
        './public/fonts/**',
      ],
      '/api/export/pdf/route': [
        './node_modules/@sparticuz/chromium/**',
        './public/fonts/**',
      ],
    },
  },
};

export default nextConfig;
