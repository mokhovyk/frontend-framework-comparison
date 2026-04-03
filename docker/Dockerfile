FROM node:22-bookworm-slim

# Install Chrome and dependencies for headless rendering
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    xvfb \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set Chrome environment variables
ENV CHROME_BIN=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV DISPLAY=:99

WORKDIR /app

# Copy workspace config first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy all package.json files for dependency installation
COPY packages/shared-data/package.json packages/shared-data/
COPY packages/shared-css/package.json packages/shared-css/
COPY packages/bench-harness/package.json packages/bench-harness/
COPY packages/parity-tests/package.json packages/parity-tests/
COPY packages/results-site/package.json packages/results-site/
COPY frameworks/react/package.json frameworks/react/
COPY frameworks/angular/package.json frameworks/angular/
COPY frameworks/vue/package.json frameworks/vue/
COPY frameworks/svelte/package.json frameworks/svelte/

RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY . .

# Build shared packages
RUN pnpm --filter shared-data build && pnpm --filter shared-css build

# Entrypoint with Xvfb for headless rendering
COPY docker/xvfb-entrypoint.sh /usr/local/bin/xvfb-entrypoint.sh
RUN chmod +x /usr/local/bin/xvfb-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/xvfb-entrypoint.sh"]
CMD ["pnpm", "run", "benchmark"]
