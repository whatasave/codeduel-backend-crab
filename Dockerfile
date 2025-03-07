FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production

COPY . .

ENV NODE_ENV=production

EXPOSE 80

CMD ["bun", "-F=@codeduel-backend-crab/api", "run", "start"]
