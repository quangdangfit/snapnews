#!/bin/sh
set -e

echo "[entrypoint] running prisma migrate deploy"
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] starting server"
exec node server.js
