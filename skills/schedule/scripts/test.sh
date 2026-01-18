#!/bin/bash
# Test schedule queries
# Usage: ./test.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
QUERY="$SCRIPT_DIR/query.sh"
PASSED=0
FAILED=0

test_case() {
  local name="$1"
  local cmd="$2"
  local expect="$3"
  
  result=$($cmd 2>&1)
  if echo "$result" | grep -q "$expect"; then
    echo "✅ $name"
    ((PASSED++))
  else
    echo "❌ $name"
    echo "   Expected: $expect"
    echo "   Got: ${result:0:100}..."
    ((FAILED++))
  fi
}

echo "=== Schedule Skill Tests ==="
echo ""

# Test 1: Today should return Jan 13 rows
test_case "today returns current date rows" \
  "$QUERY today" \
  "Jan 13"

# Test 2: Tomorrow should return Jan 14 rows  
test_case "tomorrow returns next day rows" \
  "$QUERY tomorrow" \
  "Jan 14"

# Test 3: January returns table with dates
test_case "january returns schedule table" \
  "$QUERY january" \
  "Date"

# Test 4: Keyword search (bitkub)
test_case "keyword search finds bitkub" \
  "$QUERY bitkub" \
  "Bitkub"

# Test 5: Keyword search (block mountain)
test_case "keyword search finds block" \
  "$QUERY block" \
  "Block Mountain"

# Test 6: Upcoming returns schedule data
test_case "upcoming shows schedule" \
  "$QUERY upcoming" \
  "Date"

echo ""
echo "=== Results: $PASSED passed, $FAILED failed ==="
exit $FAILED
