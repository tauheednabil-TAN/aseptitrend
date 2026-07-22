// Generates the bundled synthetic dataset committed at src/data/seed.json.
// Run with: npm run seed

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateReadings } from "../src/lib/generateData";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src", "data", "seed.json");

const readings = generateReadings();
writeFileSync(out, JSON.stringify(readings, null, 2) + "\n", "utf8");

console.log(`Wrote ${readings.length} readings to ${out}`);
