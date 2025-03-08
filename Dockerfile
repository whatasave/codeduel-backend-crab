FROM oven/bun:latest

WORKDIR /app

COPY package.json ./

RUN bun install --production --no-frozen-lockfile

COPY packages/ ./packages/
COPY tsconfig.json ./

ENV NODE_ENV=production

RUN adduser --disabled-password --gecos "" user && chown -R user:user /app

USER user

RUN bun run build

WORKDIR /app/packages/api

EXPOSE 80

CMD ["bun", "run", "start"]
