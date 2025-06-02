// api.js - handles external API calls

const REST_COUNTRIES_BASE = "https://restcountries.com/v3.1";
const EXCHANGE_RATE_BASE = "https://v6.exchangerate-api.com/v6/94f9d1531bbe860583e806b0/latest";

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
  const response = await fetch(`${REST_COUNTRIES_BASE}/all`);
  if (!response.ok) {
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