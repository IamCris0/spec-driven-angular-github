# API de TaskFlow (specs/004-calidad-despliegue, H20). node:22-slim usa glibc, compatible con los binarios
# precompilados de better-sqlite3; Alpine (musl) obligaría a compilarlo.
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/taskflow.db \
    BACKUP_DIR=/app/backups

# Primero las dependencias: si el código cambia pero package-lock.json no, Docker reutiliza esta capa.
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts

# La base y los respaldos viven en volúmenes; el proceso no corre como root.
RUN mkdir -p /app/data /app/backups && chown -R node:node /app/data /app/backups
USER node

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
