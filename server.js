/**
 * DecodeLabs — Industrial Training Kit / Batch 2026
 * Project 4: Third-Party API Integration  (optional milestone)
 * ---------------------------------------------------------------
 * Goal : Fetch and process data from an external server and serve
 *       it to your own users.
 *       · store external credentials safely
 *       · fetch asynchronously (no blocking)
 *       · reformat the upstream payload into our own contract
 *
 * Upstream: Open-Meteo (open data, no key required). The optional
 * key in .env demonstrates how a paid provider's credential would be
 * held server-side and never exposed to the browser.
 */

require('./src/load-env');

const path = require('path');
const express = require('express');

const requestLog = require('./src/middleware/request-log');
const metaRoutes = require('./src/routes/meta.routes');
const geoRoutes = require('./src/routes/geo.routes');
const weatherRoutes = require('./src/routes/weather.routes');

const app = express();
const PORT = Number(process.env.PORT) || 5104;

app.use(express.json({ limit: '32kb' }));
app.use(requestLog);
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.use('/api', metaRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/weather', weatherRoutes);

app.use(require('./src/middleware/not-found'));
app.use(require('./src/middleware/error-handler'));

app.listen(PORT, () => {
  console.log('');
  console.log('  DecodeLabs · Project 4 · Third-Party API Integration');
  console.log(`  Server     : http://localhost:${PORT}`);
  console.log(`  Upstream   : ${process.env.UPSTREAM_FORECAST || 'https://api.open-meteo.com/v1/forecast'}`);
  console.log(`  Cache TTL  : ${(Number(process.env.CACHE_TTL_SECONDS) || 600)}s`);
  console.log(`  API key    : ${process.env.UPSTREAM_API_KEY ? 'configured (masked)' : 'not required by this provider'}`);
  console.log('');
});

module.exports = app;
