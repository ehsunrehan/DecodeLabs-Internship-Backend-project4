/**
 * /api/weather — fetch asynchronously, reformat, serve.
 *
 *   GET /current   now + next 6 hours
 *   GET /forecast  now + 12 hours + N days   (1–16)
 *   GET /summary   a one-paragraph digest, reformatted for humans
 */

const express = require('express');
const { fetchWeather } = require('../lib/upstream');
const { shapeWeather } = require('../lib/shape');
const { coords, days } = require('../validation/query');
const ApiError = require('../errors/api-error');

const router = express.Router();

async function load(req, wantedDays) {
  const { lat, lon } = coords(req);
  const context = {
    name: typeof req.query.name === 'string' ? req.query.name.slice(0, 60) : null,
    country: typeof req.query.country === 'string' ? req.query.country.slice(0, 60) : null,
    region: typeof req.query.region === 'string' ? req.query.region.slice(0, 60) : null
  };

  const { data, ms, fromCache, ageSeconds } = await fetchWeather({ lat, lon, days: wantedDays });
  return shapeWeather(data, {
    ...context,
    upstreamMs: ms,
    cached: fromCache,
    cacheAgeSeconds: ageSeconds
  });
}

/* current ------------------------------------------------------------ */
router.get('/current', async (req, res, next) => {
  try {
    const doc = await load(req, 2);
    res.json({
      ok: true,
      data: {
        location: doc.location,
        current: doc.current,
        hourly: doc.hourly.slice(0, 6),
        meta: doc.meta
      }
    });
  } catch (error) {
    next(error);
  }
});

/* forecast ----------------------------------------------------------- */
router.get('/forecast', async (req, res, next) => {
  try {
    const wanted = days(req, 7);
    const doc = await load(req, wanted);
    res.json({ ok: true, data: doc });
  } catch (error) {
    next(error);
  }
});

/* summary — our own wording, our own shape ---------------------------- */
router.get('/summary', async (req, res, next) => {
  try {
    const doc = await load(req, 4);
    const now = doc.current;
    const today = doc.daily[0] || null;
    const wet = ['rain', 'drizzle', 'storm'].includes(now.condition.group);

    const headline = `${now.condition.label} in ${doc.location.name || 'your coordinates'}, ${Math.round(
      now.temperature.value
    )}°C (feels like ${Math.round(now.feelsLike.value)}°C).`;

    const advice = wet
      ? 'Carry an umbrella — measurable rain is expected.'
      : now.condition.group === 'snow'
        ? 'Snow is expected: dress for sub-zero surfaces.'
        : now.condition.group === 'storm'
          ? 'Thunderstorms overhead — postpone anything outdoors.'
          : now.temperature.value >= 32
            ? 'Hot and dry: hydrate and avoid the midday sun.'
            : now.temperature.value <= 8
              ? 'Cold out there — a warm layer will help.'
              : 'Comfortable conditions; no gear needed.';

    res.json({
      ok: true,
      data: {
        headline,
        advice,
        place: doc.location.name || `${doc.location.latitude}, ${doc.location.longitude}`,
        country: doc.location.country,
        highToday: today ? today.high : null,
        lowToday: today ? today.low : null,
        rainChanceToday: today ? today.precipitationProbability : null,
        nextHours: doc.hourly.slice(0, 4).map((hour) => ({
          hour: hour.hourLabel,
          temperature: hour.temperature,
          condition: hour.condition.label,
          rainChance: hour.precipitationProbability
        })),
        meta: doc.meta
      }
    });
  } catch (error) {
    next(error);
  }
});

/* an obviously wrong coordinate should never reach the provider ------ */
router.use((req, _res, next) => {
  next(ApiError.badRequest('Unknown weather route.'));
});

module.exports = router;
