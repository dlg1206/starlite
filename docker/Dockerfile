# docker/Dockerfile
FROM node:24-alpine3.24 AS base
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY public ./public/
COPY angular.json tsconfig*.json ./
COPY src src

# --- online build ---
FROM base AS build-online
RUN npm run build

# --- offline build ---
FROM base AS build-offline
COPY scripts/check-offline-data.mjs scripts/check-offline-data.mjs
COPY src/assets/data src/assets/data
RUN npm run build:offline

# --- online runtime ---
FROM nginx:stable-alpine3.23 AS online
RUN rm -rf /usr/share/nginx/html/*
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-online /build/dist/starlite/browser /usr/share/nginx/html
ENTRYPOINT ["nginx", "-g", "daemon off;"]

# --- offline runtime ---
FROM nginx:stable-alpine3.23 AS offline
RUN rm -rf /usr/share/nginx/html/*
COPY docker/nginx.offline.conf /etc/nginx/conf.d/default.conf
COPY --from=build-offline /build/dist/starlite/browser /usr/share/nginx/html
ENTRYPOINT ["nginx", "-g", "daemon off;"]
