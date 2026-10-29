# syntax=docker/dockerfile:1
# Multi-stage build for the TaskForge web app (Vite static build served by nginx).
# NOTE: authored but not built/run in the environment this project was created in
# (no Docker runtime available there). See docs/DEPLOYMENT.md.

FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
ARG VITE_API_BASE_URL=http://localhost:3000/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
WORKDIR /app
COPY . .
RUN npm run build:web

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
