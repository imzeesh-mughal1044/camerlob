# syntax=docker/dockerfile:1
#
# Optional self-hosting image for Camerlob.
#
# The image installs the three native conversion engines that the server-side
# path needs: ImageMagick (layered and publication formats), LibRaw (camera RAW)
# and Ghostscript (EPS, PS, XPS). Client-side conversion needs none of them.
#
# Build:  docker build -t camerlob .
# Run:    docker run --rm -p 3000:3000 camerlob
#
# Note: Ghostscript is AGPL. It is installed from the distro repository and is
# never redistributed inside this image's source form; see Documents/TRD.md
# section 18, risk 5.

# ---- Stage 1: dependencies -------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Stage 2: build --------------------------------------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# ---- Stage 3: runtime with native engines ----------------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache \
      imagemagick \
      libraw \
      ghostscript \
      tini \
    && mkdir -p /tmp/camerlob \
    && chmod 700 /tmp/camerlob

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TEMP_UPLOAD_DIR=/tmp/camerlob \
    IMAGEMAGICK_PATH=/usr/bin/magick \
    LIBRAW_PATH=/usr/bin/dcraw_emu \
    GHOSTSCRIPT_PATH=/usr/bin/gs

# next.config.mjs sets output: 'standalone', so the server bundle is self-contained.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Drop privileges: the temp directory above is owned by root, group-writable only.
RUN addgroup -S camerlob && adduser -S camerlob -G camerlob \
    && chown -R camerlob:camerlob /app /tmp/camerlob
USER camerlob

EXPOSE 3000
VOLUME ["/tmp/camerlob"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
