FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- deps ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/chronicle/package.json ./packages/chronicle/
RUN pnpm install --frozen-lockfile --filter @raystack/chronicle

# --- build CLI ---
FROM base AS builder
WORKDIR /app/packages/chronicle
COPY --from=deps /app /app
COPY packages/chronicle ./
RUN pnpm build:cli

# --- runner ---
FROM base AS runner
WORKDIR /app/packages/chronicle

COPY --from=builder /app /app

RUN chmod +x bin/chronicle.js
RUN ln -s /app/packages/chronicle/bin/chronicle.js /usr/local/bin/chronicle

RUN mkdir -p /app/content && ln -s /app/content /app/packages/chronicle/content
RUN chown -R node:node /app

VOLUME /app/content
USER node

ENV CHRONICLE_CONTENT_DIR=./content
WORKDIR /app/packages/chronicle

EXPOSE 3000

ENTRYPOINT ["chronicle"]
CMD ["dev", "--port", "3000"]
