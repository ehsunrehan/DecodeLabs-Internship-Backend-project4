/**
 * /api — service index, live configuration and health of the link.
 */

const express = require('express');
const config = require('../config');
const cache = require('../lib/cache');
const { UpstreamError } = require('../lib/upstream');

const router = express.Router();
const STARTED_AT = Date.now();

router.get('/', (_req, res) => {
  res.json({
    ok: true,
    data: {
      service: 'DecodeLabs Weather Bridge',
      project: 'Project 4 — Third-Party API Integration (optional milestone)',
      provider: config.provider,
      routes: [
        { method: 'GET', path: '/api/geo', purpose: 'Forward geocoding: place name → coordinates' },
        { method: 'GET', path: '/api/weather/current', purpose: 'Current conditions + next 6 hours' },
        { method: 'GET', path: '/api/weather/forecast', purpose: 'Full document: current + hourly + daily' },
        { method: 'GET', path: '/api/weather/summary', purpose: 'One-paragraph digest in our own words' },
        { method: 'GET', path: '/api/config', purpose: 'Integration settings (key masked)' },
        { method: 'GET', path: '/api/health', purpose: 'Uptime, cache statistics, upstream reachability' }
      ],
      conventions: {
        success: '{ ok: true, data: { … , meta: { source, cached, upstreamMs } } }',
        failure: '{ ok: false, error: { code, message, hint } }'
      }
    },
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Integration settings — proof that the credential lives server-side:
 * the endpoint can only ever show a mask of it.
 */
router.get('/config', (_req, res) => {
  res.json({
    ok: true,
    data: {
      provider: config.provider,
      endpoints: {
        forecast: config.forecastBase,
        geocoding: config.geocodeBase
      },
      credential: {
        requiredByProvider: false,
        presentInEnv: config.hasKey(),
        masked: config.masked(),
        storedIn: '.env (server only)',
        exposedToBrowser: false,
        note: 'The key is attached to upstream requests in src/config.js and is never included in a response.'
      },
      resilience: {
        timeoutMs: config.timeoutMs,
        retries: config.retries,
        cacheTtlSeconds: config.cacheTtlSeconds
      }
    },
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Health — probes the third party with a tiny, cached request so a
 * broken link is visible from the UI instead of failing silently.
 */
router.get('/health', async (_req, res) => {
  try {
    const started = Date.now();
    const response = await fetch(`${config.forecastBase}?latitude=0&longitude=0&current=temperature_2m`, {
      headers: config.headers(),
      signal: AbortSignal.timeout(config.timeoutMs)
    });

    if (!response.ok) throw new Error(`upstream ${response.status}`);

    res.json({
      ok: true,
      data: {
        status: 'ok',
        provider: config.provider,
        upstreamReachable: true,
        upstreamLatencyMs: Date.now() - started,
        uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
        cache: cache.summary(),
        nodeVersion: process.version
      },
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: {
        code: error instanceof UpstreamError ? error.code : 'UPSTREAM_PROBE_FAILED',
        message: 'The third-party server is not answering right now.',
        hint: 'Check your internet connection — cached data will still be served.'
      },
      meta: { timestamp: new Date().toISOString(), cache: cache.summary() }
    });
  }
});

module.exports = router;
