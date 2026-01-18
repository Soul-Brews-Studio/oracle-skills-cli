#!/bin/bash
# Fast location query with local caching
# Usage: ./location-query.sh [current|time|history|visit <place>|all]

MODE=${1:-all}
PLACE=${2:-}
CACHE_DIR="/tmp/nat-location-cache"
CACHE_TTL=120  # 2 minutes cache

mkdir -p "$CACHE_DIR"

# Check cache freshness
cache_fresh() {
  local file="$1"
  if [[ ! -f "$file" ]]; then return 1; fi
  local age=$(($(date +%s) - $(stat -f %m "$file" 2>/dev/null || stat -c %Y "$file" 2>/dev/null)))
  [[ $age -lt $CACHE_TTL ]]
}

# Fetch with cache (private repo - needs gh auth)
fetch_current() {
  if ! cache_fresh "$CACHE_DIR/current.csv"; then
    gh api repos/laris-co/nat-location-data/contents/current.csv --jq '.content' | base64 -d > "$CACHE_DIR/current.csv"
  fi
  cat "$CACHE_DIR/current.csv"
}

fetch_history() {
  if ! cache_fresh "$CACHE_DIR/history.csv"; then
    # Large file - get download_url with auth token, then curl it
    local url=$(gh api repos/laris-co/nat-location-data/contents/history.csv --jq '.download_url')
    curl -sL "$url" > "$CACHE_DIR/history.csv"
  fi
}

# Known places (lat, lon, radius_km)
declare -A PLACES=(
  ["louis-office"]="13.74,100.62,0.5"
  ["trendy-tara"]="13.658,100.748,0.5"
  ["mega-bangna"]="13.649,100.682,0.5"
  ["cnx"]="18.7669,98.9625,2"
  ["bkk"]="13.6900,100.7501,2"
  ["dmk"]="13.9126,100.6067,2"
  ["bitkub"]="13.7563,100.5018,0.5"
  ["maya"]="18.8024,98.9676,0.5"
  ["home-cnx"]="18.797,99.073,0.3"
)

# CSV has headers: device,model,battery,charging,lat,lon,accuracy,source,place,place_type,locality,address,updated

# Current location
if [[ "$MODE" == "current" || "$MODE" == "all" ]]; then
  fetch_current
fi

# Time at location
# History columns: 00=device,04=lat,05=lon,08=place,09=place_type,10=locality,11=address,12=updated
if [[ "$MODE" == "time" || "$MODE" == "all" ]]; then
  echo "---TIME_AT_LOCATION---"
  fetch_history
  duckdb -c "
SELECT
  MIN(column12) as first_seen,
  MAX(column12) as last_seen,
  COUNT(*) as records,
  ROUND(EXTRACT(EPOCH FROM (MAX(column12) - MIN(column12)))/3600, 1) as hours_here
FROM read_csv('$CACHE_DIR/history.csv', auto_detect=true)
WHERE column00 LIKE '%iPhone%'"
fi

# Visit duration at a place
if [[ "$MODE" == "visit" && -n "$PLACE" ]]; then
  fetch_history

  # Get place coordinates
  if [[ -n "${PLACES[$PLACE]}" ]]; then
    IFS=',' read -r LAT LON RADIUS <<< "${PLACES[$PLACE]}"
  else
    echo "Unknown place: $PLACE"
    echo "Known places: ${!PLACES[*]}"
    exit 1
  fi

  # Calculate bounding box (rough: 0.01 deg ≈ 1km, so radius in km * 0.01)
  # Using 0.02 as base factor for wider match
  LAT_MIN=$(echo "$LAT - $RADIUS * 0.02" | bc)
  LAT_MAX=$(echo "$LAT + $RADIUS * 0.02" | bc)
  LON_MIN=$(echo "$LON - $RADIUS * 0.02" | bc)
  LON_MAX=$(echo "$LON + $RADIUS * 0.02" | bc)

  echo "---VISIT_${PLACE^^}---"
  duckdb -c "
SELECT
  MIN(column12) as arrived,
  MAX(column12) as left_at,
  COUNT(*) as pings,
  ROUND(EXTRACT(EPOCH FROM (MAX(column12) - MIN(column12)))/3600, 1) as hours_there
FROM read_csv('$CACHE_DIR/history.csv', auto_detect=true)
WHERE column00 LIKE '%iPhone%'
  AND column04 BETWEEN $LAT_MIN AND $LAT_MAX
  AND column05 BETWEEN $LON_MIN AND $LON_MAX"
fi

# Full history with transitions
# History columns: 00=device,04=lat,05=lon,08=place,09=place_type,10=locality,11=address,12=updated
if [[ "$MODE" == "history" ]]; then
  fetch_history
  echo "---TRANSITIONS---"
  duckdb -c "
WITH locations AS (
  SELECT
    column12 as updated,
    column10 as locality,
    column11 as address,
    LAG(column10) OVER (ORDER BY column12) as prev_locality
  FROM read_csv('$CACHE_DIR/history.csv', auto_detect=true)
  WHERE column00 LIKE '%iPhone%'
  ORDER BY column12
)
SELECT updated, locality, SUBSTRING(address, 1, 50) as address
FROM locations
WHERE locality != prev_locality OR prev_locality IS NULL
ORDER BY updated DESC
LIMIT 20"
fi
