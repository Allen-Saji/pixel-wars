#!/bin/bash
# Paint Agent — round-aware pixel painter for Pixel Wars
# Usage: ./paint-agent.sh <api-key-file> <agent-name> <team-id>
#
# Checks /api/game every 30 seconds. Exits cleanly when round ends.

set -euo pipefail

KEY=$(cat "$1")
NAME="$2"
TEAM_ID=$3
HOST="${4:-https://pixel-wars.allensaji.dev}"
COUNT=0
ERRORS=0
LAST_CHECK=0
CHECK_INTERVAL=30

echo "🎨 $NAME starting paint loop (team $TEAM_ID)..."

while [ $ERRORS -lt 15 ]; do
  NOW=$(date +%s)

  # Check round status every CHECK_INTERVAL seconds
  if [ $((NOW - LAST_CHECK)) -ge $CHECK_INTERVAL ]; then
    LAST_CHECK=$NOW
    ACTIVE=$(curl -s "$HOST/api/game" 2>/dev/null | jq -r '.status.roundActive // false' 2>/dev/null || echo "false")
    if [ "$ACTIVE" != "true" ]; then
      echo "🏁 $NAME: round ended (roundActive=$ACTIVE). Exiting cleanly. $COUNT pixels placed."
      exit 0
    fi
    echo "✅ $NAME: round active, continuing... ($COUNT pixels so far)"
  fi

  # Team zones: 0=top, 1=mid, 2=bottom (70%), random raid (30%)
  RAND=$((RANDOM % 100))
  X=$((RANDOM % 50))

  if [ $RAND -lt 70 ]; then
    if [ $TEAM_ID -eq 0 ]; then
      Y=$((RANDOM % 17))
    elif [ $TEAM_ID -eq 1 ]; then
      Y=$((17 + RANDOM % 16))
    else
      Y=$((33 + RANDOM % 17))
    fi
  else
    Y=$((RANDOM % 50))
  fi

  RESULT=$(curl -s -X POST "$HOST/api/paint" \
    -H 'Content-Type: application/json' \
    -d "{\"apiKey\":\"$KEY\",\"x\":$X,\"y\":$Y}" 2>&1)

  SUCCESS=$(echo "$RESULT" | jq -r '.success // empty' 2>/dev/null)

  if [ "$SUCCESS" = "true" ]; then
    COUNT=$((COUNT + 1))
    ERRORS=0
    if [ $((COUNT % 15)) -eq 0 ]; then
      echo "🖌️  $NAME: $COUNT pixels placed"
    fi
  else
    ERRORS=$((ERRORS + 1))
    ERR=$(echo "$RESULT" | jq -r '.error // "unknown"' 2>/dev/null)
    if [ $((ERRORS % 5)) -eq 0 ]; then
      echo "⚠️  $NAME error #$ERRORS: $ERR"
    fi
  fi

  sleep 0.8
done

echo "🏁 $NAME finished (too many errors). $COUNT pixels placed."
