FROM oven/bun:latest AS build

WORKDIR /app

COPY package.json ./
RUN bun install --no-frozen-lockfile

COPY packages ./packages
COPY tsconfig.json ./
RUN bun run docker:build

FROM oven/bun:latest AS production

WORKDIR /app

RUN adduser --disabled-password --gecos "" user && chown -R user:user /app

COPY --from=build /app/packages/api/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/bun.lock ./

RUN bun install --production --no-frozen-lockfile

ENV NODE_ENV=production

USER user

EXPOSE 80

CMD ["bun", "run", "docker:start"]
