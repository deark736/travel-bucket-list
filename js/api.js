// api.js - handles external API calls

const REST_COUNTRIES_BASE = "https://restcountries.com/v3.1";
const EXCHANGE_RATE_BASE = "https://v6.exchangerate-api.com/v6/94f9d1531bbe860583e806b0/latest";
const WIKI_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";
const MAPBOX_TOKEN = "pk.eyJ1Ijoia2Fua2FuaG8iLCJhIjoiY21icnVxa2c3MGUwcjJwcHhuNXIwZjJkZSJ9.fkJa48wRY1biAARbtUOVow";

/**
 * Fetch a one‐sentence Wikipedia summary for a given country name.
 * @param {string} countryName
 * @returns {Promise<string>} the summary text
 */
export async function getWikiSummary(countryName) {
  const resp = await fetch(`${WIKI_BASE}/${encodeURIComponent(countryName)}`);
  if (!resp.ok) return "";
  const data = await resp.json();
  return data.extract?.split(".")[0] + "." || "";
}

/**
 * Build a Mapbox Static Map URL centered on lat/lng
 * showing the country or capital.
 * @param {number} lat
 * @param {number} lng
 * @returns {string} the image URL
 */
export function getStaticMapURL(lat, lng) {
  const base = "https://api.mapbox.com/styles/v1/mapbox/streets-v11/static";
  const zoom = 4;
  const width = 300;
  const height = 150;
  return `${base}/${lng},${lat},${zoom}/${width}x${height}?access_token=${MAPBOX_TOKEN}`;
}

// Fetch country data by full name
export async function getCountryByName(name) {
  const response = await fetch(`${REST_COUNTRIES_BASE}/name/${encodeURIComponent(name)}?fullText=true`);
  if (!response.ok) {
    throw new Error("Country not found");
  }
  const data = await response.json();
  return data[0];
}

// Fetch all countries (for random selection)
export async function getAllCountries() {
  const url = `${REST_COUNTRIES_BASE}/all?fields=name,flags,capital,region,latlng,currencies,population`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error("Countries fetch failed:", response.status, response.statusText);
    throw new Error("Error fetching country list");
  }
  return response.json();
}

// Get a random country object
export async function getRandomCountry() {
  const countries = await getAllCountries();
  const randomIndex = Math.floor(Math.random() * countries.length);
  return countries[randomIndex];
}

// Fetch exchange rate for a given currency code against base (default USD)
export async function getExchangeRate(currencyCode, base = "USD") {
  const response = await fetch(`${EXCHANGE_RATE_BASE}/${base}`);
  if (!response.ok) {
    throw new Error("Error fetching exchange rates");
  }
  const data = await response.json();
  if (!data.conversion_rates || !data.conversion_rates[currencyCode]) {
    throw new Error("Invalid currency code or missing rate");
  }
  return data.conversion_rates[currencyCode];
}