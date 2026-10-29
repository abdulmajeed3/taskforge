# syntax=docker/dockerfile:1
# Multi-stage build for the TaskForge API (NestJS + Fastify).
# NOTE: authored but not built/run in the environment this project was created in
# (no Docker runtime available there). See docs/DEPLOYMENT.md.

FROM node:26-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY prisma/schema.prisma prisma/schema.prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build:api
RUN npx prisma generate --schema prisma/schema.prisma

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
EXPOSE 3000
USER node
CMD ["node", "apps/api/dist/main.js"]
