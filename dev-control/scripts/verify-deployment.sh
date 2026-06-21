#!/usr/bin/env bash
# Verify a deployed URL is actually serving the app, using Playwright (video +
# screenshot) + a local Ollama vision model (judgment), instead of asking a
# human to eyeball it. The video is saved locally (this machine only, never
# committed - see .gitignore) so Kumar has durable evidence to review later.
#
# Usage: dev-control/scripts/verify-deployment.sh <url> [expected-text-substring]
#
# Exit code: 0 if the model says PASS, 1 if FAIL or the check could not run.

set -euo pipefail

URL="${1:?Usage: verify-deployment.sh <url> [expected-text-substring]}"
EXPECT="${2:-}"
MODEL="${OLLAMA_VERIFY_MODEL:-qwen2.5vl:7b}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VIDEO_DIR="$REPO_ROOT/dev-control/verification-videos"

WORKDIR=$(mktemp -d)
SHOT="$WORKDIR/screenshot.png"
trap 'rm -rf "$WORKDIR"' EXIT

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$URL" || echo "000")

CAPTURE_JSON=$(node "$SCRIPT_DIR/capture-deployment.cjs" "$URL" "$VIDEO_DIR" "$SHOT" 2>/dev/null || echo '{}')
VIDEO_PATH=$(node -e "try{const d=JSON.parse(process.argv[1]);console.log(d.videoPath||'')}catch(e){console.log('')}" "$CAPTURE_JSON")

if [ ! -s "$SHOT" ]; then
  echo "URL: $URL"
  echo "HTTP status: $STATUS"
  echo "Video: ${VIDEO_PATH:-not captured}"
  echo "Vision verdict: FAIL (could not capture screenshot - page may not have loaded)"
  exit 1
fi

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
echo "Video: ${VIDEO_PATH:-not captured}"
echo "Vision verdict:"
echo "$RESULT"

echo "$RESULT" | head -1 | grep -qi '^PASS' && exit 0 || exit 1
