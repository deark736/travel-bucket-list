// flightApi.js – wraps Amadeus Flight Offers Search calls (Test/Sandbox environment)

const AMADEUS_CLIENT_ID     = 'bTlkWyHX2CHWvbEKtwG0qjR14gksyoA0';
const AMADEUS_CLIENT_SECRET = 'TaGhPuRiRo35EpUx';

// Base URLs for Amadeus (Test environment)
const AMADEUS_TOKEN_URL  = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_FLIGHT_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers';

/**
 * 1) Request an OAuth access token from Amadeus.
 *    Tokens last ~1 hour. We don’t cache in localStorage for simplicity.
 * @returns {Promise<string>} access_token
 */
async function getAccessToken() {
  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');
  body.append('client_id', AMADEUS_CLIENT_ID);
  body.append('client_secret', AMADEUS_CLIENT_SECRET);

  const response = await fetch(AMADEUS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    const errJson = await response.json();
    console.error('Amadeus token error:', errJson);
    throw new Error('Unable to retrieve Amadeus access token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * 2) Fetch the cheapest flight price for a single adult,
 *    one-way on the given date, origin→destination.
 *
 * @param {string} origin      - IATA code (e.g. "JFK")
 * @param {string} destination - IATA code (e.g. "LHR")
 * @param {string} date        - Departure date in "YYYY-MM-DD" format
 * @param {string} currency    - 3-letter currency code (e.g. "USD")
 * @returns {Promise<number>}  - The total price in the given currency
 */
export async function getCheapestFlightPrice(origin, destination, date, currency = 'USD') {
  // 2a) Get a fresh access token
  const token = await getAccessToken();

  // 2b) Build the query params. We request only the single cheapest offer (max=1).
  const params = new URLSearchParams({
    originLocationCode: origin.toUpperCase(),
    destinationLocationCode: destination.toUpperCase(),
    departureDate: date,
    adults: '1',
    currencyCode: currency,
    max: '1'
  });

  const url = `${AMADEUS_FLIGHT_URL}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errJson = await response.json();
    console.error('Amadeus flight error:', errJson);
    throw new Error('Error fetching flight price');
  }

  const result = await response.json();

  if (!result.data || result.data.length === 0) {
    throw new Error('No flight offers found');
  }

  // Extract the total price for the first offer
  // Amadeus v2 flight response structure: data[0].price.total
  const firstOffer = result.data[0];
  const priceStr = firstOffer.price.total; // string, e.g. "345.23"
  return parseFloat(priceStr);
}