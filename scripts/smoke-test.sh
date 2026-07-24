#!/usr/bin/env bash
# Smoke test a chronicle server against examples/basic.
# Usage: scripts/smoke-test.sh <dev|start> <port>
set -euo pipefail

MODE="${1:?usage: smoke-test.sh <dev|start> <port>}"
PORT="${2:?usage: smoke-test.sh <dev|start> <port>}"
BASE="http://localhost:${PORT}"
LOG_FILE="smoke-${MODE}.log"

./packages/chronicle/bin/chronicle.js "$MODE" --config examples/basic/chronicle.yaml --port "$PORT" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

cleanup() {
  # Git Bash `kill` doesn't reach grandchild node processes on Windows
  if [[ "${RUNNER_OS:-}" == "Windows" ]]; then
    taskkill //F //T //PID "$SERVER_PID" >/dev/null 2>&1 || true
  else
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

fail() {
  echo "FAIL: $1"
  echo "--- server log (${LOG_FILE}) ---"
  cat "$LOG_FILE"
  exit 1
}

# Wall-clock deadline; SECONDS counts from script start, which includes server spawn
HEALTH_BUDGET="${HEALTH_BUDGET:-120}"
healthy=0
while (( SECONDS < HEALTH_BUDGET )); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    fail "${MODE} server exited before becoming healthy"
  fi
  if curl -sf --max-time 5 "${BASE}/api/health" | grep -q '"ok"'; then
    healthy=1
    break
  fi
  sleep 2
done
if [[ "$healthy" -ne 1 ]]; then
  fail "${MODE} server not healthy after ${HEALTH_BUDGET}s"
fi
echo "${MODE} server health check passed"

# Load-time budgets (seconds); first load includes SSR compile in dev mode
FIRST_LOAD_BUDGET="${FIRST_LOAD_BUDGET:-60}"
WARM_LOAD_BUDGET="${WARM_LOAD_BUDGET:-10}"
BODY_FILE="smoke-${MODE}-page.html"

# The health endpoint comes up before Vite's SSR environment in dev mode, so
# early page loads can 503 while the environment warms — retry within budget
first_time=""
first_start=$SECONDS
while (( SECONDS - first_start < FIRST_LOAD_BUDGET )); do
  result=$(curl -sL -o "$BODY_FILE" -w '%{http_code} %{time_total}' \
    --max-time "$FIRST_LOAD_BUDGET" "${BASE}/") || result="000 0"
  status="${result%% *}"
  if [[ "$status" == "200" ]]; then
    first_time="${result##* }"
    break
  fi
  sleep 2
done
[[ -n "$first_time" ]] \
  || fail "first page load failed or exceeded ${FIRST_LOAD_BUDGET}s budget (last status ${status})"
if ! grep -q 'getting-started' "$BODY_FILE"; then
  fail "homepage does not contain expected content"
fi
echo "${MODE} server content check passed (first load ${first_time}s, budget ${FIRST_LOAD_BUDGET}s)"

warm_time=$(curl -sfL -o /dev/null -w '%{time_total}' --max-time "$WARM_LOAD_BUDGET" "${BASE}/") \
  || fail "warm page load failed or exceeded ${WARM_LOAD_BUDGET}s budget"
echo "${MODE} server warm load check passed (${warm_time}s, budget ${WARM_LOAD_BUDGET}s)"

if ! curl -sf --max-time 30 "${BASE}/api/page?slug=docs,getting-started" | grep -q '"title"'; then
  fail "page API did not return page metadata"
fi
echo "${MODE} server page API check passed"

# Crawl pages from the sitemap; in dev mode each request exercises SSR compile
CRAWL_LIMIT="${CRAWL_LIMIT:-15}"
CRAWL_BUDGET="${CRAWL_BUDGET:-300}"

# `|| true`: an empty sitemap makes grep exit 1, which must reach the
# explicit fail below instead of killing the script under pipefail
paths=$(curl -sf --max-time 30 "${BASE}/sitemap.xml" \
  | grep -o '<loc>[^<]*</loc>' \
  | sed -E -e 's|</?loc>||g' -e 's|^https?://[^/]*||' -e 's|^$|/|' \
  | awk -v n="$CRAWL_LIMIT" 'NR <= n' || true)
if [[ -z "$paths" ]]; then
  fail "sitemap.xml returned no URLs"
fi

crawled=0
crawl_start=$SECONDS
while IFS= read -r page_path; do
  if (( SECONDS - crawl_start > CRAWL_BUDGET )); then
    fail "crawl exceeded ${CRAWL_BUDGET}s budget after ${crawled} pages"
  fi
  status=$(curl -sL -o "$BODY_FILE" -w '%{http_code}' --max-time 30 "${BASE}${page_path}") || status=000
  if [[ "$status" != "200" ]]; then
    fail "GET ${page_path} returned HTTP ${status}"
  fi
  if ! grep -q '</html>' "$BODY_FILE"; then
    fail "GET ${page_path} returned truncated or incomplete HTML"
  fi
  crawled=$((crawled + 1))
done <<<"$paths"
echo "${MODE} server crawl passed (${crawled} pages)"
