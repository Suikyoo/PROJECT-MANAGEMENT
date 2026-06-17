#!/bin/sh
set -e

echo "Running database migrations..."
npm run db:push

echo "Seeding database..."
npx tsx src/seed/seed.ts

echo "Starting backend server..."
exec npx tsx src/index.ts
