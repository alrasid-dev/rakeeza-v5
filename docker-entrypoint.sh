#!/bin/sh
set -e
export DATABASE_URL="${DATABASE_URL:-file:/app/data/rakeeza.db}"
if [ ! -f /app/data/rakeeza.db ]; then
  echo "Initializing database..."
  npx prisma db push --skip-generate || true
  npx tsx prisma/seed.ts || node -e "console.log('seed skipped')"
fi
exec node server.js
