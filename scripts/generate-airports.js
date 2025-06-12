process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

import fs from 'fs';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';

const CSV_URL = 'https://ourairports.com/data/airports.csv';
const OUTFILE = './data/airports.json';

const res = await fetch(CSV_URL);
if (!res.ok) {
  throw new Error(`Failed to fetch CSV: ${res.status}`);
}
const body = await res.text();
const records = parse(body, { columns: true, skip_empty_lines: true });

// Keep only large and medium airports
const hubs = records
  .filter(r => r.type === 'large_airport' || r.type === 'medium_airport')
  .filter(r => r.iata_code)
  .sort((a, b) => b.passengers - a.passengers)
  .map(r => ({ code: r.iata_code, name: r.name }))
  .slice(0, 500);

fs.writeFileSync(OUTFILE, JSON.stringify(hubs, null, 2));
console.log(`Wrote ${hubs.length} entries to ${OUTFILE}`);