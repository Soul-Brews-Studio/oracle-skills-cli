#!/usr/bin/env bun
// calendar.ts - Show month calendar with annotations
import { $ } from "bun";
import { existsSync } from "fs";

const ROOT = process.env.ROOT;
const scheduleFile = ROOT ? `${ROOT}/ψ/inbox/schedule.md` : "ψ/inbox/schedule.md";

const now = new Date();
const todayNum = now.getDate();
const monthName = now.toLocaleDateString("en-US", { month: "short" });
const monthNum = now.getMonth() + 1;
const year = now.getFullYear();

// Parse schedule
type DayInfo = { type: string; event?: string };
const days: Record<number, DayInfo> = {};

if (existsSync(scheduleFile)) {
  const content = await Bun.file(scheduleFile).text();
  for (const line of content.split("\n")) {
    if (!line.includes(monthName)) continue;
    
    const dayMatch = line.match(new RegExp(`${monthName}\\s+(\\d+)`));
    if (!dayMatch) continue;
    const day = parseInt(dayMatch[1]);
    
    if (line.includes("free")) days[day] = { type: "free" };
    else if (line.includes("Done")) days[day] = { type: "done" };
    else if (line.includes("✈️")) {
      const dest = line.match(/→([A-Z]+)/)?.[1];
      days[day] = { type: "flight", event: dest };
    }
    else if (/talk/i.test(line)) days[day] = { type: "talk" };
    else if (/block|mountain/i.test(line)) days[day] = { type: "blockmtn" };
    else if (/bitkub/i.test(line)) days[day] = { type: "bitkub" };
    else if (/workshop|mids/i.test(line)) days[day] = { type: "workshop" };
    else days[day] = { type: "busy" };
  }
}

// Get calendar
const cal = await $`cal ${monthNum} ${year}`.text();

for (const line of cal.split("\n")) {
  if (!/\d/.test(line)) {
    console.log(line);
    continue;
  }
  
  let marked = line;
  const annotations: string[] = [];
  
  const dayNums = line.match(/\d+/g)?.map(Number) || [];
  
  for (const day of dayNums) {
    const info = days[day];
    
    if (day === todayNum) {
      marked = marked.replace(new RegExp(`(^|\\s)${day}(\\s|$)`), `$1[${day}]$2`);
    } else if (info?.type === "free") {
      marked = marked.replace(new RegExp(`\\s${day}(\\s|$)`), `°${day}$1`);
    } else if (info && info.type !== "done") {
      marked = marked.replace(new RegExp(`\\s${day}(\\s|$)`), `·${day}$1`);
    }
    
    if (info) {
      switch (info.type) {
        case "flight": annotations.push(`${day}✈️${info.event || ""}`); break;
        case "talk": annotations.push(`${day}:TALK`); break;
        case "blockmtn": annotations.push(`${day}:BlockMtn`); break;
        case "bitkub": annotations.push(`${day}:Bitkub`); break;
        case "workshop": annotations.push(`${day}:Workshop`); break;
      }
    }
  }
  
  const suffix = dayNums.includes(todayNum) ? "  <--" : 
                 annotations.length ? "   " : 
                 /[·°]/.test(marked) ? "" : "    free";
  
  console.log(marked + suffix + annotations.join(" "));
}
