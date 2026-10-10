FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code and drizzle configs
COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY drizzle ./drizzle

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
