# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY libs/common/package.json libs/common/package.json
COPY apps/inventory-service/package.json apps/inventory-service/package.json
RUN npm ci

COPY libs/common libs/common
COPY apps/inventory-service apps/inventory-service
RUN npm run build -w libs/common && npm run build -w apps/inventory-service

FROM node:20-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/libs/common/dist ./libs/common/dist
COPY --from=builder /workspace/libs/common/package.json ./libs/common/package.json
COPY --from=builder /workspace/apps/inventory-service/dist ./apps/inventory-service/dist
COPY --from=builder /workspace/apps/inventory-service/package.json ./apps/inventory-service/package.json

EXPOSE 3003 4003
CMD ["node", "apps/inventory-service/dist/main.js"]
