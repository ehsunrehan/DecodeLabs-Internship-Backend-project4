const ApiError = require('../errors/api-error');

function coords(req) {
  const { lat, lon } = req.query;

  if (lat === undefined || lon === undefined) {
    throw ApiError.badRequest('Coordinates are required.', [
      { field: 'lat, lon', problem: 'Example: ?lat=26.8467&lon=80.9517' }
    ]);
  }

  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw ApiError.badRequest(`"${lat}" is not a valid latitude.`, [
      { field: 'lat', problem: 'Must be a number between -90 and 90.' }
    ]);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw ApiError.badRequest(`"${lon}" is not a valid longitude.`, [
      { field: 'lon', problem: 'Must be a number between -180 and 180.' }
    ]);
  }

  return { lat: Number(latitude.toFixed(4)), lon: Number(longitude.toFixed(4)) };
}

function days(req, fallback = 7) {
  const raw = req.query.days === undefined ? fallback : Number(req.query.days);
  if (!Number.isInteger(raw) || raw < 1 || raw > 16) {
    throw ApiError.badRequest('days must be an integer between 1 and 16.', [
      { field: 'days', problem: `"${req.query.days}" is out of range.` }
    ]);
  }
  return raw;
}

function placeQuery(req) {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    throw ApiError.badRequest('Provide a place name to search for.', [
      { field: 'q', problem: 'At least 2 characters — example: ?q=Lucknow' }
    ]);
  }
  if (q.length > 60) {
    throw ApiError.badRequest('That place name is too long.', [
      { field: 'q', problem: 'Maximum 60 characters.' }
    ]);
  }
  return q;
}

module.exports = { coords, days, placeQuery };
