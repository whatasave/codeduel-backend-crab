FROM oven/bun:latest AS build

WORKDIR /app

COPY package.json ./

RUN bun install --no-frozen-lockfile

COPY packages ./packages
COPY tsconfig.json ./

RUN bun run build

FROM oven/bun:latest AS production

RUN adduser --disabled-password --gecos "" user && chown -R user:user /app

USER user

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/bun.lock ./

RUN bun install --production --no-frozen-lockfile

ENV NODE_ENV=production

EXPOSE 80

CMD ["bun", "run", "start"]
