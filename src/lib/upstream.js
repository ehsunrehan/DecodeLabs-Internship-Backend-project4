/**
 * The upstream client — the only file in this project that knows the
 * third party's URL, header format or response quirks.
 *
 *  · asynchronous (fetch + AbortController, never blocking)
 *  · bounded by a timeout
 *  · one automatic retry on a transient failure
 *  · cached so the upstream is not hammered by refreshes
 */

const config = require('../config');
const cache = require('./cache');

class UpstreamError extends Error {
  constructor(status, code, message, hint) {
    super(message);
    this.status = status;
    this.code = code;
    this.hint = hint;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET a JSON document from the provider.
 * @returns {{ data: object, ms: number, fromCache: boolean, url: string }}
 */
async function getJson(url, cacheKey, ttlMs) {
  if (cacheKey) {
    const hit = cache.get(cacheKey);
    if (hit) return { data: hit.value, ms: 0, fromCache: true, url, ageSeconds: hit.ageSeconds };
  }

  const attempts = Math.max(1, config.retries + 1);
  let lastFailure = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        headers: config.headers(),
        signal: controller.signal
      });

      clearTimeout(timer);
      const elapsed = Date.now() - startedAt;
      cache.noteUpstream(elapsed);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        lastFailure = new UpstreamError(
          502,
          'UPSTREAM_HTTP_ERROR',
          `The provider answered ${response.status}.`,
          body.slice(0, 160) || 'No response body returned.'
        );
        // 4xx will not improve on retry
        if (response.status < 500) break;
        continue;
      }

      const data = await response.json();
      if (cacheKey) cache.set(cacheKey, data, ttlMs);

      return { data, ms: elapsed, fromCache: false, url, ageSeconds: 0 };
    } catch (error) {
      clearTimeout(timer);
      const timedOut = error.name === 'AbortError' || error.name === 'TimeoutError';
      lastFailure = timedOut
        ? new UpstreamError(
            504,
            'UPSTREAM_TIMEOUT',
            `The provider did not answer within ${config.timeoutMs} ms.`,
            'It may be busy — the cached copy (if any) is still available.'
          )
        : new UpstreamError(
            502,
            'UPSTREAM_UNREACHABLE',
            'Could not reach the third-party server.',
            String(error.message || error)
          );
      if (attempt < attempts) await sleep(350);
    }
  }

  throw lastFailure || new UpstreamError(502, 'UPSTREAM_FAILED', 'Upstream request failed.');
}

/* ------------------------------------------------------------------ */
/*  Endpoint 1 — current conditions + hourly + daily                   */
/* ------------------------------------------------------------------ */
function buildForecastUrl({ lat, lon, days }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    hourly: 'temperature_2m,weather_code,precipitation_probability,wind_speed_10m',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max',
    timezone: 'auto',
    forecast_days: String(days)
  });
  return `${config.forecastBase}?${params.toString()}`;
}

async function fetchWeather({ lat, lon, days = 7 }) {
  const url = buildForecastUrl({ lat, lon, days });
  const cacheKey = cache.keyFor(['forecast', lat, lon, days]);
  return getJson(url, cacheKey, config.cacheTtlSeconds * 1000);
}

/* ------------------------------------------------------------------ */
/*  Endpoint 2 — forward geocoding (also third-party)                  */
/* ------------------------------------------------------------------ */
async function fetchGeocode(query, count = 6) {
  const params = new URLSearchParams({
    name: String(query),
    count: String(count),
    language: 'en',
    format: 'json'
  });
  const url = `${config.geocodeBase}?${params.toString()}`;
  const cacheKey = cache.keyFor(['geocode', query, count]);
  return getJson(url, cacheKey, config.cacheTtlSeconds * 1000);
}

module.exports = { fetchWeather, fetchGeocode, UpstreamError, buildForecastUrl };
