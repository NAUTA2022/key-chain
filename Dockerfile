# syntax=docker/dockerfile:1
# Railway "web" service: builds the React Router SPA (prerendered) and serves
# build/client with Caddy, mirroring vercel.json (rewrites + security headers).

FROM node:22.22-slim AS build
WORKDIR /app
# Public build-time configuration (Railway passes service variables as build args).
ARG VITE_API_URL
ARG VITE_SITE_URL
ARG VITE_THIRDWEB_CLIENT_ID
ARG VITE_CHAIN_ID
ARG VITE_CHAIN_RPC_URL
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM caddy:2.10-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/build/client /srv
