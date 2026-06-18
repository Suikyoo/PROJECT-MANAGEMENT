#!/bin/sh
set -e

echo "Running database migrations..."
npm run db:generate
npm run db:push

echo "Clearing existing seed data..."
npx tsx src/seed/clear.ts || true

echo "Seeding database..."
npx tsx src/seed/seed.ts || true

echo "Starting backend server..."
npx tsx src/index.ts
