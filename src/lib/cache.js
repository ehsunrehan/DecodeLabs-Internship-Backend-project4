/**
 * In-memory TTL cache.
 *
 * Third-party APIs are slow, rate-limited and sometimes down. A short
 * cache turns ten identical browser requests into one upstream call.
 */

const store = new Map();
const stats = { hits: 0, misses: 0, upstreamCalls: 0, upstreamMs: 0 };

function keyFor(parts) {
  return parts.map((part) => String(part)).join('|').toLowerCase();
}

function get(key) {
  const entry = store.get(key);
  if (!entry) {
    stats.misses += 1;
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    stats.misses += 1;
    return null;
  }
  stats.hits += 1;
  return { value: entry.value, ageSeconds: Math.round((Date.now() - entry.expiresAt + entry.ttlMs) / 1000) };
}

function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs, ttlMs });
}

function noteUpstream(ms) {
  stats.upstreamCalls += 1;
  stats.upstreamMs += ms;
}

function summary() {
  return {
    entries: store.size,
    hits: stats.hits,
    misses: stats.misses,
    hitRatio:
      stats.hits + stats.misses === 0
        ? null
        : `${Math.round((stats.hits / (stats.hits + stats.misses)) * 100)}%`,
    upstreamCalls: stats.upstreamCalls,
    avgUpstreamMs: stats.upstreamCalls ? Math.round(stats.upstreamMs / stats.upstreamCalls) : null
  };
}

function clear() {
  store.clear();
}

module.exports = { keyFor, get, set, noteUpstream, summary, clear };
