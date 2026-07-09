FROM node:alpine3.24 AS builder
WORKDIR /build
# install dependencies
COPY package*.json ./
RUN npm ci
# build app
COPY public ./public/
COPY angular.json tsconfig*.json ./
COPY src src
RUN npm run build

# Stage 2: Serve app with Nginx
FROM nginx:stable-alpine3.23 AS runtime
# copy vite build
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /build/dist/starlite/browser /usr/share/nginx/html
# copy nginx conf file
COPY nginx.conf /etc/nginx/conf.d/default.conf
# launch ngnix
ENTRYPOINT ["nginx", "-g", "daemon off;"]
