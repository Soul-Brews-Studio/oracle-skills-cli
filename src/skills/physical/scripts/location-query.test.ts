import { expect, test, describe } from "bun:test";

// Since location-query.ts is a script that runs on load, it's hard to test directly without refactoring.
// We should refactor it to export functions.

// Mock data
const CSV_DATA = `device,model,battery,charging,lat,lon,accuracy,source,place,place_type,locality,address,updated
"Nat iPhone12mini","iPhone 12 mini",75,Charging,13.6,100.7,8,unknown,,,Bang Phli,"Address 1",2026-01-18 23:59:25
"iPad",iPad,100,NotCharging,13.6,100.7,35,Wifi,,,Bang Phli,"Address 2",2026-01-18 23:58:13`;

// We'll reimplement the parser logic here to test it, as the script isn't modular yet.
// TODO: Refactor location-query.ts to export parseCSVLine

const parseCSVLine = (line: string) => {
  const res = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      // Don't add quote char to content
    } else if (char === ',' && !inQuotes) {
      res.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  res.push(current);
  return res;
};

describe("Physical Skill Logic", () => {
  test("parseCSVLine handles quotes correctly", () => {
    const line = '"Nat iPhone12mini","iPhone 12 mini",75';
    const parsed = parseCSVLine(line);
    expect(parsed[0]).toBe("Nat iPhone12mini"); // Quotes stripped
    expect(parsed[1]).toBe("iPhone 12 mini");
    expect(parsed[2]).toBe("75");
  });

  test("parseCSVLine handles empty fields", () => {
    const line = 'device,,battery';
    const parsed = parseCSVLine(line);
    expect(parsed[0]).toBe("device");
    expect(parsed[1]).toBe("");
    expect(parsed[2]).toBe("battery");
  });
});
