#!/usr/bin/env bun
// Query schedule.md with DuckDB markdown extension
// Usage: bun query.ts [filter]

import { $ } from "bun";

const filter = process.argv[2];
if (!filter || filter === "--help" || filter === "-h") {
  console.log("Usage: SCHEDULE_FILE=path bun query.ts <filter>");
  console.log("Filters: today, tomorrow, upcoming, january, <keyword>");
  process.exit(filter ? 0 : 1);
}

const scheduleFile = process.env.SCHEDULE_FILE || "ψ/inbox/schedule.md";

const today = new Date();
const todayMonth = today.toLocaleString('en', { month: 'short' });
const todayDay = today.getDate();
const tomorrow = todayDay + 1;

async function runQuery(sql: string): Promise<string> {
  return await $`duckdb -markdown -c ${sql}`.text();
}

let result: string;

switch (filter) {
  case "today":
    result = await runQuery(`
      LOAD markdown;
      SELECT regexp_extract_all(content, '\\|[^\\n]*${todayMonth} ${todayDay}[^\\n]*\\|') as today
      FROM read_markdown_sections('${scheduleFile}')
      WHERE title = 'January 2026';
    `);
    break;

  case "tomorrow":
    result = await runQuery(`
      LOAD markdown;
      SELECT regexp_extract_all(content, '\\|[^\\n]*${todayMonth} ${tomorrow}[^\\n]*\\|') as tomorrow
      FROM read_markdown_sections('${scheduleFile}')
      WHERE title = 'January 2026';
    `);
    break;

  case "january":
  case "jan":
  case "upcoming":
    result = await runQuery(`
      LOAD markdown;
      SELECT content
      FROM read_markdown_sections('${scheduleFile}')
      WHERE title = 'January 2026';
    `);
    break;

  default:
    // Keyword search - case insensitive
    const pattern = `(?i)\\|[^\\n]*${filter}[^\\n]*\\|`;
    result = await runQuery(`
      LOAD markdown;
      SELECT regexp_extract_all(content, '${pattern}') as matches
      FROM read_markdown_sections('${scheduleFile}')
      WHERE LOWER(content) LIKE LOWER('%${filter}%');
    `);
}

console.log(result);
