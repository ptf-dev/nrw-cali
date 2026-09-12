# NRW Holiday Calendars - Subscribe

Subscribable calendar feeds for the public holidays of **North Rhine-Westphalia**
(Nordrhein-Westfalen), Germany. Subscribe once on your iPhone and every holiday
shows up in the Calendar app, year after year, with no further work.

A static page plus four `.ics` files. No server, no build dependencies, no tracking.

## The calendars

Each calendar is published twice: once with every year in a single file, and once
per year for people who would rather keep one year and delete it when it is over.

| Calendar | Every year | One year |
| --- | --- | --- |
| Holidays, English | `nrw-holidays-en.ics` | `years/nrw-holidays-2026-en.ics` |
| Holidays, German | `nrw-holidays-de.ics` | `years/nrw-holidays-2026-de.ics` |
| Bridge days, English | `nrw-bridge-days-en.ics` | `years/nrw-bridge-days-2026-en.ics` |
| Bridge days, German | `nrw-bridge-days-de.ics` | `years/nrw-bridge-days-2026-de.ics` |

The all-years files cover **2020&ndash;2060**; a yearly file exists for every year in that
range. Holidays are all-day events marked `TRANSP:TRANSPARENT`, so a subscribed
calendar never makes you look busy.

Event `UID`s are the same in both forms, so subscribing to a year and later to the
whole range updates the shared dates instead of duplicating them.

*Bridge days* (Brückentage) are the single working day between a holiday and the
weekend: a Tuesday holiday makes the Monday before it a bridge day, a Thursday
holiday the Friday after it. One day of leave, four days off.

## Subscribe on iPhone

Once the page is published (see below), open it in Safari on your iPhone and tap
**Subscribe** &mdash; under *Every year in one calendar* for the full range, or pick a year
under *One year at a time*. To do it by hand instead, copy the feed address and go to
**Settings › Apps › Calendar › Calendar Accounts › Add Account › Other ›
Add Subscribed Calendar**.

On macOS: **Calendar › File › New Calendar Subscription**. In Google Calendar:
**Other calendars › From URL**.

The feed asks to be refreshed weekly (`REFRESH-INTERVAL:P7D`), and event `UID`s are
stable, so re-subscribing updates events instead of duplicating them.

A yearly calendar does not roll over on its own &mdash; that is the point of it. Subscribe to
the all-years feed if you want it to keep working without you.

## Publishing

The site is the repository root, generated `.ics` files included, so any static host
works. On GitHub Pages: **Settings › Pages › Source: Deploy from a branch**, pick the
branch, leave the folder on **`/ (root)`**. Nothing else to configure.

The site deliberately lives at the root rather than in `docs/`. GitHub Pages builds the
branch itself, and a workflow that also deployed would race that build &mdash; whichever
finished last would decide whether the feeds sat at `/nrw-holidays-en.ics` or
`/docs/nrw-holidays-en.ics`. Since a subscription URL has to stay put, there is one
publisher, and `.github/workflows/ci.yml` only runs the tests.

`.nojekyll` turns off Jekyll so every file, `.ics` included, is served verbatim.

The site needs a real web address: `webcal://` subscription links cannot point at a
local file. Opening `index.html` straight from disk shows a notice saying so.

## Local development

```sh
npm test      # verify the dates and the iCalendar output
npm run build # regenerate the .ics files
npm start     # build, then serve the site on http://localhost:8080
```

Node 18+ (no dependencies).

## How the dates are produced

`holidays.js` is the single source of truth, shared unchanged by the page and
the build script. Rather than keeping a hand-copied table of dates, it derives them:

- Six fixed holidays &mdash; New Year, Labour Day, German Unity Day, All Saints' Day and
  the two Christmas days.
- Five movable ones as offsets from Easter Sunday (computed with the anonymous
  Gregorian algorithm): Good Friday `-2`, Easter Monday `+1`, Ascension `+39`,
  Whit Monday `+50`, Corpus Christi `+60`.

The build is deterministic: `DTSTAMP` comes from a `DATA_REVISION` constant in
`holidays.js` rather than the clock, so rebuilding produces byte-identical files. The
committed feeds therefore never churn, a subscriber's calendar app does not see every
event as modified on every deploy, and CI can check the committed `.ics` files against a
fresh build. Bump `DATA_REVISION` when the holiday rules change.

`npm test` checks all 44 dates, weekdays and calendar weeks for 2025&ndash;2028 against the
list published on
[holidays-info.com](https://www.holidays-info.com/germany/holidays/north-rhine-westphalia/),
then checks that the generated feeds parse as well-formed iCalendar and that the
yearly files partition the all-years files exactly &mdash; every date in one file and only
one, with matching `UID`s.

One deliberate difference from that source: its own `BD` (bridge day) markers are
incomplete &mdash; 2027 and 2028 carry them, while the identical Thursday holidays of 2026
do not. The bridge-day feed applies the rule consistently, so it covers every `BD` the
source marks plus the ones it misses (for example Friday 2 January 2026, after New
Year's Day falls on a Thursday).

## Layout

```
index.html       the page
app.js           subscription links and the preview table
styles.css
holidays.js      holiday rules + iCalendar writer (browser and Node)
*.ics            generated all-years feeds
years/*.ics      generated single-year feeds
scripts/build.mjs  writes the .ics files
scripts/test.mjs   checks dates against the source, validates the output
```
