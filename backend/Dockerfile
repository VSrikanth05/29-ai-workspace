# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY backend/package.json backend/package-lock.json ./backend/

RUN --mount=type=cache,target=/root/.npm npm ci \
 && npm ci --prefix ./backend

COPY backend ./backend
RUN ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma \
 && npm run build --prefix ./backend \
 && npm prune --omit=dev --prefix ./backend \
 && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=5000
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates dumb-init openssl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --from=build --chown=node:node /app/prisma ./prisma

USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/dist/main.js"]
