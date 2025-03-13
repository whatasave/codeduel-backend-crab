FROM oven/bun:latest AS build

WORKDIR /app

COPY bun.lock ./
COPY package.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/database/package.json ./packages/database/
COPY packages/server/package.json ./packages/server/
RUN bun install --no-frozen-lockfile

COPY packages/api/src ./packages/api/src
COPY packages/api/tsconfig.json ./packages/api/
COPY packages/database/src ./packages/database/src
COPY packages/database/tsconfig.json ./packages/database/
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json ./packages/server/
COPY tsconfig.json ./
RUN bun run build

FROM oven/bun:latest AS production

WORKDIR /app
RUN adduser --disabled-password --gecos "" user && chown -R user:user /app

COPY --from=build /app/bun.lock ./
COPY --from=build /app/package.json ./
COPY --from=build /app/packages/api/package.json ./packages/api/
COPY --from=build /app/packages/database/package.json ./packages/database/
COPY --from=build /app/packages/server/package.json ./packages/server/
RUN bun install --production --no-frozen-lockfile

COPY --from=build /app/packages/api/dist ./dist

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=80

USER user
EXPOSE 80

CMD ["bun", "run", "/app/dist/main.js"]
