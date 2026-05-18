#!/bin/sh
set -e

echo "[entrypoint] running prisma migrate deploy"
node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] seeding sources (idempotent)"
node ./node_modules/prisma/build/index.js db seed --schema=./prisma/schema.prisma

echo "[entrypoint] starting server"
exec node server.js
