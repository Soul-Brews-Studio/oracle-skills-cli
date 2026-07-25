#!/usr/bin/env bash
# Keep the Oracle-population numbers quoted in skills/ honest.
#
# Why this exists: /oracle-family-scan's SKILL.md advertised "186+ Oracles" for
# months while the real registry passed 800 — a 4.5x drift nobody noticed,
# because a number in prose has nothing checking it. CI cannot reach the live
# registry (it lives in a separate repo), so the contract is:
#
#   skills/oracle-family-scan/registry-snapshot.json  = the number we claim
#   laris-co/mother-oracle `query.ts --stats`         = the number that is true
#
# This gate enforces two things a reader would otherwise have to trust:
#   1. every population figure written in SKILL.md matches the snapshot
#   2. the snapshot itself is not older than max_age_days
#
# When it fails, re-sync and update both:
#   bun "$(ghq root)/github.com/laris-co/mother-oracle/registry/sync.ts"
#   bun "$(ghq root)/github.com/laris-co/mother-oracle/registry/query.ts" --stats
set -euo pipefail

SNAP="skills/oracle-family-scan/registry-snapshot.json"
SKILL="skills/oracle-family-scan/SKILL.md"

[ -f "$SNAP" ]  || { echo "❌ missing $SNAP"; exit 1; }
[ -f "$SKILL" ] || { echo "❌ missing $SKILL"; exit 1; }

read -r TOTAL HUMANS SYNCED MAXAGE < <(
  python3 -c "
import json
d = json.load(open('$SNAP'))
print(d['total_oracles'], d['unique_humans'], d['synced_at'], d.get('max_age_days', 120))
"
)

fail=0

# 1. Staleness — a snapshot nobody refreshes is how we got here in the first place.
AGE=$(python3 -c "
from datetime import date
y, m, d = map(int, '$SYNCED'.split('-'))
print((date.today() - date(y, m, d)).days)
")
if [ "$AGE" -gt "$MAXAGE" ]; then
  echo "❌ registry snapshot is ${AGE} days old (max ${MAXAGE}). Re-sync and update $SNAP."
  fail=1
else
  echo "✓ snapshot ${AGE} days old (max ${MAXAGE})"
fi

# 2. Any 3-4 digit count in SKILL.md that reads like a population claim must be
#    a number the snapshot knows about. This catches the exact failure mode we
#    hit: someone bumps one mention and leaves five others behind.
STRAY=$(grep -oE '\b[0-9]{3,4}\b (Oracles|humans)|Oracles \(([0-9]{3,4})\+?\)|Total Oracles\*\*: [0-9]{3,4}|of [0-9]{3,4} +\|' "$SKILL" \
  | grep -oE '[0-9]{3,4}' \
  | sort -u \
  | grep -vE "^($TOTAL|$HUMANS)$" || true)

if [ -n "$STRAY" ]; then
  echo "❌ SKILL.md quotes population numbers the snapshot does not back: $(echo "$STRAY" | tr '\n' ' ')"
  echo "   snapshot says total_oracles=$TOTAL unique_humans=$HUMANS (synced $SYNCED)"
  echo "   Fix the prose, or re-sync and update $SNAP if the registry really grew."
  fail=1
else
  echo "✓ population figures in SKILL.md match the snapshot (total=$TOTAL humans=$HUMANS)"
fi

exit $fail
