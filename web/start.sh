#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Pilote Project — web (landing + admin + distribution API) production launcher.
#
# Brings the Next.js app up from scratch: installs deps, generates the Prisma
# client, applies migrations, seeds the first admin (idempotent), builds, and
# serves. Safe to re-run.
#
# Usage:
#   ./start.sh                # full prod boot (install + migrate + seed + build + start)
#   SKIP_BUILD=1 ./start.sh   # skip the build step (e.g. already built)
#   SKIP_INSTALL=1 ./start.sh # skip dependency install
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$1"; }
red() { printf '\033[0;31m%s\033[0m\n' "$1"; }

# 1. Environment ---------------------------------------------------------------
if [ ! -f ".env" ] && [ ! -f "../.env" ]; then
  red "✗ No .env found. Copy .env.example to .env and fill in the secrets first."
  yellow "  cp .env.example .env  &&  edit .env"
  exit 1
fi
# shellcheck disable=SC1091
[ -f ".env" ] && set -a && . ./.env && set +a

# Bind to the host's allocated port. Pterodactyl/most PaaS expose it as SERVER_PORT;
# fall back to PORT, then 3000 for local dev.
: "${PORT:=${SERVER_PORT:-3000}}"
export PORT
export NODE_ENV="${NODE_ENV:-production}"

green "▶ Pilote Project web — booting (NODE_ENV=$NODE_ENV, PORT=$PORT)"

# 2. Toolchain check -----------------------------------------------------------
command -v node >/dev/null 2>&1 || { red "✗ Node.js is required"; exit 1; }
if command -v pnpm >/dev/null 2>&1; then PKG=pnpm; else PKG=npm; fi
green "▶ Using package manager: $PKG"

# 3. Dependencies (install from the monorepo root so workspaces resolve) -------
if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  green "▶ Installing dependencies…"
  if [ "$PKG" = "pnpm" ]; then
    (cd .. && pnpm install --frozen-lockfile || pnpm install)
  else
    npm install
  fi
fi

# 4. Database ------------------------------------------------------------------
green "▶ Generating Prisma client…"
$PKG run db:generate

green "▶ Applying database migrations…"
# `migrate deploy` is a no-op when there are no pending migrations.
$PKG exec prisma migrate deploy || {
  yellow "⚠ No migrations found — pushing schema directly (dev fallback)."
  $PKG exec prisma db push
}

green "▶ Seeding first admin (idempotent)…"
$PKG run db:seed || yellow "⚠ Seed skipped or already applied."

# 5. Build ---------------------------------------------------------------------
if [ "${SKIP_BUILD:-0}" != "1" ]; then
  green "▶ Building Next.js…"
  $PKG run build
fi

# 6. Serve ---------------------------------------------------------------------
green "✓ Starting Pilote Project web on port $PORT"
exec $PKG run start
