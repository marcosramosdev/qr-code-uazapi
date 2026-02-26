FROM oven/bun:1 AS builder
WORKDIR /app

# Copia tudo (turbo.json precisa estar disponível para o postinstall)
COPY . .

# Instala dependências e compila tudo
RUN bun install
RUN bun run build:single

# ── imagem final mínima ──────────────────────────────────────────────────────
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Artefatos do servidor compilado
COPY --from=builder /app/server/dist ./server/dist

# Frontend compilado servido como estático
COPY --from=builder /app/server/static ./server/static

# Dependências do workspace (hono, shared, etc ficam aqui)
COPY --from=builder /app/node_modules ./node_modules

# Package.json necessários para resolução de módulos
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server/package.json ./server/package.json

ENV NODE_ENV=production
EXPOSE 3000

# Roda a partir do diretório server, igual ao start:single
WORKDIR /app/server
CMD ["bun", "run", "dist/index.js"]
