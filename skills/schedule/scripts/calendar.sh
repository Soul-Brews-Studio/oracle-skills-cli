#!/bin/bash
# calendar.sh - Show full month calendar with annotations
# Uses DuckDB for efficient querying

TODAY=$(date +%d | sed 's/^0//')
MONTH=$(date +%b)
MONTH_NUM=$(date +%m)
YEAR=$(date +%Y)
SCHEDULE="ψ/inbox/schedule.md"
TMPCSV="/tmp/schedule_$$.csv"

# Parse schedule.md to CSV once
echo "day,type,event" > "$TMPCSV"
if [[ -f "$SCHEDULE" ]]; then
    grep -E "\| *${MONTH} *[0-9]+" "$SCHEDULE" | while read -r line; do
        day=$(echo "$line" | sed -E "s/.*\| *${MONTH} *([0-9]+).*/\1/")
        if echo "$line" | grep -q "free"; then
            echo "${day},free,"
        elif echo "$line" | grep -q "Done"; then
            echo "${day},done,"
        elif echo "$line" | grep -q "✈️"; then
            dest=$(echo "$line" | grep -oE "→[A-Z]+" | head -1 | tr -d '→')
            echo "${day},flight,${dest}"
        elif echo "$line" | grep -qi "talk"; then
            echo "${day},talk,"
        elif echo "$line" | grep -qi "block\|mountain"; then
            echo "${day},blockmtn,"
        elif echo "$line" | grep -qi "bitkub"; then
            echo "${day},bitkub,"
        elif echo "$line" | grep -qi "workshop\|mids"; then
            echo "${day},workshop,"
        else
            echo "${day},busy,"
        fi
    done >> "$TMPCSV"
fi

# Query with DuckDB for each week's data
get_week_info() {
    local days="$1"
    duckdb -csv -noheader <<SQL 2>/dev/null
SELECT day, type, event FROM read_csv_auto('$TMPCSV')
WHERE day IN ($days)
ORDER BY day
SQL
}

# Build calendar
cal $MONTH_NUM $YEAR | while IFS= read -r line; do
    # Skip non-day lines
    if ! echo "$line" | grep -qE '[0-9]'; then
        echo "$line"
        continue
    fi

    # Get days in this line
    days=$(echo "$line" | grep -oE '[0-9]+' | tr '\n' ',' | sed 's/,$//')

    # Query events for these days
    week_data=$(get_week_info "$days")

    marked="$line"
    annotation=""

    # Process each day
    for day in $(echo "$line" | grep -oE '[0-9]+'); do
        day_info=$(echo "$week_data" | grep "^${day}," | head -1)
        dtype=$(echo "$day_info" | cut -d',' -f2)
        devent=$(echo "$day_info" | cut -d',' -f3)

        if [[ "$day" == "$TODAY" ]]; then
            marked=$(echo "$marked" | sed -E "s/(^| )${day}( |$)/\1[${day}]\2/")
            # Also add today's event to annotation
            case "$dtype" in
                flight) annotation="$annotation ${day}✈️${devent}" ;;
                talk) annotation="$annotation ${day}:TALK" ;;
                blockmtn) annotation="$annotation ${day}:BlockMtn" ;;
                bitkub) annotation="$annotation ${day}:Bitkub" ;;
                workshop) annotation="$annotation ${day}:Workshop" ;;
            esac
        elif [[ "$dtype" == "free" ]]; then
            marked=$(echo "$marked" | sed -E "s/ ${day}( |·|$)/°${day}\1/g")
        elif [[ -n "$dtype" && "$dtype" != "done" ]]; then
            marked=$(echo "$marked" | sed -E "s/ ${day}( |°|$)/·${day}\1/g")
            # Build annotation
            case "$dtype" in
                flight) annotation="$annotation ${day}✈️${devent}" ;;
                talk) annotation="$annotation ${day}:TALK" ;;
                blockmtn) annotation="$annotation ${day}:BlockMtn" ;;
                bitkub) annotation="$annotation ${day}:Bitkub" ;;
                workshop) annotation="$annotation ${day}:Workshop" ;;
            esac
        elif [[ "$dtype" == "done" ]]; then
            marked=$(echo "$marked" | sed -E "s/ ${day}( |°|$)/·${day}\1/g")
        fi
    done

    # Output
    if echo "$line" | grep -qwE "\b${TODAY}\b"; then
        echo "${marked}  <--${annotation}"
    elif [[ -n "$annotation" ]]; then
        echo "${marked}   ${annotation}"
    elif echo "$marked" | grep -qE '·|°'; then
        echo "$marked"
    elif echo "$line" | grep -qE '^[ 0-9]+$'; then
        echo "${marked}    free"
    else
        echo "$marked"
    fi
done

# Cleanup
rm -f "$TMPCSV"
