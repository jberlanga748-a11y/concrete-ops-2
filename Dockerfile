FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/app/data

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/scripts/postgres-transfer.mjs ./scripts/postgres-transfer.mjs
COPY --from=build /app/supabase/migrations ./supabase/migrations

RUN test -f /app/shared/permissions.js
RUN test -f /app/scripts/postgres-transfer.mjs
RUN test -f /app/supabase/migrations/202605240001_apex_hq_initial_schema.sql

RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- "http://127.0.0.1:${PORT}/api/ready" >/dev/null || exit 1

CMD ["npm", "run", "serve"]
