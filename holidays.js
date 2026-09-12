/**
 * Public holidays for North Rhine-Westphalia (Nordrhein-Westfalen), Germany.
 *
 * Shared by the web page and the build script, so it stays dependency free and
 * runs unchanged in a browser and in Node. Every date is handled as UTC
 * midnight, so the host time zone can never shift a holiday onto another day.
 */

export const START_YEAR = 2020;
export const END_YEAR = 2060;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The eleven statutory holidays of North Rhine-Westphalia. Movable feasts are
 * expressed as a day offset from Easter Sunday.
 */
const HOLIDAYS = [
  { slug: 'new-year', month: 1, day: 1, en: 'New Year', de: 'Neujahr' },
  { slug: 'good-friday', easter: -2, en: 'Good Friday', de: 'Karfreitag' },
  { slug: 'easter-monday', easter: 1, en: 'Easter Monday', de: 'Ostermontag' },
  { slug: 'labour-day', month: 5, day: 1, en: 'Labour Day', de: 'Tag der Arbeit' },
  { slug: 'ascension-day', easter: 39, en: 'Ascension Day', de: 'Christi Himmelfahrt' },
  { slug: 'whit-monday', easter: 50, en: 'Whit Monday', de: 'Pfingstmontag' },
  { slug: 'corpus-christi', easter: 60, en: 'Corpus Christi', de: 'Fronleichnam' },
  { slug: 'german-unity-day', month: 10, day: 3, en: 'German Unity Day', de: 'Tag der Deutschen Einheit' },
  { slug: 'all-saints-day', month: 11, day: 1, en: "All Saints' Day", de: 'Allerheiligen' },
  { slug: 'christmas-day', month: 12, day: 25, en: 'Christmas Day', de: '1. Weihnachtstag' },
  { slug: 'boxing-day', month: 12, day: 26, en: 'Boxing Day', de: '2. Weihnachtstag' },
];

export const LANGUAGES = {
  en: {
    label: 'English',
    locale: 'en-GB',
    holidayDescription: 'Public holiday in North Rhine-Westphalia, Germany.',
    bridgeDescription: 'Suggested day off: it bridges a public holiday in North Rhine-Westphalia and the weekend.',
    bridgeBefore: (name) => `Bridge day (before ${name})`,
    bridgeAfter: (name) => `Bridge day (after ${name})`,
  },
  de: {
    label: 'Deutsch',
    locale: 'de-DE',
    holidayDescription: 'Gesetzlicher Feiertag in Nordrhein-Westfalen, Deutschland.',
    bridgeDescription: 'Brückentag: ein Urlaubstag verbindet hier einen Feiertag in Nordrhein-Westfalen mit dem Wochenende.',
    bridgeBefore: (name) => `Brückentag (vor ${name})`,
    bridgeAfter: (name) => `Brückentag (nach ${name})`,
  },
};

function utcDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

