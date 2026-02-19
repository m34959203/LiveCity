#!/bin/bash
# ===========================================
# Trigger venue-scout (City Radar) manually
# ===========================================
# Usage:
#   ./scripts/trigger-radar.sh                         # local (localhost:3000)
#   ./scripts/trigger-radar.sh https://livecity.up.railway.app  # production
#
# Required env:
#   CRON_SECRET — must match the server's CRON_SECRET

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:?Set CRON_SECRET env variable}"

echo "=== LiveCity City Radar ==="
echo "Target: ${BASE_URL}"
echo ""

# 1. Purge old seed data first
echo "[1/2] Purging seed venues..."
PURGE_RESULT=$(curl -s -X POST "${BASE_URL}/api/cron/purge-seed" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json")

echo "${PURGE_RESULT}" | python3 -m json.tool 2>/dev/null || echo "${PURGE_RESULT}"
echo ""

# 2. Run venue-scout (City Radar)
echo "[2/2] Running venue-scout (5 cities, may take 2-3 minutes)..."
SCOUT_RESULT=$(curl -s -X POST "${BASE_URL}/api/cron/venue-scout" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  --max-time 300)

echo "${SCOUT_RESULT}" | python3 -m json.tool 2>/dev/null || echo "${SCOUT_RESULT}"
echo ""
echo "=== Done ==="
