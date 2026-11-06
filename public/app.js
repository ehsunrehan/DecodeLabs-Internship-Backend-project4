/* =============================================================
   DecodeLabs · Project 04 — Third-Party API Integration
   Weather desk: geocode → forecast → our own shape → this page.
   ============================================================= */

const state = {
  unit: 'C',
  place: { name: 'Lucknow', region: 'Uttar Pradesh', country: 'India', lat: 26.8467, lon: 80.9517 },
  doc: null
};

const $ = (s) => document.querySelector(s);

/* ── helpers ───────────────────────────────────────────── */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('is-visible'), 2800);
}

function debounce(fn, wait = 320) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const convert = (celsius) => (celsius === null || celsius === undefined ? null : state.unit === 'C' ? celsius : celsius * 9 / 5 + 32);
const temp = (celsius) => (convert(celsius) === null ? '--' : Math.round(convert(celsius)));

async function api(path) {
  const response = await fetch(path);
  const raw = await response.text();
  let body = null;
  try {
    body = JSON.parse(raw);
  } catch (_) {
    body = { ok: false, error: { code: 'BAD_RESPONSE', message: raw.slice(0, 200) } };
  }
  return { status: response.status, body };
}

/* ── icons (hand-drawn, inline) ────────────────────────── */

const ICONS = {
  clear: '<circle cx="12" cy="12" r="4.4"/><path d="M12 2.4v2.6M12 19v2.6M2.4 12h2.6M19 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9" stroke-linecap="round"/>',
  'clear-night': '<path d="M19.5 14.6A7.9 7.9 0 0 1 9.4 4.5a8.2 8.2 0 1 0 10.1 10.1z" stroke-linejoin="round"/><path d="M16.5 4.2v2.4M15.3 5.4h2.4" stroke-linecap="round"/>',
  partly: '<circle cx="8.5" cy="8" r="3.2"/><path d="M8.5 2.6v1.6M3.4 8H5M4.9 4.4l1.1 1.1M12.1 4.4l-1.1 1.1" stroke-linecap="round"/><path d="M10 19.5a3.6 3.6 0 0 1 .4-7.2 5 5 0 0 1 9.3 1.3 3 3 0 0 1-.6 5.9z" stroke-linejoin="round"/>',
  cloudy: '<path d="M7.5 19a4.2 4.2 0 0 1 .5-8.4 5.6 5.6 0 0 1 10.6 1.5A3.4 3.4 0 0 1 17.8 19z" stroke-linejoin="round"/>',
  fog: '<path d="M7.5 15.5a3.8 3.8 0 0 1 .5-7.6 5.2 5.2 0 0 1 9.8 1.4 3.1 3.1 0 0 1-.5 6.2z" stroke-linejoin="round"/><path d="M5 18.5h14M7 21.3h10" stroke-linecap="round"/>',
  drizzle: '<path d="M7.5 15.5a3.8 3.8 0 0 1 .5-7.6 5.2 5.2 0 0 1 9.8 1.4 3.1 3.1 0 0 1-.5 6.2z" stroke-linejoin="round"/><path d="M9 18.2v1.6M12.4 18.8v1.6M15.8 18.2v1.6" stroke-linecap="round"/>',
  rain: '<path d="M7.5 14.8a3.8 3.8 0 0 1 .5-7.6 5.2 5.2 0 0 1 9.8 1.4 3.1 3.1 0 0 1-.5 6.2z" stroke-linejoin="round"/><path d="M9.2 17.4l-1.1 3.4M13 17.4l-1.1 3.4M16.8 17.4l-1.1 3.4" stroke-linecap="round"/>',
  snow: '<path d="M7.5 14.8a3.8 3.8 0 0 1 .5-7.6 5.2 5.2 0 0 1 9.8 1.4 3.1 3.1 0 0 1-.5 6.2z" stroke-linejoin="round"/><path d="M9.4 18.4v2.6M8.2 19.1l2.4 1.2M10.6 19.1l-2.4 1.2M15.6 18.4v2.6M14.4 19.1l2.4 1.2M16.8 19.1l-2.4 1.2" stroke-linecap="round"/>',
  storm: '<path d="M7.5 14.4a3.8 3.8 0 0 1 .5-7.6 5.2 5.2 0 0 1 9.8 1.4 3.1 3.1 0 0 1-.5 6.2z" stroke-linejoin="round"/><path d="M13.2 16.4l-3 3.4h3l-1.4 3" stroke-linecap="round" stroke-linejoin="round"/>'
};

