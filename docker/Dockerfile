FROM node:22-bookworm-slim

# pnpm comes from the "packageManager" field in package.json (pinned version)
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app

# Copy workspace config first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all package.json files for dependency installation
COPY packages/shared-data/package.json packages/shared-data/
COPY packages/shared-css/package.json packages/shared-css/
COPY packages/bench-harness/package.json packages/bench-harness/
COPY packages/parity-tests/package.json packages/parity-tests/
COPY packages/results-site/package.json packages/results-site/
COPY frameworks/react/package.json frameworks/react/
COPY frameworks/angular/package.json frameworks/angular/
COPY frameworks/vue/package.json frameworks/vue/

RUN pnpm install --frozen-lockfile

# Playwright's own Chromium build (and its system libraries), so the browser
# always matches the Playwright/CDP version pinned in the lockfile.
RUN pnpm --filter bench-harness exec playwright install --with-deps chromium

# Copy source code (see .dockerignore — host node_modules/dist are excluded)
COPY . .

# Build the harness at image build time so the image can also run compare-cli
RUN pnpm --filter shared-data build && pnpm --filter bench-harness build

CMD ["pnpm", "run", "benchmark"]
