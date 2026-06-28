// Curated city dataset for Milestone 1 (lat = north+, lon = EAST+, IANA tz).
// Heavy on the Slavic / CIS world plus major global + diaspora cities.
// Production note (SPEC.md §5.1–5.2): replace with a bundled GeoNames dataset
// + geo-tz polygon lookup for full coverage. The IANA tz here drives Luxon's
// historical-offset resolution, so it must be correct per city.

export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
}

export const CITIES: City[] = [
  // Russia
  { id: "moscow", name: "Москва (Moscow)", country: "RU", lat: 55.7558, lon: 37.6173, tz: "Europe/Moscow" },
  { id: "spb", name: "Санкт-Петербург (St Petersburg)", country: "RU", lat: 59.9311, lon: 30.3609, tz: "Europe/Moscow" },
  { id: "novosibirsk", name: "Новосибирск (Novosibirsk)", country: "RU", lat: 55.0084, lon: 82.9357, tz: "Asia/Novosibirsk" },
  { id: "yekaterinburg", name: "Екатеринбург (Yekaterinburg)", country: "RU", lat: 56.8389, lon: 60.6057, tz: "Asia/Yekaterinburg" },
  { id: "kazan", name: "Казань (Kazan)", country: "RU", lat: 55.7963, lon: 49.1088, tz: "Europe/Moscow" },
  { id: "nizhny", name: "Нижний Новгород (Nizhny Novgorod)", country: "RU", lat: 56.2965, lon: 43.9361, tz: "Europe/Moscow" },
  { id: "samara", name: "Самара (Samara)", country: "RU", lat: 53.2415, lon: 50.2212, tz: "Europe/Samara" },
  { id: "rostov", name: "Ростов-на-Дону (Rostov-on-Don)", country: "RU", lat: 47.2357, lon: 39.7015, tz: "Europe/Moscow" },
  { id: "krasnodar", name: "Краснодар (Krasnodar)", country: "RU", lat: 45.0355, lon: 38.9753, tz: "Europe/Moscow" },
  { id: "vladivostok", name: "Владивосток (Vladivostok)", country: "RU", lat: 43.1155, lon: 131.8855, tz: "Asia/Vladivostok" },
  { id: "sochi", name: "Сочи (Sochi)", country: "RU", lat: 43.5855, lon: 39.7231, tz: "Europe/Moscow" },
  { id: "kaliningrad", name: "Калининград (Kaliningrad)", country: "RU", lat: 54.7104, lon: 20.4522, tz: "Europe/Kaliningrad" },

  // Ukraine
  { id: "kyiv", name: "Київ (Kyiv)", country: "UA", lat: 50.4501, lon: 30.5234, tz: "Europe/Kyiv" },
  { id: "kharkiv", name: "Харків (Kharkiv)", country: "UA", lat: 49.9935, lon: 36.2304, tz: "Europe/Kyiv" },
  { id: "odesa", name: "Одеса (Odesa)", country: "UA", lat: 46.4825, lon: 30.7233, tz: "Europe/Kyiv" },
  { id: "dnipro", name: "Дніпро (Dnipro)", country: "UA", lat: 48.4647, lon: 35.0462, tz: "Europe/Kyiv" },
  { id: "lviv", name: "Львів (Lviv)", country: "UA", lat: 49.8397, lon: 24.0297, tz: "Europe/Kyiv" },

  // Belarus, Kazakhstan & CIS
  { id: "minsk", name: "Мінск (Minsk)", country: "BY", lat: 53.9006, lon: 27.5590, tz: "Europe/Minsk" },
  { id: "almaty", name: "Алматы (Almaty)", country: "KZ", lat: 43.2220, lon: 76.8512, tz: "Asia/Almaty" },
  { id: "astana", name: "Астана (Astana)", country: "KZ", lat: 51.1605, lon: 71.4704, tz: "Asia/Almaty" },
  { id: "tashkent", name: "Toshkent (Tashkent)", country: "UZ", lat: 41.2995, lon: 69.2401, tz: "Asia/Tashkent" },
  { id: "baku", name: "Bakı (Baku)", country: "AZ", lat: 40.4093, lon: 49.8671, tz: "Asia/Baku" },
  { id: "yerevan", name: "Երևան (Yerevan)", country: "AM", lat: 40.1792, lon: 44.4991, tz: "Asia/Yerevan" },
  { id: "tbilisi", name: "თბილისი (Tbilisi)", country: "GE", lat: 41.7151, lon: 44.8271, tz: "Asia/Tbilisi" },
  { id: "chisinau", name: "Chișinău", country: "MD", lat: 47.0105, lon: 28.8638, tz: "Europe/Chisinau" },

  // Europe (incl. diaspora hubs)
  { id: "london", name: "London", country: "GB", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
  { id: "berlin", name: "Berlin", country: "DE", lat: 52.52, lon: 13.405, tz: "Europe/Berlin" },
  { id: "warsaw", name: "Warszawa (Warsaw)", country: "PL", lat: 52.2297, lon: 21.0122, tz: "Europe/Warsaw" },
  { id: "prague", name: "Praha (Prague)", country: "CZ", lat: 50.0755, lon: 14.4378, tz: "Europe/Prague" },
  { id: "paris", name: "Paris", country: "FR", lat: 48.8566, lon: 2.3522, tz: "Europe/Paris" },
  { id: "madrid", name: "Madrid", country: "ES", lat: 40.4168, lon: -3.7038, tz: "Europe/Madrid" },
  { id: "rome", name: "Roma (Rome)", country: "IT", lat: 41.9028, lon: 12.4964, tz: "Europe/Rome" },
  { id: "amsterdam", name: "Amsterdam", country: "NL", lat: 52.3676, lon: 4.9041, tz: "Europe/Amsterdam" },
  { id: "vienna", name: "Wien (Vienna)", country: "AT", lat: 48.2082, lon: 16.3738, tz: "Europe/Vienna" },
  { id: "istanbul", name: "İstanbul", country: "TR", lat: 41.0082, lon: 28.9784, tz: "Europe/Istanbul" },
  { id: "riga", name: "Rīga (Riga)", country: "LV", lat: 56.9496, lon: 24.1052, tz: "Europe/Riga" },
  { id: "vilnius", name: "Vilnius", country: "LT", lat: 54.6872, lon: 25.2797, tz: "Europe/Vilnius" },
  { id: "tallinn", name: "Tallinn", country: "EE", lat: 59.437, lon: 24.7536, tz: "Europe/Tallinn" },

  // Americas
  { id: "nyc", name: "New York", country: "US", lat: 40.7128, lon: -74.006, tz: "America/New_York" },
  { id: "brooklyn", name: "Brooklyn, NY", country: "US", lat: 40.6782, lon: -73.9442, tz: "America/New_York" },
  { id: "la", name: "Los Angeles", country: "US", lat: 34.0522, lon: -118.2437, tz: "America/Los_Angeles" },
  { id: "chicago", name: "Chicago", country: "US", lat: 41.8781, lon: -87.6298, tz: "America/Chicago" },
  { id: "miami", name: "Miami", country: "US", lat: 25.7617, lon: -80.1918, tz: "America/New_York" },
  { id: "toronto", name: "Toronto", country: "CA", lat: 43.6532, lon: -79.3832, tz: "America/Toronto" },

  // Middle East & Asia
  { id: "dubai", name: "Dubai", country: "AE", lat: 25.2048, lon: 55.2708, tz: "Asia/Dubai" },
  { id: "telaviv", name: "Tel Aviv", country: "IL", lat: 32.0853, lon: 34.7818, tz: "Asia/Jerusalem" },
  { id: "bangkok", name: "Bangkok", country: "TH", lat: 13.7563, lon: 100.5018, tz: "Asia/Bangkok" },
  { id: "bali", name: "Denpasar (Bali)", country: "ID", lat: -8.6705, lon: 115.2126, tz: "Asia/Makassar" },
  { id: "tokyo", name: "Tokyo", country: "JP", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo" },
];

export const findCity = (id: string): City | undefined =>
  CITIES.find((c) => c.id === id);

// Convert a curated City into a BirthPlace so server-rendered defaults work
// without any network call (the live autocomplete uses the geocoding API).
import type { BirthPlace } from "./geocode";

export const cityToPlace = (c: City): BirthPlace => ({
  label: c.name,
  name: c.name,
  country: c.country,
  countryCode: c.country,
  lat: c.lat,
  lon: c.lon,
  tz: c.tz,
});

/** BirthPlace for a curated city id (used for default/demo forms). */
export const placeForCity = (id: string): BirthPlace => cityToPlace(findCity(id)!);
