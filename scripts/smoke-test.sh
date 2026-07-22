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

healthy=0
for _ in $(seq 1 60); do
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
  fail "${MODE} server not healthy after 120s"
fi
echo "${MODE} server health check passed"

if ! curl -sfL --max-time 90 "${BASE}/" | grep -q 'getting-started'; then
  fail "homepage does not contain expected content"
fi
echo "${MODE} server content check passed"

if ! curl -sf --max-time 30 "${BASE}/api/page?slug=docs,getting-started" | grep -q '"title"'; then
  fail "page API did not return page metadata"
fi
echo "${MODE} server page API check passed"
