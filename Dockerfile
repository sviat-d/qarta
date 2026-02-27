FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json turbo.json ./

# Copy all workspace package.json files for install
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/

# Install all dependencies (workspace resolution happens here)
RUN npm ci

# Copy source code
COPY packages/config/ packages/config/
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Build shared + API (turbo handles dependency order)
RUN npx turbo build --filter=@qarta/api

# --- Production stage ---
FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/

RUN npm ci --omit=dev

# Copy compiled output
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/shared/dist packages/shared/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/server.js"]
