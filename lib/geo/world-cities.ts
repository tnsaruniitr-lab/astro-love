// Curated set of major world cities for astrocartography recommendations.
// [name, country, lat (N+), lon (E+)]. Broad global coverage so the "where to
// live" suggestions aren't skewed to one region.

export interface WorldCity {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

const RAW: [string, string, number, number][] = [
  // Europe
  ["London", "UK", 51.507, -0.128], ["Paris", "France", 48.857, 2.352], ["Berlin", "Germany", 52.52, 13.405],
  ["Madrid", "Spain", 40.417, -3.703], ["Barcelona", "Spain", 41.385, 2.173], ["Lisbon", "Portugal", 38.722, -9.139],
  ["Rome", "Italy", 41.903, 12.496], ["Milan", "Italy", 45.464, 9.19], ["Amsterdam", "Netherlands", 52.368, 4.904],
  ["Vienna", "Austria", 48.208, 16.373], ["Prague", "Czechia", 50.076, 14.438], ["Zurich", "Switzerland", 47.377, 8.542],
  ["Copenhagen", "Denmark", 55.676, 12.568], ["Stockholm", "Sweden", 59.329, 18.069], ["Oslo", "Norway", 59.914, 10.752],
  ["Helsinki", "Finland", 60.169, 24.938], ["Dublin", "Ireland", 53.35, -6.26], ["Athens", "Greece", 37.984, 23.728],
  ["Warsaw", "Poland", 52.23, 21.011], ["Budapest", "Hungary", 47.497, 19.04], ["Bratislava", "Slovakia", 48.146, 17.107],
  ["Kyiv", "Ukraine", 50.45, 30.523], ["Moscow", "Russia", 55.756, 37.617], ["Istanbul", "Turkey", 41.008, 28.978],
  ["Reykjavik", "Iceland", 64.147, -21.94], ["Munich", "Germany", 48.135, 11.582], ["Brussels", "Belgium", 50.85, 4.352],
  // Middle East & Africa
  ["Dubai", "UAE", 25.205, 55.271], ["Abu Dhabi", "UAE", 24.453, 54.377], ["Doha", "Qatar", 25.286, 51.531],
  ["Tel Aviv", "Israel", 32.085, 34.782], ["Cairo", "Egypt", 30.044, 31.236], ["Marrakech", "Morocco", 31.63, -7.981],
  ["Cape Town", "South Africa", -33.925, 18.424], ["Johannesburg", "South Africa", -26.204, 28.047],
  ["Nairobi", "Kenya", -1.286, 36.817], ["Lagos", "Nigeria", 6.524, 3.379], ["Casablanca", "Morocco", 33.573, -7.59],
  ["Riyadh", "Saudi Arabia", 24.713, 46.675], ["Accra", "Ghana", 5.56, -0.205],
  // South Asia
  ["Delhi", "India", 28.614, 77.209], ["Mumbai", "India", 19.076, 72.878], ["Bengaluru", "India", 12.972, 77.595],
  ["Goa", "India", 15.3, 74.083], ["Chennai", "India", 13.083, 80.27], ["Kolkata", "India", 22.573, 88.364],
  ["Colombo", "Sri Lanka", 6.927, 79.861], ["Kathmandu", "Nepal", 27.717, 85.324], ["Dhaka", "Bangladesh", 23.811, 90.413],
  ["Hyderabad", "India", 17.385, 78.487], ["Pune", "India", 18.52, 73.857], ["Jaipur", "India", 26.912, 75.787],
  // East & SE Asia
  ["Singapore", "Singapore", 1.352, 103.82], ["Bangkok", "Thailand", 13.756, 100.502], ["Bali", "Indonesia", -8.34, 115.092],
  ["Jakarta", "Indonesia", -6.208, 106.846], ["Kuala Lumpur", "Malaysia", 3.139, 101.687], ["Manila", "Philippines", 14.6, 120.984],
  ["Hong Kong", "China", 22.319, 114.169], ["Shanghai", "China", 31.23, 121.474], ["Beijing", "China", 39.904, 116.407],
  ["Tokyo", "Japan", 35.676, 139.65], ["Kyoto", "Japan", 35.011, 135.768], ["Seoul", "South Korea", 37.567, 126.978],
  ["Taipei", "Taiwan", 25.033, 121.565], ["Ho Chi Minh City", "Vietnam", 10.823, 106.63], ["Hanoi", "Vietnam", 21.028, 105.834],
  ["Chiang Mai", "Thailand", 18.788, 98.985],
  // Oceania
  ["Sydney", "Australia", -33.869, 151.209], ["Melbourne", "Australia", -37.814, 144.963], ["Brisbane", "Australia", -27.47, 153.026],
  ["Perth", "Australia", -31.953, 115.857], ["Auckland", "New Zealand", -36.848, 174.763], ["Wellington", "New Zealand", -41.286, 174.776],
  ["Gold Coast", "Australia", -28.017, 153.4],
  // North America
  ["New York", "USA", 40.713, -74.006], ["Los Angeles", "USA", 34.052, -118.244], ["San Francisco", "USA", 37.775, -122.419],
  ["Chicago", "USA", 41.878, -87.63], ["Miami", "USA", 25.762, -80.192], ["Austin", "USA", 30.267, -97.743],
  ["Seattle", "USA", 47.606, -122.332], ["Boston", "USA", 42.36, -71.058], ["Denver", "USA", 39.739, -104.99],
  ["Toronto", "Canada", 43.653, -79.383], ["Vancouver", "Canada", 49.283, -123.121], ["Montreal", "Canada", 45.502, -73.567],
  ["Mexico City", "Mexico", 19.433, -99.133], ["Honolulu", "USA", 21.307, -157.858], ["Portland", "USA", 45.515, -122.679],
  ["Nashville", "USA", 36.163, -86.781], ["San Diego", "USA", 32.716, -117.161],
  // Central & South America
  ["Buenos Aires", "Argentina", -34.604, -58.382], ["Rio de Janeiro", "Brazil", -22.907, -43.173], ["Sao Paulo", "Brazil", -23.551, -46.633],
  ["Santiago", "Chile", -33.449, -70.669], ["Lima", "Peru", -12.046, -77.043], ["Bogota", "Colombia", 4.711, -74.072],
  ["Medellin", "Colombia", 6.244, -75.581], ["Montevideo", "Uruguay", -34.901, -56.164], ["San Jose", "Costa Rica", 9.928, -84.091],
  ["Panama City", "Panama", 8.984, -79.519], ["Quito", "Ecuador", -0.181, -78.468], ["Cartagena", "Colombia", 10.391, -75.479],
  ["Tulum", "Mexico", 20.211, -87.466], ["Cusco", "Peru", -13.532, -71.967],
];

export const WORLD_CITIES: WorldCity[] = RAW.map(([name, country, lat, lon]) => ({ name, country, lat, lon }));
