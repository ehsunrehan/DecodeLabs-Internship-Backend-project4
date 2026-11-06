/**
 * /api/geo — forward geocoding through the provider, reformatted.
 *
 *   GET /api/geo?q=Lucknow&count=6
 */

const express = require('express');
const { fetchGeocode } = require('../lib/upstream');
const { shapePlaces } = require('../lib/shape');
const { placeQuery } = require('../validation/query');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const query = placeQuery(req);

    const rawCount = req.query.count === undefined ? 6 : Number(req.query.count);
    const count = Number.isInteger(rawCount) && rawCount >= 1 && rawCount <= 10 ? rawCount : 6;

    const { data, ms, fromCache, ageSeconds } = await fetchGeocode(query, count);
    const doc = shapePlaces(data, { query, upstreamMs: ms, cached: fromCache, cacheAgeSeconds: ageSeconds });

    res.json({
      ok: true,
      data: doc,
      ...(doc.count === 0 ? { warning: `No place called “${query}” was found.` } : {})
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
