# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY libs/common/package.json libs/common/package.json
COPY apps/payments-service/package.json apps/payments-service/package.json
RUN npm ci

COPY libs/common libs/common
COPY apps/payments-service apps/payments-service
RUN npm run build -w libs/common && npm run build -w apps/payments-service

FROM node:20-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/libs/common/dist ./libs/common/dist
COPY --from=builder /workspace/libs/common/package.json ./libs/common/package.json
COPY --from=builder /workspace/apps/payments-service/dist ./apps/payments-service/dist
COPY --from=builder /workspace/apps/payments-service/package.json ./apps/payments-service/package.json

EXPOSE 3002 4002
CMD ["node", "apps/payments-service/dist/main.js"]
