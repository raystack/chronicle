FROM oven/bun:1.3 AS base

# --- deps ---
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/chronicle/package.json ./packages/chronicle/
RUN bun install --frozen-lockfile

# --- build CLI ---
FROM base AS builder
WORKDIR /app/packages/chronicle
COPY --from=deps /app /app
COPY packages/chronicle ./
RUN bun build-cli.ts

# --- runner ---
FROM base AS runner
WORKDIR /app/packages/chronicle

COPY --from=builder /app /app

RUN chmod +x bin/chronicle.js
RUN ln -s /app/packages/chronicle/bin/chronicle.js /usr/local/bin/chronicle

RUN mkdir -p /app/content && ln -s /app/content /app/packages/chronicle/content

VOLUME /app/content

ENV CHRONICLE_CONTENT_DIR=./content
WORKDIR /app/packages/chronicle

EXPOSE 3000

ENTRYPOINT ["chronicle"]
CMD ["serve", "--port", "3000"]
