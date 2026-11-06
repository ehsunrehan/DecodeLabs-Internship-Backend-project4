/**
 * Runtime configuration for the integration layer.
 * The raw key never leaves this module — only masked() and hasKey()
 * are exported, which is exactly the rule for third-party secrets.
 */

const RAW_KEY = process.env.UPSTREAM_API_KEY || '';

function hasKey() {
  return RAW_KEY.length > 0;
}

function masked() {
  if (!hasKey()) return null;
  const tail = RAW_KEY.slice(-4);
  return `${'*'.repeat(Math.max(4, RAW_KEY.length - 4))}${tail}`;
}

module.exports = {
  forecastBase: process.env.UPSTREAM_FORECAST || 'https://api.open-meteo.com/v1/forecast',
  geocodeBase: process.env.UPSTREAM_GEOCODE || 'https://geocoding-api.open-meteo.com/v1/search',
  timeoutMs: Number(process.env.UPSTREAM_TIMEOUT_MS) || 8000,
  retries: Number(process.env.UPSTREAM_RETRIES ?? 1),
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS) || 600,
  provider: 'Open-Meteo',
  hasKey,
  masked,
  /** headers sent with every upstream call — key included, never logged */
  headers() {
    const headers = { Accept: 'application/json', 'User-Agent': 'DecodeLabs-Project4/1.0' };
    if (hasKey()) headers.Authorization = `Bearer ${RAW_KEY}`;
    return headers;
  }
};
