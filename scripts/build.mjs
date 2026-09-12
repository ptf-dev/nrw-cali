/**
 * Writes the .ics files into docs/: one file per calendar covering every year,
 * plus a single-year file per calendar under docs/years/.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DATA_REVISION,
  END_YEAR,
  FEEDS,
  START_YEAR,
  buildIcs,
  feedEvents,
  feedFile,
  feedName,
} from '../holidays.js';

// The site is published from the repository root so that GitHub Pages serves
// it identically whether it builds the branch itself or runs the CI workflow.
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..');

async function write(feed, year) {
  const events = feedEvents(feed, year ?? START_YEAR, year ?? END_YEAR);
  const ics = buildIcs(events, {
    name: feedName(feed, year),
    description: feed.calDesc,
    dtstamp: DATA_REVISION,
  });
  await writeFile(join(outDir, feedFile(feed, year)), ics, 'utf8');
  return events.length;
}

// Rebuild the per-year directory from scratch so a narrowed year range cannot
// leave stale files behind to be served forever.
await rm(join(outDir, 'years'), { recursive: true, force: true });
await mkdir(join(outDir, 'years'), { recursive: true });

for (const feed of FEEDS) {
  const total = await write(feed);
  let perYear = 0;
  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    perYear += await write(feed, year);
  }
  console.log(
    `${feedFile(feed).padEnd(24)} ${String(total).padStart(4)} events` +
    ` + ${END_YEAR - START_YEAR + 1} yearly files (${perYear} events)`,
  );
}
