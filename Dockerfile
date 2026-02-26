FROM oven/bun:1 AS base
WORKDIR /app

# ── dependências ────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json bun.lock ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/
RUN bun install --frozen-lockfile

# ── build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN bun run build:single

# ── imagem final (apenas o necessário) ───────────────────────────────────────
FROM oven/bun:1-slim AS runner
WORKDIR /app

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/static ./server/static
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "server/dist/index.js"]
