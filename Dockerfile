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
RUN chmod +x bin/chronicle.js
RUN ln -s /app/packages/chronicle/bin/chronicle.js /usr/local/bin/chronicle

# --- init project ---
WORKDIR /content
RUN bun add /app/packages/chronicle
RUN chronicle init

# --- runner ---
FROM base AS runner
WORKDIR /content

COPY --from=builder /content /content
COPY --from=builder /app/packages/chronicle /app/packages/chronicle
COPY --from=deps /app/package.json /app/bun.lock /app/
COPY --from=deps /app/packages/chronicle/package.json /app/packages/chronicle/
WORKDIR /app
RUN bun install --production --frozen-lockfile
WORKDIR /content
RUN ln -s /app/packages/chronicle/bin/chronicle.js /usr/local/bin/chronicle

VOLUME /content

EXPOSE 3000

ENTRYPOINT ["chronicle"]
CMD ["serve", "--port", "3000", "--host", "0.0.0.0"]
