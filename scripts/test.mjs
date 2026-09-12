/**
 * Checks the generated holidays against the published list on
 * holidays-info.com for 2025-2028, and sanity-checks the iCalendar output.
 */
import assert from 'node:assert/strict';

import {
  END_YEAR,
  FEEDS,
  START_YEAR,
  bridgeDays,
  buildIcs,
  feedEvents,
  feedFile,
  feedName,
  holidaysForYear,
  isoWeek,
} from '../holidays.js';

/** date, weekday, calendar week and name exactly as published by the source. */
const EXPECTED = `
2025-01-01 Wed CW01 New Year
2025-04-18 Fri CW16 Good Friday
2025-04-21 Mon CW17 Easter Monday
2025-05-01 Thu CW18 Labour Day
2025-05-29 Thu CW22 Ascension Day
2025-06-09 Mon CW24 Whit Monday
2025-06-19 Thu CW25 Corpus Christi
2025-10-03 Fri CW40 German Unity Day
2025-11-01 Sat CW44 All Saints' Day
2025-12-25 Thu CW52 Christmas Day
2025-12-26 Fri CW52 Boxing Day
2026-01-01 Thu CW01 New Year
2026-04-03 Fri CW14 Good Friday
2026-04-06 Mon CW15 Easter Monday
2026-05-01 Fri CW18 Labour Day
2026-05-14 Thu CW20 Ascension Day
2026-05-25 Mon CW22 Whit Monday
2026-06-04 Thu CW23 Corpus Christi
2026-10-03 Sat CW40 German Unity Day
2026-11-01 Sun CW44 All Saints' Day
2026-12-25 Fri CW52 Christmas Day
2026-12-26 Sat CW52 Boxing Day
2027-01-01 Fri CW53 New Year
2027-03-26 Fri CW12 Good Friday
2027-03-29 Mon CW13 Easter Monday
2027-05-01 Sat CW17 Labour Day
2027-05-06 Thu CW18 Ascension Day
2027-05-17 Mon CW20 Whit Monday
2027-05-27 Thu CW21 Corpus Christi
2027-10-03 Sun CW39 German Unity Day
2027-11-01 Mon CW44 All Saints' Day
2027-12-25 Sat CW51 Christmas Day
2027-12-26 Sun CW51 Boxing Day
2028-01-01 Sat CW52 New Year
2028-04-14 Fri CW15 Good Friday
2028-04-17 Mon CW16 Easter Monday
2028-05-01 Mon CW18 Labour Day
2028-05-25 Thu CW21 Ascension Day
2028-06-05 Mon CW23 Whit Monday
2028-06-15 Thu CW24 Corpus Christi
2028-10-03 Tue CW40 German Unity Day
2028-11-01 Wed CW44 All Saints' Day
2028-12-25 Mon CW52 Christmas Day
2028-12-26 Tue CW52 Boxing Day
`.trim().split('\n');

/**
 * Every bridge day of 2025-2028. The source's own "BD" markers are incomplete
 * (2027 and 2028 carry them, the identical Thursday holidays of 2026 do not),
 * so the rule is asserted instead: the working day between a holiday and the
 * weekend. The five rows the source does mark are checked separately below.
 */
const EXPECTED_BRIDGE_DAYS = [
  '2025-05-02', // after Labour Day (Thu 2025-05-01)
  '2025-05-30', // after Ascension Day (Thu 2025-05-29)
  '2025-06-20', // after Corpus Christi (Thu 2025-06-19)
  '2026-01-02', // after New Year (Thu 2026-01-01)
  '2026-05-15', // after Ascension Day (Thu 2026-05-14)
  '2026-06-05', // after Corpus Christi (Thu 2026-06-04)
  '2027-05-07', // after Ascension Day (Thu 2027-05-06)
  '2027-05-28', // after Corpus Christi (Thu 2027-05-27)
  '2028-05-26', // after Ascension Day (Thu 2028-05-25)
  '2028-06-16', // after Corpus Christi (Thu 2028-06-15)
  '2028-10-02', // before German Unity Day (Tue 2028-10-03)
];

