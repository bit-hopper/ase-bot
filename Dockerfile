# Mirrors local dev exactly: the project runs TypeScript directly via tsx (never from dist/),
# so migrate.ts's MIGRATIONS_DIR and loadTemplates.ts's DEFAULT_TEMPLATES_PATH (both resolved
# relative to import.meta.url) work unmodified as long as src/ and templates/ keep their
# on-disk layout. glibc base (not Alpine) because sweph ships prebuilt native binaries for
# linux-arm64/linux-x64 built against glibc, not musl — see node_modules/sweph/prebuilds/.
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY templates ./templates

# node:*-bookworm-slim doesn't ship curl by default.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Same two files CI fetches (.github/workflows/ci.yml) — §5.1 only needs Sun-Pluto, no
# asteroids, so the 600-year main-planet + Moon files (1800-2400) are sufficient.
RUN mkdir -p ephe \
 && curl -fL -o ephe/sepl_18.se1 https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/sepl_18.se1 \
 && curl -fL -o ephe/semo_18.se1 https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/semo_18.se1

ENV SWEPH_PATH=/app/ephe

# loadEnv() requires these to be *present* at build time (never touched by ephemeris
# verification, which never reaches Postgres/Redis/Bluesky) — same placeholder pattern CI uses.
# Real values are supplied at container runtime via docker-compose.prod.yml's env_file/environment.
ARG ASE_HANDLE=build-placeholder.bsky.social
ARG ASE_APP_PASSWORD=0000-0000-0000-0000
ARG ASE_DID=did:plc:build0000000000000000000000000
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ARG REDIS_URL=redis://localhost:6379
ENV ASE_HANDLE=$ASE_HANDLE
ENV ASE_APP_PASSWORD=$ASE_APP_PASSWORD
ENV ASE_DID=$ASE_DID
ENV DATABASE_URL=$DATABASE_URL
ENV REDIS_URL=$REDIS_URL

# Fails the image build immediately on a corrupt/incomplete ephemeris fetch, rather than a
# live container silently falling back to the Moshier approximation (§5.1 guard in ephemeris.ts
# already turns that into a hard runtime error — this just catches it earlier, at build time).
RUN npm run verify-ephemeris

# migrate is idempotent (schema_migrations tracking table) — safe to run on every container
# start, including restarts after a crash or host reboot. Invokes tsx directly (not via `npm
# start`) so the final `exec` replaces PID 1 with the actual long-running Node process — `npm
# run`/`npm start` don't reliably forward SIGTERM to the script they wrap, which would silently
# defeat main.ts's own graceful-shutdown handling (firehose/queue/redis teardown) on `docker stop`.
CMD ["sh", "-c", "npm run migrate && exec node_modules/.bin/tsx --env-file-if-exists=.env src/main.ts"]
