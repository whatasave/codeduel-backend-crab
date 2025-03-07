FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production

COPY . .

ENV NODE_ENV=production

RUN adduser --disabled-password --gecos "" user && chown -R user:user /app

USER user

EXPOSE 80

CMD ["bun", "-F=@codeduel-backend-crab/api", "run", "start"]
