module.exports = function notFound(req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `No route matches ${req.method} ${req.originalUrl}.`,
      hint: 'GET /api/weather/forecast?lat=26.85&lon=80.95 · GET /api/geo?q=Lucknow · GET /api'
    },
    meta: { timestamp: new Date().toISOString(), method: req.method, path: req.originalUrl }
  });
};