function icon(key, size = 34) {
  const paths = ICONS[key] || ICONS.cloudy;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${paths}</svg>`;
}

/* ── error bar ─────────────────────────────────────────── */

function showError(message, hint) {
  $('#errorTitle').textContent = message;
  $('#errorText').textContent = hint || '';
  $('#errorBar').hidden = false;
}

function clearError() {
  $('#errorBar').hidden = true;
}

/* ── renderers ─────────────────────────────────────────── */

function renderNow() {
  const doc = state.doc;
  if (!doc) return;

  const placeLabel = [state.place.name, state.place.region, state.place.country].filter(Boolean).join(' · ');
  $('#placeName').textContent = state.place.name || `${doc.location.latitude}, ${doc.location.longitude}`;
  $('#placeRegion').textContent = placeLabel.replace(`${state.place.name} · `, '') || `${doc.location.timezone}`;

  $('#nowTemp').textContent = temp(doc.current.temperature.value);
  $('#nowUnit').textContent = `°${state.unit}`;
  $('#nowIcon').innerHTML = icon(doc.current.condition.icon, 46);
  $('#nowLabel').textContent = doc.current.condition.label;
  $('#nowFeels').textContent = `feels like ${temp(doc.current.feelsLike.value)}°${state.unit} · ${doc.location.timezone}`;
  $('#stamp').textContent = `observed ${doc.current.observedAt} local · fetched ${doc.meta.fetchedAt.slice(11, 19)} UTC${
    doc.meta.cached ? ' · served from cache' : ''
  }`;

  const today = doc.daily[0];
  $('#mHumid').textContent = doc.current.humidity.value;
  $('#mWind').textContent = temp0(doc.current.wind.speed.value);
  $('#mGust').textContent = temp0(doc.current.wind.gust.value);
  $('#mPrecip').textContent = doc.current.precipitation.value;
  $('#mSunrise').textContent = today && today.sunrise ? today.sunrise.slice(11, 16) : '--';
  $('#mSunset').textContent = today && today.sunset ? today.sunset.slice(11, 16) : '--';
}

function temp0(value) {
  return value === null || value === undefined ? '--' : Math.round(value);
}

function renderHours() {
  const doc = state.doc;
  if (!doc) return;

  $('#hourlyMeta').textContent = `${doc.hourly.length} points · hourly`;

  $('#hours').innerHTML = doc.hourly
    .map(
      (hour) => `
      <div class="hour">
        <div class="hour__time">${hour.hourLabel}</div>
        <div class="hour__icon">${icon(hour.condition.icon, 30)}</div>
        <div class="hour__temp num">${temp(hour.temperature.value)}°</div>
        <div class="hour__rain ${hour.precipitationProbability > 40 ? 'is-wet' : ''}">${
          hour.precipitationProbability === null ? '—' : `${hour.precipitationProbability}% rain`
        }</div>
        <div class="hour__label">${escapeHtml(hour.condition.group)}</div>
      </div>`
    )
    .join('');
}

function renderDays() {
  const doc = state.doc;
  if (!doc) return;

  $('#dailyMeta').textContent = `${doc.daily.length} days · daily`;

  const highs = doc.daily.map((day) => convert(day.high.value)).filter((v) => v !== null);
  const lows = doc.daily.map((day) => convert(day.low.value)).filter((v) => v !== null);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const span = Math.max(1, max - min);

  $('#days').innerHTML = doc.daily
    .map((day, index) => {
      const high = convert(day.high.value);
      const low = convert(day.low.value);
      const left = ((low - min) / span) * 100;
      const width = Math.max(6, ((high - low) / span) * 100);

      return `
      <div class="day${index === 0 ? ' is-today' : ''}">
        <div class="day__date">${index === 0 ? 'Today' : day.weekday}<span>${day.date.slice(5)}</span></div>
        <div class="day__icon">${icon(day.condition.icon, 30)}</div>
        <div class="day__cond">${escapeHtml(day.condition.label)}<span>${escapeHtml(day.condition.group)}</span></div>
        <div class="day__range">
          <span class="day__low num">${temp(day.low.value)}°</span>
          <span class="day__bar"><i style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></i></span>
          <span class="day__high num">${temp(day.high.value)}°</span>
        </div>
        <div class="day__rain ${day.precipitationProbability > 40 ? 'is-wet' : ''}">${
          day.precipitationProbability === null ? '—' : `${day.precipitationProbability}% · ${day.precipitation.value}mm`
        }</div>
      </div>`;
    })
    .join('');
}

function renderInspector() {
  const doc = state.doc;
  if (!doc) return;

  $('#iLatency').textContent = doc.meta.cached ? 'served from cache' : `${doc.meta.upstreamMs} ms upstream`;
  $('#iCache').textContent = doc.meta.cached ? `hit · ${doc.meta.cacheAgeSeconds}s old` : `miss · TTL 600s`;
  $('#iShaped').textContent = doc.meta.fetchedAt.slice(11, 19) + ' UTC';
  $('#iKey').textContent = 'not required (open data) · held server-side';
  $('#iUrl').textContent =
    `https://api.open-meteo.com/v1/forecast?latitude=${doc.location.latitude}&longitude=${doc.location.longitude}&current=…&daily=…&timezone=auto`;
}

