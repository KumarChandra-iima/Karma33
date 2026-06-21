#!/usr/bin/env bash
# Verify a deployed URL is actually serving the app, using Playwright (screenshot)
# + a local Ollama vision model (judgment), instead of asking a human to eyeball it.
#
# Usage: dev-control/scripts/verify-deployment.sh <url> [expected-text-substring]
#
# Exit code: 0 if the model says PASS, 1 if FAIL or the check could not run.

set -euo pipefail

URL="${1:?Usage: verify-deployment.sh <url> [expected-text-substring]}"
EXPECT="${2:-}"
MODEL="${OLLAMA_VERIFY_MODEL:-qwen2.5vl:7b}"

WORKDIR=$(mktemp -d)
SHOT="$WORKDIR/screenshot.png"
trap 'rm -rf "$WORKDIR"' EXIT

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$URL" || echo "000")

playwright screenshot --wait-for-timeout 2500 --viewport-size "390,844" "$URL" "$SHOT" >/dev/null 2>&1 || {
  echo "URL: $URL"
  echo "HTTP status: $STATUS"
  echo "Vision verdict: FAIL (could not capture screenshot - page may not have loaded)"
  exit 1
}

PROMPT="You are verifying a deployed web app. HTTP status code observed: $STATUS. URL: $URL.
Look at the attached screenshot. Reply with exactly two lines:
Line 1: PASS or FAIL
Line 2: one short sentence why.
PASS = a real working app UI is visible (not blank, not a browser error page, not a 404/Not Found page, not a generic platform error screen).
FAIL otherwise (blank/white screen, 404 page, error page, broken layout with no visible content)."

if [ -n "$EXPECT" ]; then
  PROMPT="$PROMPT
Also confirm the page appears to be the expected app (look for branding/text related to: \"$EXPECT\")."
fi

cd "$WORKDIR"
RESULT=$(ollama run "$MODEL" "$PROMPT

screenshot.png")

echo "URL: $URL"
echo "HTTP status: $STATUS"
echo "Vision verdict:"
echo "$RESULT"

echo "$RESULT" | head -1 | grep -qi '^PASS' && exit 0 || exit 1
