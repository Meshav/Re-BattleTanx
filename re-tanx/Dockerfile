# Build once, ship two images: the Node game server and Caddy with the static client.
# Base images are overridable (a registry mirror, or pinning a digest): --build-arg NODE_IMAGE=... --build-arg CADDY_IMAGE=...
ARG NODE_IMAGE=node:22-alpine
ARG CADDY_IMAGE=caddy:2-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY packages/sim/package.json packages/sim/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
RUN npm ci
COPY . .
RUN npm run check && npm run build

FROM ${NODE_IMAGE} AS server
WORKDIR /app
ENV NODE_ENV=production PORT=8787 DATA_DIR=/data
RUN mkdir -p /data && chown node /data
COPY --from=build /app /app
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["npx", "tsx", "packages/server/src/main.ts"]

FROM ${CADDY_IMAGE} AS web
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/packages/client/dist /srv
