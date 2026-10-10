FROM oven/bun:1.4.2 AS base

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code, models, and drizzle configs
COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY drizzle ./drizzle
COPY models ./models

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
