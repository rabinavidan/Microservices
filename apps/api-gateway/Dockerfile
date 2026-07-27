# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY libs/common/package.json libs/common/package.json
COPY apps/api-gateway/package.json apps/api-gateway/package.json
RUN npm ci

COPY libs/common libs/common
COPY apps/api-gateway apps/api-gateway
RUN npm run build -w libs/common && npm run build -w apps/api-gateway

FROM node:20-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/libs/common/dist ./libs/common/dist
COPY --from=builder /workspace/libs/common/package.json ./libs/common/package.json
COPY --from=builder /workspace/apps/api-gateway/dist ./apps/api-gateway/dist
COPY --from=builder /workspace/apps/api-gateway/package.json ./apps/api-gateway/package.json

EXPOSE 3000
CMD ["node", "apps/api-gateway/dist/main.js"]
