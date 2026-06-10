FROM node:20-bookworm-slim

# ── Chrome headless shell system dependencies ─────────────────────────────────
# Remotion downloads its own chrome-headless-shell binary but it still needs
# these shared libraries to be present in the OS (Debian Bookworm package names).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnspr4 \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libasound2t64 \
    libxrandr2 \
    libxkbcommon0 \
    libxfixes3 \
    libxcomposite1 \
    libxdamage1 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    libxi6 \
    libxtst6 \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install Node deps ─────────────────────────────────────────────────────────
COPY package*.json ./
RUN npm ci

# Pre-download Remotion's Chrome headless shell during the build so it is
# cached in the image and does not need to be fetched at render time.
RUN npx remotion browser ensure

# ── Build Next.js ─────────────────────────────────────────────────────────────
COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node_modules/.bin/next", "start"]
