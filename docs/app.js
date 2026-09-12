import {
  END_YEAR,
  FEEDS,
  LANGUAGES,
  START_YEAR,
  bridgeDays,
  feedEvents,
  feedFile,
  holidaysForYear,
  isoWeek,
} from './holidays.js';

const pageUrl = new URL('.', window.location.href);
const isHosted = pageUrl.protocol === 'http:' || pageUrl.protocol === 'https:';
let lang = 'en';

const allFeedsEl = document.querySelector('#feeds-all');
const yearFeedsEl = document.querySelector('#feeds-year');
const yearEl = document.querySelector('#year');
const captionEl = document.querySelector('#preview-caption');
const tbodyEl = document.querySelector('#preview-table tbody');

/** The https:// address of a feed, and the webcal:// form calendar apps expect. */
function feedUrl(file) {
  return new URL(file, pageUrl).href;
}

function webcalUrl(file) {
  return feedUrl(file).replace(/^https?:/, 'webcal:');
}

function element(tag, className, text, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

/**
 * One calendar card: what it holds, and the three ways to take it.
 * `year` is undefined for the all-years feeds.
 */
function feedCard(feed, year) {
  const file = feedFile(feed, year);
  const count = feedEvents(feed, year ?? START_YEAR, year ?? END_YEAR).length;
  const card = element('article', 'feed');

  const heading = element('h3', null, year ? `${feed.title} ${year}` : feed.title);

  const blurb = element('p', null, feed.blurb);
  const range = year ? `in ${year}` : `${START_YEAR}–${END_YEAR}`;
  blurb.append(element('span', 'count', ` ${count} dates ${range}.`));

  const actions = element('div', 'actions');
  const subscribe = element('a', 'btn primary', 'Subscribe', { href: webcalUrl(file) });
  const copy = element('button', 'btn', 'Copy link', { type: 'button' });
  const download = element('a', 'btn', 'Download .ics', { href: file, download: file.split('/').pop() });

  if (!isHosted) {
    subscribe.setAttribute('aria-disabled', 'true');
    copy.setAttribute('aria-disabled', 'true');
  }

  copy.addEventListener('click', async () => {
    const url = feedUrl(file);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this address into your calendar app:', url);
      return;
    }
    copy.textContent = 'Copied';
    setTimeout(() => { copy.textContent = 'Copy link'; }, 1600);
  });

  actions.append(subscribe, copy, download);
  card.append(heading, blurb, actions, element('code', 'feed-url', isHosted ? feedUrl(file) : file));
  return card;
}

function render() {
  const year = Number(yearEl.value);
  const feeds = FEEDS.filter((feed) => feed.lang === lang);

  allFeedsEl.replaceChildren(...feeds.map((feed) => feedCard(feed)));
  yearFeedsEl.replaceChildren(...feeds.map((feed) => feedCard(feed, year)));

  const { locale } = LANGUAGES[lang] ?? LANGUAGES.en;
  const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });

  const holidays = holidaysForYear(year, lang);
  const bridges = bridgeDays(year, year, lang);
  captionEl.textContent =
    `${holidays.length} holidays and ${bridges.length} bridge days in ${year}`;

  const rows = [...holidays, ...bridges].sort((a, b) => a.date - b.date);
  tbodyEl.replaceChildren(...rows.map((entry) => {
    const tr = element('tr', entry.kind === 'bridge' ? 'is-bridge' : null);
    const name = element('td', null, entry.name);
    if (entry.kind === 'bridge') name.append(element('span', 'tag', 'bridge'));
    tr.append(
      element('td', null, dateFormat.format(entry.date)),
      element('td', null, dayFormat.format(entry.date)),
      element('td', null, `CW ${String(isoWeek(entry.date)).padStart(2, '0')}`),
      name,
    );
    return tr;
  }));
}

function init() {
  document.querySelector('#local-notice').hidden = isHosted;
  for (const el of document.querySelectorAll('[data-year-range]')) {
    el.textContent = `${START_YEAR}–${END_YEAR}`;
  }

  const thisYear = new Date().getFullYear();
  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    const option = element('option', null, String(year), { value: String(year) });
    if (year === Math.min(Math.max(thisYear, START_YEAR), END_YEAR)) option.selected = true;
    yearEl.append(option);
  }

  yearEl.addEventListener('change', render);

  for (const btn of document.querySelectorAll('.segmented button')) {
    btn.addEventListener('click', () => {
      lang = btn.dataset.lang;
      for (const other of document.querySelectorAll('.segmented button')) {
        other.setAttribute('aria-checked', String(other === btn));
      }
      render();
    });
  }

  render();
}

init();
