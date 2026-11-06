# Project 04 — Third-Party API Integration *(optional milestone)*

**DecodeLabs · Industrial Training Kit · Batch 2026 · Backend Development**

> **Goal:** Fetch and process data from an external server (e.g. a weather API) and serve it to your own users.
> **Key requirements:** store an external API key securely · fetch external data asynchronously · reformat and serve the data.
> **Key skills:** asynchronous programming, API key management, error handling.

---

## 1. What is in here

A Node/Express bridge to **Open-Meteo** (open weather data). The browser only ever talks to *this* server; the server calls the provider asynchronously, reshapes the payload into our own contract, caches it, and answers with a clean document.

| PDF requirement | Where it lives |
| --- | --- |
| Store an external API key securely | `src/config.js` + `.env` (`UPSTREAM_API_KEY`) — read server-side, exported only as a **mask** via `GET /api/config` |
| Fetch external data asynchronously | `src/lib/upstream.js` — `fetch` + `AbortController` timeout, one automatic retry, never blocking |
| Reformat and serve the data | `src/lib/shape.js` — WMO codes → labels/icons, units documented, our own envelope |
| Error handling | `502 UPSTREAM_HTTP_ERROR` · `504 UPSTREAM_TIMEOUT` · `502 UPSTREAM_UNREACHABLE` · `400` validation |

**Additions:**

- Forward geocoding endpoint (place name → coordinates) — also third-party, also cached
- `GET /api/weather/summary` — a one-paragraph digest written in *our* words
- In-memory TTL cache (600 s) with live statistics (`hits`, `misses`, `hitRatio`, `avgUpstreamMs`)
- `GET /api/health` — probes the provider so a broken link is visible in the UI
- `GET /api/config` — proves the credential never reaches the browser
- °C / °F toggle, hourly strip, 7-day outlook, quick-pick cities
- An "Integration inspector" panel showing latency, cache state, shaped-at time and the upstream URL

> **Why no key is required:** Open-Meteo is free open data. The `.env` credential pattern is implemented and demonstrated anyway, so switching to a key-based provider (OpenWeatherMap, Tomorrow.io…) is a one-line change.

---

## 2. Requirements

- **Node.js 18+** (global `fetch` — no HTTP library needed)
- **An internet connection** — this project is defined by its upstream call
- Dependencies: `express`, `dotenv` (installed by `npm install`)

## 3. Execute it

Open a terminal in **this folder** (`Project4-Third-Party-API-Integration`).

```bash
# 1) install dependencies (first time only)
npm install

# 2) start the server
npm start
```

Expected output:

```
DecodeLabs · Project 4 · Third-Party API Integration
Server     : http://localhost:5104
Upstream   : https://api.open-meteo.com/v1/forecast
Cache TTL  : 600s
API key    : not required by this provider
```

**Open the interface:** <http://localhost:5104>

Type a city (geocoding suggestion appears), or use the quick picks. Stop with `Ctrl + C`.

### Configuration (`.env`)

| Key | Default | Meaning |
| --- | --- | --- |
| `PORT` | `5104` | HTTP port |
| `UPSTREAM_FORECAST` | Open-Meteo forecast URL | third-party endpoint |
| `UPSTREAM_GEOCODE` | Open-Meteo geocoding URL | third-party endpoint |
| `UPSTREAM_API_KEY` | *(empty)* | secret, server-side only; sent as `Authorization` when set |
| `UPSTREAM_TIMEOUT_MS` | `8000` | abort a slow provider |
| `UPSTREAM_RETRIES` | `1` | one retry on transient failure |
| `CACHE_TTL_SECONDS` | `600` | how long identical answers are reused |

---

## 4. Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api` | Service index |
| `GET` | `/api/config` | Integration settings — credential **masked** |
| `GET` | `/api/health` | Upstream reachability + cache statistics |
| `GET` | `/api/geo?q=…&count=6` | Place name → coordinates (geocoding) |
| `GET` | `/api/weather/current?lat=…&lon=…` | Current conditions + next 6 hours |
| `GET` | `/api/weather/forecast?lat=…&lon=…&days=7` | Full document: current + hourly + daily |
| `GET` | `/api/weather/summary?lat=…&lon=…` | One-paragraph digest for humans |

### The shape we serve (a sample)

```jsonc
{
  "ok": true,
  "data": {
    "location": { "latitude": 26.85, "longitude": 80.95, "timezone": "Asia/Kolkata" },
    "current": {
      "temperature": { "value": 25.3, "unit": "°C" },
      "feelsLike":   { "value": 27.9, "unit": "°C" },
      "wind":        { "speed": { "value": 3.4, "unit": "km/h" } },
      "condition":   { "code": 0, "label": "Clear sky", "icon": "clear", "group": "Clear" }
    },
    "hourly": [ /* 12 entries */ ],
    "daily":  [ /* 7 entries: high, low, rain, sunrise, sunset, uv */ ],
    "meta":   { "source": "open-meteo", "cached": false, "upstreamMs": 775 }
  }
}
```

### Examples

```bash
curl "http://localhost:5104/api/geo?q=Kanpur&count=3"
curl "http://localhost:5104/api/weather/forecast?lat=26.8467&lon=80.9517&days=5"
curl "http://localhost:5104/api/weather/summary?lat=26.8467&lon=80.9517"
curl "http://localhost:5104/api/weather/forecast?lat=999&lon=80"      # → 400, never reaches the provider
curl "http://localhost:5104/api/health"
```

Repeating the same forecast request inside 10 minutes returns the **cached** copy (`meta.cached: true`, `upstreamMs: 0`).

---

## 5. Project structure

```
Project4-Third-Party-API-Integration/
├─ server.js
├─ .env                          # upstream URLs, secret, timeouts, cache TTL
├─ package.json
├─ README.md
├─ src/
│  ├─ load-env.js
│  ├─ config.js                  # the only file holding the raw key
│  ├─ errors/api-error.js
│  ├─ lib/
│  │  ├─ upstream.js             # async GET · timeout · retry · cache
│  │  ├─ condition.js            # WMO codes → label / group / icon
│  │  ├─ cache.js                # TTL cache + statistics
│  │  └─ shape.js                # REFORMATTING: their payload → our contract
│  ├─ middleware/                # request log · structured 404 · error mapper
│  ├─ routes/
│  │  ├─ meta.routes.js          # /api  /api/config  /api/health
│  │  ├─ geo.routes.js           # /api/geo
│  │  └─ weather.routes.js       # /api/weather/{current,forecast,summary}
│  └─ validation/query.js        # lat/lon/days/place validation
└─ public/                       # "Weather Desk" interface
   ├─ index.html
   ├─ styles.css
   └─ app.js
```

## 6. Interface

**"Weather Desk"** — a porcelain-white page with one very large numeral. Search a city (live geocoding suggestions), read the current conditions, the next 12 hours and a 7-day outlook with hand-drawn SVG icons, toggle °C/°F, and watch the **Integration inspector** panel show exactly what went over the wire: upstream latency, cache hit/miss, shaping time and the masked key status.

---

*DecodeLabs · Greater Lucknow, India · www.decodelabs.tech*