/* ── data flow ─────────────────────────────────────────── */

async function loadWeather(place, { announce = false } = {}) {
  clearError();
  state.place = { ...state.place, ...place };

  const params = new URLSearchParams({
    lat: state.place.lat,
    lon: state.place.lon,
    days: 7
  });
  if (state.place.name) params.set('name', state.place.name);
  if (state.place.country) params.set('country', state.place.country);
  if (state.place.region) params.set('region', state.place.region);

  const button = $('#btnRefresh');
  button.disabled = true;
  button.textContent = 'Fetching…';

  const { status, body } = await api(`/api/weather/forecast?${params.toString()}`);

  button.disabled = false;
  button.textContent = 'Re-fetch';

  if (body && body.ok) {
    state.doc = body.data;
    renderNow();
    renderHours();
    renderDays();
    renderInspector();
    if (announce) toast(`Loaded ${state.place.name || 'coordinates'} from Open-Meteo`);
    return;
  }

  showError(
    body?.error?.message || 'The weather bridge did not answer.',
    (body?.error?.hint ? `${body.error.hint} ` : '') + `HTTP ${status}`
  );
}

async function geocode(query) {
  const list = $('#suggest');
  const { body } = await api(`/api/geo?q=${encodeURIComponent(query)}&count=6`);

  if (!body || !body.ok) {
    list.innerHTML = '<li class="none">Geocoding service unavailable.</li>';
    list.hidden = false;
    return;
  }

  if (!body.data.places.length) {
    list.innerHTML = `<li class="none">Nothing found for “${escapeHtml(query)}”.</li>`;
    list.hidden = false;
    return;
  }

  list.innerHTML = body.data.places
    .map(
      (place) => `
      <li>
        <button type="button"
          data-lat="${place.latitude}" data-lon="${place.longitude}"
          data-name="${escapeHtml(place.name)}"
          data-region="${escapeHtml(place.admin1 || '')}"
          data-country="${escapeHtml(place.country || '')}">
          <span><b>${escapeHtml(place.name)}</b> <span class="sub">${escapeHtml(
            [place.admin1, place.country].filter(Boolean).join(', ')
          )}</span></span>
          <span class="coords">${place.latitude.toFixed(2)}, ${place.longitude.toFixed(2)}</span>
        </button>
      </li>`
    )
    .join('');

  list.hidden = false;
}

/* ── wiring ────────────────────────────────────────────── */

$('#suggest').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-lat]');
  if (!button) return;

  $('#suggest').hidden = true;
  $('#q').value = '';

  await loadWeather(
    {
      lat: Number(button.dataset.lat),
      lon: Number(button.dataset.lon),
      name: button.dataset.name,
      region: button.dataset.region,
      country: button.dataset.country
    },
    { announce: true }
  );
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.hero__search')) $('#suggest').hidden = true;
});

const onType = debounce(() => {
  const query = $('#q').value.trim();
  if (query.length < 2) {
    $('#suggest').hidden = true;
    return;
  }
  geocode(query);
}, 340);

$('#q').addEventListener('input', onType);

$('#q').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  onType();
});

$('#btnSearch').addEventListener('click', () => onType());

document.querySelectorAll('.quick .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    loadWeather(
      {
        lat: Number(chip.dataset.lat),
        lon: Number(chip.dataset.lon),
        name: chip.dataset.name,
        region: chip.dataset.region,
        country: chip.dataset.country
      },
      { announce: true }
    );
  });
});

$('#btnRefresh').addEventListener('click', () => loadWeather({}, { announce: true }));
$('#btnRetry').addEventListener('click', () => loadWeather({}));

$('#btnC').addEventListener('click', () => setUnit('C'));
$('#btnF').addEventListener('click', () => setUnit('F'));

function setUnit(unit) {
  state.unit = unit;
  $('#btnC').classList.toggle('is-on', unit === 'C');
  $('#btnF').classList.toggle('is-on', unit === 'F');
  if (state.doc) {
    renderNow();
    renderHours();
    renderDays();
  }
}

/* upstream link ------------------------------------------------ */
async function pingLink() {
  try {
    const { body } = await api('/api/health');
    const chip = $('#linkChip');
    if (body && body.ok) {
      chip.className = 'bar__link is-up';
      $('#linkText').textContent = 'upstream reachable';
      $('#linkMeta').textContent = `${body.data.upstreamLatencyMs} ms · ${body.data.cache.hits} cache hits`;
    } else {
      throw new Error('unhealthy');
    }
  } catch (_) {
    $('#linkChip').className = 'bar__link is-down';
    $('#linkText').textContent = 'upstream unreachable';
    $('#linkMeta').textContent = 'cached data still served';
  }
}

/* ── boot ───────────────────────────────────────────────── */

pingLink();
loadWeather(state.place);
setInterval(pingLink, 60000);
