#!/bin/sh
set -e

echo "Running database migrations..."
npm run db:generate
npm run db:push

echo "Seeding database..."
npx tsx src/seed/seed.ts

echo "Starting backend server..."
npx tsx src/index.ts
