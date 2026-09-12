/**
 * Writes one .ics file per feed into docs/, ready to be served as a static
 * site and subscribed to from a calendar app.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { END_YEAR, FEEDS, START_YEAR, buildIcs, feedEvents } from '../docs/holidays.js';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const dtstamp = new Date();

await mkdir(outDir, { recursive: true });

for (const feed of FEEDS) {
  const events = feedEvents(feed, START_YEAR, END_YEAR);
  const ics = buildIcs(events, { name: feed.calName, description: feed.calDesc, dtstamp });
  await writeFile(join(outDir, feed.file), ics, 'utf8');
  console.log(`${feed.file.padEnd(24)} ${String(events.length).padStart(4)} events  ${START_YEAR}-${END_YEAR}`);
}
