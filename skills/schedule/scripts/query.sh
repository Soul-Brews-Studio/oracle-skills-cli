#!/bin/bash
# Query schedule.md with DuckDB markdown extension
# Usage: ./query.sh [filter]

SCHEDULE_FILE="${SCHEDULE_FILE:-ψ/inbox/schedule.md}"
FILTER="${1:-upcoming}"
TODAY_MONTH=$(date '+%b')
TODAY_DAY=$(date '+%d' | sed 's/^0//')

case "$FILTER" in
  today)
    duckdb -markdown -c "
    LOAD markdown;
    SELECT regexp_extract_all(content, '\|[^\n]*$TODAY_MONTH $TODAY_DAY[^\n]*\|') as today
    FROM read_markdown_sections('$SCHEDULE_FILE')
    WHERE title = 'January 2026';
    "
    ;;
  tomorrow)
    TOMORROW=$((TODAY_DAY + 1))
    duckdb -markdown -c "
    LOAD markdown;
    SELECT regexp_extract_all(content, '\|[^\n]*$TODAY_MONTH $TOMORROW[^\n]*\|') as tomorrow
    FROM read_markdown_sections('$SCHEDULE_FILE')
    WHERE title = 'January 2026';
    "
    ;;
  january|jan|upcoming)
    duckdb -markdown -c "
    LOAD markdown;
    SELECT content
    FROM read_markdown_sections('$SCHEDULE_FILE')
    WHERE title = 'January 2026';
    "
    ;;
  *)
    # Keyword search - case insensitive via (?i)
    PATTERN="(?i)\|[^\n]*${FILTER}[^\n]*\|"
    duckdb -markdown -c "
    LOAD markdown;
    SELECT regexp_extract_all(content, '$PATTERN') as matches
    FROM read_markdown_sections('$SCHEDULE_FILE')
    WHERE LOWER(content) LIKE LOWER('%$FILTER%');
    "
    ;;
esac
