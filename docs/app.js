import {
  END_YEAR,
  FEEDS,
  LANGUAGES,
  START_YEAR,
  bridgeDays,
  feedEvents,
  holidaysForYear,
  isoWeek,
} from './holidays.js';

const pageUrl = new URL('.', window.location.href);
const isHosted = pageUrl.protocol === 'http:' || pageUrl.protocol === 'https:';
let lang = 'en';

const feedsEl = document.querySelector('#feeds');
const yearEl = document.querySelector('#year');
const tbodyEl = document.querySelector('#preview-table tbody');

/** The https:// address of a feed, and the webcal:// form calendar apps expect. */
function feedUrl(file) {
  return new URL(file, pageUrl).href;
}

function webcalUrl(file) {
  return feedUrl(file).replace(/^https?:/, 'webcal:');
}

function button(tag, className, text, attrs = {}) {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function renderFeeds() {
  feedsEl.replaceChildren();

  for (const feed of FEEDS.filter((candidate) => candidate.lang === lang)) {
    const count = feedEvents(feed).length;
    const card = document.createElement('article');
    card.className = 'feed';

    const heading = document.createElement('h3');
    heading.textContent = feed.title;

    const blurb = document.createElement('p');
    blurb.textContent = feed.blurb;
    const count_ = document.createElement('span');
    count_.className = 'count';
    count_.textContent = ` ${count} dates, ${START_YEAR}–${END_YEAR}.`;
    blurb.append(count_);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const subscribe = button('a', 'btn primary', 'Subscribe', { href: webcalUrl(feed.file) });
    const copy = button('button', 'btn', 'Copy link', { type: 'button' });
    const download = button('a', 'btn', 'Download .ics', { href: feed.file, download: feed.file });

    if (!isHosted) {
      subscribe.setAttribute('aria-disabled', 'true');
      copy.setAttribute('aria-disabled', 'true');
    }

    copy.addEventListener('click', async () => {
      const url = feedUrl(feed.file);
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

    const url = document.createElement('code');
    url.className = 'feed-url';
    url.textContent = isHosted ? feedUrl(feed.file) : feed.file;

    card.append(heading, blurb, actions, url);
    feedsEl.append(card);
  }
}

function renderPreview() {
  const year = Number(yearEl.value);
  const { locale } = LANGUAGES[lang] ?? LANGUAGES.en;
  const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });

  const rows = [...holidaysForYear(year, lang), ...bridgeDays(year, year, lang)]
    .sort((a, b) => a.date - b.date);

  tbodyEl.replaceChildren();
  for (const entry of rows) {
    const tr = document.createElement('tr');
    if (entry.kind === 'bridge') tr.className = 'is-bridge';

    const date = document.createElement('td');
    date.textContent = dateFormat.format(entry.date);

    const day = document.createElement('td');
    day.textContent = dayFormat.format(entry.date);

    const week = document.createElement('td');
    week.textContent = `CW ${String(isoWeek(entry.date)).padStart(2, '0')}`;

    const name = document.createElement('td');
    name.textContent = entry.name;
    if (entry.kind === 'bridge') {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = 'bridge';
      name.append(tag);
    }

    tr.append(date, day, week, name);
    tbodyEl.append(tr);
  }
}

function init() {
  document.querySelector('#local-notice').hidden = isHosted;
  for (const el of document.querySelectorAll('[data-year-range]')) {
    el.textContent = `${START_YEAR}–${END_YEAR}`;
  }

  const thisYear = new Date().getFullYear();
  for (let year = Math.max(START_YEAR, thisYear - 1); year <= Math.min(END_YEAR, thisYear + 5); year += 1) {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = String(year);
    if (year === thisYear) option.selected = true;
    yearEl.append(option);
  }

  yearEl.addEventListener('change', renderPreview);

  for (const btn of document.querySelectorAll('.segmented button')) {
    btn.addEventListener('click', () => {
      lang = btn.dataset.lang;
      for (const other of document.querySelectorAll('.segmented button')) {
        other.setAttribute('aria-checked', String(other === btn));
      }
      renderFeeds();
      renderPreview();
    });
  }

  renderFeeds();
  renderPreview();
}

init();
