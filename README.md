# NRW Holiday Calendars

Subscribable calendar feeds for the public holidays of **North Rhine-Westphalia**
(Nordrhein-Westfalen), Germany. Subscribe once on your iPhone and every holiday
shows up in the Calendar app, year after year, with no further work.

A static page plus four `.ics` files. No server, no build dependencies, no tracking.

## The calendars

| Feed | Contents |
| --- | --- |
| `nrw-holidays-en.ics` | The 11 statutory holidays, English names |
| `nrw-holidays-de.ics` | The 11 statutory holidays, German names |
| `nrw-bridge-days-en.ics` | Bridge days (optional), English |
| `nrw-bridge-days-de.ics` | Bridge days (optional), German |

Each covers **2020&ndash;2060**. Holidays are all-day events marked `TRANSP:TRANSPARENT`,
so a subscribed calendar never makes you look busy.

*Bridge days* (Brückentage) are the single working day between a holiday and the
weekend: a Tuesday holiday makes the Monday before it a bridge day, a Thursday
holiday the Friday after it. One day of leave, four days off.

## Subscribe on iPhone

Once the page is published (see below), open it in Safari on your iPhone and tap
**Subscribe**. To do it by hand instead, copy the feed address and go to
**Settings › Apps › Calendar › Calendar Accounts › Add Account › Other ›
Add Subscribed Calendar**.

On macOS: **Calendar › File › New Calendar Subscription**. In Google Calendar:
**Other calendars › From URL**.

The feed asks to be refreshed weekly (`REFRESH-INTERVAL:P7D`), and event `UID`s are
stable, so re-subscribing updates events instead of duplicating them.

## Publishing

The whole site is the `docs/` folder, generated `.ics` files included, so any static
host works. With GitHub Pages, either:

- **From the branch** &mdash; Settings › Pages › Source: *Deploy from a branch*, and pick
  your branch with the `/docs` folder. Nothing else to set up.
- **From Actions** &mdash; Settings › Pages › Source: *GitHub Actions*. The workflow in
  `.github/workflows/pages.yml` runs the tests, rebuilds the feeds and deploys.

The site needs a real web address: `webcal://` subscription links cannot point at a
local file. Opening `docs/index.html` straight from disk shows a notice saying so.

## Local development

```sh
npm test     # verify the dates and the iCalendar output
npm run build # regenerate docs/*.ics
npm start     # build, then serve docs/ on http://localhost:8080
```

Node 18+ (no dependencies).

## How the dates are produced

`docs/holidays.js` is the single source of truth, shared unchanged by the page and
the build script. Rather than keeping a hand-copied table of dates, it derives them:

- Six fixed holidays &mdash; New Year, Labour Day, German Unity Day, All Saints' Day and
  the two Christmas days.
- Five movable ones as offsets from Easter Sunday (computed with the anonymous
  Gregorian algorithm): Good Friday `-2`, Easter Monday `+1`, Ascension `+39`,
  Whit Monday `+50`, Corpus Christi `+60`.

`npm test` checks all 44 dates, weekdays and calendar weeks for 2025&ndash;2028 against the
list published on
[holidays-info.com](https://www.holidays-info.com/germany/holidays/north-rhine-westphalia/),
then checks that the generated feeds parse as well-formed iCalendar.

One deliberate difference from that source: its own `BD` (bridge day) markers are
incomplete &mdash; 2027 and 2028 carry them, while the identical Thursday holidays of 2026
do not. The bridge-day feed applies the rule consistently, so it covers every `BD` the
source marks plus the ones it misses (for example Friday 2 January 2026, after New
Year's Day falls on a Thursday).

## Layout

```
docs/            the published site
  holidays.js    holiday rules + iCalendar writer (browser and Node)
  index.html     the page
  app.js         subscription links and the preview table
  styles.css
  *.ics          generated feeds
scripts/build.mjs  writes docs/*.ics
scripts/test.mjs   checks dates against the source, validates the output
```