/** `YYYY-MM-DD` for a UTC date. */
export function toIso(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Easter Sunday for a Gregorian year, via the anonymous Gregorian algorithm.
 */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

/** ISO-8601 calendar week ("CW 01" on holidays-info.com). */
export function isoWeek(date) {
  const target = new Date(date.getTime());
  // Thursday of the current ISO week decides which year the week belongs to.
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = Date.UTC(target.getUTCFullYear(), 0, 1);
  return Math.ceil(((target.getTime() - yearStart) / DAY_MS + 1) / 7);
}

/** The statutory holidays of a single year, in date order. */
export function holidaysForYear(year, lang = 'en') {
  const easter = easterSunday(year);
  return HOLIDAYS.map((h) => {
    const date = 'easter' in h ? addDays(easter, h.easter) : utcDate(year, h.month, h.day);
    return {
      date,
      iso: toIso(date),
      slug: h.slug,
      name: h[lang] ?? h.en,
      kind: 'holiday',
    };
  }).sort((a, b) => a.date - b.date);
}

/** The statutory holidays of an inclusive year range, in date order. */
export function holidays(startYear = START_YEAR, endYear = END_YEAR, lang = 'en') {
  const all = [];
  for (let year = startYear; year <= endYear; year += 1) {
    all.push(...holidaysForYear(year, lang));
  }
  return all.sort((a, b) => a.date - b.date);
}

/**
 * Bridge days ("Brückentage"): the single working day between a holiday and
 * the weekend. A Tuesday holiday makes the Monday before it a bridge day, a
 * Thursday holiday the Friday after it.
 */
export function bridgeDays(startYear = START_YEAR, endYear = END_YEAR, lang = 'en') {
  const L = LANGUAGES[lang] ?? LANGUAGES.en;
  // Look one year either side so bridge days across a New Year are not missed.
  const neighbours = holidays(startYear - 1, endYear + 1, lang);
  const holidayDates = new Set(neighbours.map((h) => h.iso));
  const seen = new Set();
  const out = [];

  for (const holiday of neighbours) {
    const weekday = holiday.date.getUTCDay();
    let offset = 0;
    if (weekday === 2) offset = -1; // Tuesday holiday, bridge the Monday.
    else if (weekday === 4) offset = 1; // Thursday holiday, bridge the Friday.
    else continue;

    const date = addDays(holiday.date, offset);
    const iso = toIso(date);
    const year = date.getUTCFullYear();
    if (year < startYear || year > endYear) continue;
    if (holidayDates.has(iso) || seen.has(iso)) continue;
    seen.add(iso);

    out.push({
      date,
      iso,
      slug: `bridge-${holiday.slug}`,
      name: offset < 0 ? L.bridgeBefore(holiday.name) : L.bridgeAfter(holiday.name),
      kind: 'bridge',
    });
  }

  return out.sort((a, b) => a.date - b.date);
}

function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * RFC 5545 content lines are limited to 75 octets and continue with a leading
 * space, so fold on encoded length rather than on character count.
 */
function foldLine(line) {
  const encoder = new TextEncoder();
  const parts = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function stamp(date) {
  return `${date.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`;
}

/**
 * Render events as an iCalendar feed. Holidays are all-day events, marked free
 * so they never make the subscriber look busy.
 */
export function buildIcs(events, { name, description, dtstamp = new Date() } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//nrw-cali//NRW Holiday Calendars//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `NAME:${escapeText(name)}`,
    `X-WR-CALNAME:${escapeText(name)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `X-WR-CALDESC:${escapeText(description)}`,
    'X-WR-TIMEZONE:Europe/Berlin',
    'REFRESH-INTERVAL;VALUE=DURATION:P7D',
    'X-PUBLISHED-TTL:P7D',
  ];

  const now = stamp(dtstamp);
  for (const event of events) {
    const start = event.iso.replace(/-/g, '');
    const end = toIso(addDays(event.date, 1)).replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.iso}-${event.slug}@nrw-cali`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeText(event.name)}`,
      `DESCRIPTION:${escapeText(event.description ?? '')}`,
      `CATEGORIES:${event.kind === 'bridge' ? 'Bridge Day' : 'Public Holiday'}`,
      'CLASS:PUBLIC',
      'TRANSP:TRANSPARENT',
      'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
      'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/**
 * The calendars the build script writes. Each is published twice: once with
 * every year in one file, and once per year for people who would rather keep a
 * single year and delete it afterwards.
 */
export const FEEDS = [
  {
    slug: 'nrw-holidays',
    lang: 'en',
    kind: 'holiday',
    title: 'Public holidays',
    calName: 'Public Holidays North Rhine-Westphalia',
    calDesc: 'The 11 statutory public holidays of North Rhine-Westphalia, Germany.',
    blurb: 'All 11 statutory holidays, from New Year to Boxing Day.',
  },
  {
    slug: 'nrw-holidays',
    lang: 'de',
    kind: 'holiday',
    title: 'Feiertage',
    calName: 'Feiertage Nordrhein-Westfalen',
    calDesc: 'Die 11 gesetzlichen Feiertage in Nordrhein-Westfalen, Deutschland.',
    blurb: 'Alle 11 gesetzlichen Feiertage, von Neujahr bis 2. Weihnachtstag.',
  },
  {
    slug: 'nrw-bridge-days',
    lang: 'en',
    kind: 'bridge',
    title: 'Bridge days',
    calName: 'Bridge Days North Rhine-Westphalia',
    calDesc: 'Single working days between a North Rhine-Westphalia holiday and the weekend.',
    blurb: 'Take one day off, get a four-day weekend. Optional extra.',
  },
  {
    slug: 'nrw-bridge-days',
    lang: 'de',
    kind: 'bridge',
    title: 'Brückentage',
    calName: 'Brückentage Nordrhein-Westfalen',
    calDesc: 'Einzelne Arbeitstage zwischen einem NRW-Feiertag und dem Wochenende.',
    blurb: 'Ein Urlaubstag, vier Tage frei. Optionale Ergänzung.',
  },
];

/** Path of a feed inside the published site. Omit `year` for the all-years file. */
export function feedFile(feed, year) {
  return year
    ? `years/${feed.slug}-${year}-${feed.lang}.ics`
    : `${feed.slug}-${feed.lang}.ics`;
}

/** Calendar name as it will appear in the subscriber's calendar app. */
export function feedName(feed, year) {
  return year ? `${feed.calName} ${year}` : feed.calName;
}

/** Events of one feed, ready for `buildIcs`. */
export function feedEvents(feed, startYear = START_YEAR, endYear = END_YEAR) {
  const L = LANGUAGES[feed.lang] ?? LANGUAGES.en;
  const events = feed.kind === 'bridge'
    ? bridgeDays(startYear, endYear, feed.lang)
    : holidays(startYear, endYear, feed.lang);
  const description = feed.kind === 'bridge' ? L.bridgeDescription : L.holidayDescription;
  return events.map((event) => ({ ...event, description }));
}
