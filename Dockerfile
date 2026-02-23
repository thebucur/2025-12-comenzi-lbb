# Use Node 20 Bookworm - includes libatomic1, avoids Railpack apt step that can OOM (exit 137)
FROM node:20-bookworm-slim

WORKDIR /app

# Copy backend package files
COPY backend/package.json backend/package-lock.json* ./

# Install all deps (need devDeps for build), then prune after build
ENV SKIP_SUPABASE_POSTINSTALL=1
RUN npm ci || npm install

# Copy Prisma schema and generate client
COPY backend/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy source and build
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/scripts ./scripts
RUN npx tsc && npm prune --production

# Start: wait for DB, push schema, run server
CMD ["sh", "-c", "node scripts/wait-for-db.js && npx prisma db push --schema=./prisma/schema.prisma --skip-generate && node dist/server.js"]