/** The rows the source flags with "BD"; the generator must cover all of them. */
const SOURCE_BD_MARKERS = ['2027-05-07', '2027-05-28', '2028-05-26', '2028-06-16', '2028-10-02'];

const generated = [2025, 2026, 2027, 2028].flatMap((year) => holidaysForYear(year, 'en'));
assert.equal(generated.length, EXPECTED.length, 'holiday count');

generated.forEach((holiday, index) => {
  const weekday = holiday.date.toUTCString().slice(0, 3);
  const week = `CW${String(isoWeek(holiday.date)).padStart(2, '0')}`;
  assert.equal(`${holiday.iso} ${weekday} ${week} ${holiday.name}`, EXPECTED[index]);
});
console.log(`ok  ${generated.length} holidays for 2025-2028 match holidays-info.com`);

const bridges = bridgeDays(2025, 2028, 'en');
const bridgeIsos = bridges.map((day) => day.iso);
assert.deepEqual(bridgeIsos, EXPECTED_BRIDGE_DAYS);

const holidayIsos = new Set(generated.map((holiday) => holiday.iso));
for (const bridge of bridges) {
  const weekday = bridge.date.getUTCDay();
  assert.ok(weekday === 1 || weekday === 5, `${bridge.iso}: a bridge day is a Monday or a Friday`);
  assert.ok(!holidayIsos.has(bridge.iso), `${bridge.iso}: a bridge day is not itself a holiday`);
  const neighbour = new Date(bridge.date.getTime() + (weekday === 1 ? 1 : -1) * 86400000);
  assert.ok(holidayIsos.has(neighbour.toISOString().slice(0, 10)), `${bridge.iso}: adjacent to a holiday`);
}
console.log(`ok  ${bridges.length} bridge days for 2025-2028 follow the Tue/Thu rule`);

for (const marker of SOURCE_BD_MARKERS) {
  assert.ok(bridgeIsos.includes(marker), `missing bridge day flagged BD by the source: ${marker}`);
}
console.log(`ok  all ${SOURCE_BD_MARKERS.length} bridge days flagged BD by the source are covered`);

for (const feed of FEEDS) {
  const events = feedEvents(feed);
  const file = feedFile(feed);
  const ics = buildIcs(events, { name: feedName(feed), description: feed.calDesc });

  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'), `${file}: starts with VCALENDAR`);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'), `${file}: ends with VCALENDAR`);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, events.length, `${file}: event count`);
  assert.equal(new Set(ics.match(/^UID:.*$/gm)).size, events.length, `${file}: unique UIDs`);
  assert.ok(!/[^\r]\n/.test(ics), `${file}: every line ends with CRLF`);

  for (const line of ics.split('\r\n')) {
    assert.ok(new TextEncoder().encode(line).length <= 75, `${file}: line over 75 octets: ${line}`);
  }
  console.log(`ok  ${file} is well-formed (${events.length} events)`);
}

// The per-year files must partition the all-years file exactly: every event in
// one and only one year, with the same UID, so subscribing to a single year and
// later to the whole range cannot drop or duplicate a date.
for (const feed of FEEDS) {
  const all = feedEvents(feed);
  const perYear = [];

  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    const events = feedEvents(feed, year, year);
    const file = feedFile(feed, year);
    assert.notEqual(file, feedFile(feed), `${file}: yearly path differs from the all-years path`);

    for (const event of events) {
      assert.equal(event.date.getUTCFullYear(), year, `${file}: ${event.iso} is outside ${year}`);
    }

    const ics = buildIcs(events, { name: feedName(feed, year), description: feed.calDesc });
    assert.ok(ics.includes(`X-WR-CALNAME:${feedName(feed, year)}`), `${file}: calendar name carries the year`);
    perYear.push(...events);
  }

  assert.deepEqual(
    perYear.map((event) => event.iso),
    all.map((event) => event.iso),
    `${feedFile(feed)}: yearly files partition the all-years file`,
  );
  console.log(`ok  ${feedFile(feed)} splits into ${END_YEAR - START_YEAR + 1} yearly files with no gaps or overlaps`);
}
