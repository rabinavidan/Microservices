# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY libs/common/package.json libs/common/package.json
COPY apps/orders-service/package.json apps/orders-service/package.json
RUN npm ci

COPY libs/common libs/common
COPY apps/orders-service apps/orders-service
RUN npm run build -w libs/common && npm run build -w apps/orders-service

FROM node:20-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/libs/common/dist ./libs/common/dist
COPY --from=builder /workspace/libs/common/package.json ./libs/common/package.json
COPY --from=builder /workspace/apps/orders-service/dist ./apps/orders-service/dist
COPY --from=builder /workspace/apps/orders-service/package.json ./apps/orders-service/package.json

EXPOSE 3001 4001
CMD ["node", "apps/orders-service/dist/main.js"]
