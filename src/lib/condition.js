/**
 * WMO weather-code vocabulary → the labels, groups and icon keys this
 * project uses. Upstream gives us numbers; our users get sentences.
 */

const CODES = {
  0: ['Clear sky', 'clear'],
  1: ['Mainly clear', 'clear'],
  2: ['Partly cloudy', 'partly'],
  3: ['Overcast', 'cloudy'],
  45: ['Fog', 'fog'],
  48: ['Depositing rime fog', 'fog'],
  51: ['Light drizzle', 'drizzle'],
  53: ['Moderate drizzle', 'drizzle'],
  55: ['Dense drizzle', 'drizzle'],
  56: ['Light freezing drizzle', 'drizzle'],
  57: ['Dense freezing drizzle', 'drizzle'],
  61: ['Slight rain', 'rain'],
  63: ['Moderate rain', 'rain'],
  65: ['Heavy rain', 'rain'],
  66: ['Light freezing rain', 'rain'],
  67: ['Heavy freezing rain', 'rain'],
  71: ['Slight snowfall', 'snow'],
  73: ['Moderate snowfall', 'snow'],
  75: ['Heavy snowfall', 'snow'],
  77: ['Snow grains', 'snow'],
  80: ['Slight rain showers', 'rain'],
  81: ['Moderate rain showers', 'rain'],
  82: ['Violent rain showers', 'rain'],
  85: ['Slight snow showers', 'snow'],
  86: ['Heavy snow showers', 'snow'],
  95: ['Thunderstorm', 'storm'],
  96: ['Thunderstorm with slight hail', 'storm'],
  99: ['Thunderstorm with heavy hail', 'storm']
};

const GROUP_LABEL = {
  clear: 'Clear',
  partly: 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  snow: 'Snow',
  storm: 'Thunderstorm'
};

function condition(code, isDay = true) {
  const [label, icon] = CODES[code] || ['Unknown conditions', 'partly'];
  return {
    code: Number(code),
    label,
    icon: icon === 'clear' && !isDay ? 'clear-night' : icon,
    group: GROUP_LABEL[icon] || 'Other'
  };
}

module.exports = { condition, CODES, GROUP_LABEL };
