# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY libs/common/package.json libs/common/package.json
COPY apps/notifications-service/package.json apps/notifications-service/package.json
RUN npm ci

COPY libs/common libs/common
COPY apps/notifications-service apps/notifications-service
RUN npm run build -w libs/common && npm run build -w apps/notifications-service

FROM node:20-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/libs/common/dist ./libs/common/dist
COPY --from=builder /workspace/libs/common/package.json ./libs/common/package.json
COPY --from=builder /workspace/apps/notifications-service/dist ./apps/notifications-service/dist
COPY --from=builder /workspace/apps/notifications-service/package.json ./apps/notifications-service/package.json

EXPOSE 3004 4004
CMD ["node", "apps/notifications-service/dist/main.js"]
