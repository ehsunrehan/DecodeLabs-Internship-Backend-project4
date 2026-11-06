/**
 * REFORMATTING — the third requirement of Project 4.
 *
 * The provider's payload is verbose, unit-tied and full of codes.
 * Everything above this line is ours; everything below it came from
 * the internet. Users of this API only ever see our own contract.
 */

const { condition } = require('./condition');

function round(value, digits = 1) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function isDayNow(current) {
  return current && Number(current.is_day) === 1;
}

function shapeCurrent(raw) {
  const current = raw.current || {};
  const day = isDayNow(current);

  return {
    observedAt: current.time || null,
    temperature: { value: round(current.temperature_2m), unit: '°C' },
    feelsLike: { value: round(current.apparent_temperature), unit: '°C' },
    humidity: { value: round(current.relative_humidity_2m, 0), unit: '%' },
    precipitation: { value: round(current.precipitation, 2), unit: 'mm' },
    wind: {
      speed: { value: round(current.wind_speed_10m), unit: 'km/h' },
      gust: { value: round(current.wind_gusts_10m), unit: 'km/h' }
    },
    isDay: day,
    condition: condition(current.weather_code, day)
  };
}

function shapeHourly(raw, howMany = 12) {
  const hourly = raw.hourly;
  if (!hourly || !Array.isArray(hourly.time)) return [];

  const now = raw.current && raw.current.time ? raw.current.time : hourly.time[0];
  let start = hourly.time.findIndex((stamp) => stamp >= now);
  if (start === -1) start = 0;

  return hourly.time.slice(start, start + howMany).map((stamp, index) => {
    const i = start + index;
    const hour = Number(String(stamp).slice(11, 13));
    return {
      at: stamp,
      hourLabel: `${String(hour).padStart(2, '0')}:00`,
      temperature: { value: round(hourly.temperature_2m?.[i]), unit: '°C' },
      precipitationProbability: hourly.precipitation_probability?.[i] ?? null,
      wind: { value: round(hourly.wind_speed_10m?.[i]), unit: 'km/h' },
      condition: condition(hourly.weather_code?.[i], hour >= 7 && hour <= 19)
    };
  });
}

function shapeDaily(raw) {
  const daily = raw.daily;
  if (!daily || !Array.isArray(daily.time)) return [];

  return daily.time.map((date, i) => ({
    date,
    weekday: new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }),
    high: { value: round(daily.temperature_2m_max?.[i]), unit: '°C' },
    low: { value: round(daily.temperature_2m_min?.[i]), unit: '°C' },
    precipitation: { value: round(daily.precipitation_sum?.[i], 2), unit: 'mm' },
    precipitationProbability: daily.precipitation_probability_max?.[i] ?? null,
    uvIndexMax: daily.uv_index_max?.[i] ?? null,
    sunrise: daily.sunrise?.[i] || null,
    sunset: daily.sunset?.[i] || null,
    condition: condition(daily.weather_code?.[i], true)
  }));
}

/**
 * Our public weather document.
 */
function shapeWeather(raw, context = {}) {
  return {
    location: {
      latitude: raw.latitude,
      longitude: raw.longitude,
      elevationM: raw.elevation ?? null,
      timezone: raw.timezone,
      timezoneAbbreviation: raw.timezone_abbreviation ?? null,
      name: context.name || null,
      country: context.country || null,
      region: context.region || null
    },
    current: shapeCurrent(raw),
    hourly: shapeHourly(raw),
    daily: shapeDaily(raw),
    meta: {
      source: 'open-meteo',
      units: 'metric (°C, km/h, mm)',
      fetchedAt: new Date().toISOString(),
      upstreamMs: context.upstreamMs ?? null,
      cached: Boolean(context.cached),
      cacheAgeSeconds: context.cacheAgeSeconds ?? 0
    }
  };
}

/**
 * Our public geocoding document — six tidy fields per suggestion.
 */
function shapePlaces(raw, context = {}) {
  const results = (raw.results || []).map((place, index) => ({
    rank: index + 1,
    name: place.name,
    admin1: place.admin1 || null,
    country: place.country || null,
    countryCode: place.country_code || null,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
    elevationM: place.elevation ?? null,
    population: place.population ?? null,
    timezoneAbbreviation: place.timezone_abbreviation ?? null
  }));

  return {
    query: context.query || null,
    count: results.length,
    places: results,
    meta: {
      source: 'open-meteo-geocoding',
      fetchedAt: new Date().toISOString(),
      upstreamMs: context.upstreamMs ?? null,
      cached: Boolean(context.cached),
      cacheAgeSeconds: context.cacheAgeSeconds ?? 0
    }
  };
}

module.exports = { shapeWeather, shapePlaces, shapeCurrent, shapeHourly, shapeDaily };
