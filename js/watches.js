// watches.js – front‐end logic for adding/removing flight watches, fetching prices, and drawing charts

import {
  getCheapestFlightPrice,
  getRoundTripPrice,
  getCheapestInRange
} from './flightApi.js';

const WATCHES_KEY = 'flightWatches'; // key under which we store an array of route objects

/**
 * Read the array of flight watches from localStorage.
 * @returns {Array<Object>} each object:
 *   {
 *     origin: string,         // IATA code
 *     destination: string,    // IATA code
 *     departDate: string,     // 'YYYY-MM-DD'
 *     returnDate: string|null,// 'YYYY-MM-DD' or null
 *     windowDays: number,     // ± days around departDate
 *     currency: string        // e.g. 'USD'
 *   }
 */
function getWatches() {
  const stored = localStorage.getItem(WATCHES_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Save the entire watches array back to localStorage
 * @param {Array<Object>} watches
 */
function saveWatches(watches) {
  localStorage.setItem(WATCHES_KEY, JSON.stringify(watches));
}

/**
 * Remove a flight watch by matching all its parameters.
 * @param {string} origin       – origin IATA code
 * @param {string} destination  – destination IATA code
 * @param {string} departDate   – 'YYYY-MM-DD'
 * @param {string|null} returnDate  – 'YYYY-MM-DD' or null
 * @param {number} windowDays   – ± days window
 */
function removeWatch(origin, destination, departDate, returnDate = null, windowDays = 0) {
  const watches = getWatches().filter(w =>
    !(
      w.origin      === origin &&
      w.destination === destination &&
      w.departDate  === departDate &&
      w.returnDate  === returnDate &&
      w.windowDays  === windowDays
    )
  );
  saveWatches(watches);
  // Also remove history
  const keyParts = [origin, destination, departDate];
  if (returnDate)  keyParts.push('rt', returnDate);
  if (windowDays)  keyParts.push('wd', windowDays);
  localStorage.removeItem(`history-${keyParts.join('-')}`);
}

/**
 * Append a price to the history array in localStorage under a composite key.
 * Key format: history-ORIG-DEST-departDate[-rt-returnDate][-wd-windowDays]
 *
 * @param {string} key   – composite history key
 * @param {number} price – latest flight price
 * @returns {Array<number>} updated history array (max 10 entries)
 */
function appendToHistory(key, price) {
  const stored = localStorage.getItem(key);
  let history = stored ? JSON.parse(stored) : [];
  history.push(price);
  if (history.length > 10) history.shift();
  localStorage.setItem(key, JSON.stringify(history));
  return history;
}

/**
 * Build and append a flight-watch “card” to the page.
 * Fetches the current price (one-way, round-trip, or flexible-range),
 * updates its localStorage history, and draws a sparkline.
 *
 * @param {Object} watch
 *   {
 *     origin: string,
 *     destination: string,
 *     departDate: string,
 *     returnDate: string|null,
 *     windowDays: number,
 *     currency: string
 *   }
 *
 * @note windowDays applies only to outbound searches. If returnDate exists,
 *       we perform a strict round-trip via getRoundTripPrice().
 */
async function createWatchCard(watch) {
  const { origin, destination, departDate, returnDate, windowDays = 0, currency } = watch;
  const card = document.createElement('div');
  card.className = 'watch-card';

  // 1) Small “×” remove button
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '×';
  removeBtn.className = 'remove-watch-btn';
  removeBtn.title = 'Remove this watch';
  removeBtn.setAttribute('aria-label', 'Remove this watch');
  removeBtn.addEventListener('click', () => {
    removeWatch(origin, destination, departDate, returnDate, windowDays);
    card.remove();
  });
  card.appendChild(removeBtn);

  // 2) Heading: JFK → LHR
  const heading = document.createElement('h3');
  heading.textContent = `${origin} → ${destination}`;
  card.appendChild(heading);

  // 3) Key details list
  const infoList = document.createElement('ul');
  infoList.className = 'watch-info';
  [
    [`Depart`, departDate],
    returnDate && [`Return`, returnDate],
    windowDays > 0 && [`Window`, `±${windowDays} days`],
    [`Currency`, currency]
  ].forEach(item => {
    if (!item) return;
    const li = document.createElement('li');
    li.textContent = `${item[0]}: ${item[1]}`;
    infoList.appendChild(li);
  });
  card.appendChild(infoList);

  // 4) Price placeholder
  const priceP = document.createElement('p');
  priceP.className = 'watch-price';
  priceP.textContent = 'Fetching price…';
  card.appendChild(priceP);

  // 5) Chart canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'watch-chart';
  // give unique ID
  const idParts = [origin, destination, departDate];
  if (returnDate)  idParts.push('rt', returnDate);
  if (windowDays)  idParts.push('wd', windowDays);
  canvas.id = `chart_${idParts.join('_')}`;
  card.appendChild(canvas);

  // finally add to DOM
  document.getElementById('watches-container').appendChild(card);

  // 6) Fetch price & draw sparkline + stats
  try {
    let price;
    if (returnDate) {
      price = await getRoundTripPrice(origin, destination, departDate, returnDate, currency);
      priceP.textContent = `Round-trip: ${price.toFixed(2)} ${currency}`;
    } else if (windowDays > 0) {
      price = await getCheapestInRange(origin, destination, departDate, windowDays, currency);
      priceP.textContent = `Cheapest ±${windowDays}d: ${price.toFixed(2)} ${currency}`;
    } else {
      price = await getCheapestFlightPrice(origin, destination, departDate, currency);
      priceP.textContent = `One-way: ${price.toFixed(2)} ${currency}`;
    }

    // update history
    const historyKey = `history-${idParts.join('-')}`;
    const history = appendToHistory(historyKey, price);

    // draw chart
    drawSparkline(canvas.id, history, currency);

    // display min/max below the chart
    const statsP = document.createElement('p');
    const min = Math.min(...history).toFixed(2);
    const max = Math.max(...history).toFixed(2);
    statsP.textContent = `Low: ${min}, High: ${max}`;
    statsP.className = 'watch-stats';
    card.appendChild(statsP);

  } catch (err) {
    priceP.textContent = 'Error fetching price';
    console.error(err);
  }
}

/**
 * Initialize and render all watches on the page.
 * Called on DOMContentLoaded and after adding a new watch.
 */
async function renderAllWatches() {
  const container = document.getElementById('watches-container');
  container.innerHTML = ''; // clear existing cards

  const watches = getWatches();
  for (let watch of watches) {
    // eslint-disable-next-line no-await-in-loop
    await createWatchCard(watch);
  }
}

/**
 * Helper to draw a simple line chart (sparkline) with Chart.js.
 *
 * @param {string} canvasId - The <canvas> ID
 * @param {Array<number>} dataPoints
 * @param {string} currency
 */
function drawSparkline(canvasId, dataPoints, currency) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      // x-axis labels can be omitted or simply index numbers
      labels: dataPoints.map((_, i) => i + 1),
      datasets: [{
        data: dataPoints,
        borderColor: '#4B34D1',
        backgroundColor: 'rgba(75, 52, 209, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 0 // hide individual points, just show line
      }]
    },
    options: {
      responsive: false, // fixed size (controlled by CSS)
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.y.toFixed(2)} ${currency.toUpperCase()}`
          }
        }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
}

/**
 * On DOMContentLoaded:
 *  1) Render existing watches
 *  2) Set up “Add Watch” form handler
 *  3) Insert current year into footer
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1) Render all saved watches
  renderAllWatches();

  // 2) Hook up “Add Watch” form
  const form = document.getElementById('add-watch-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const origin = document.getElementById('origin-input').value.trim().toUpperCase();
    const destination = document.getElementById('destination-input').value.trim().toUpperCase();
    const date = document.getElementById('departure-date-input').value;
    const returnDate = document.getElementById('return-date-input').value || null;
    const windowDays = parseInt(document.getElementById('window-input').value || '0', 10);

    // Basic validation: origin ≠ destination, date must be in the future
    if (!origin || !destination || !date) {
      alert('Please enter origin, destination, and a valid date.');
      return;
    }
    if (origin === destination) {
      alert('Origin and destination must be different.');
      return;
    }
    const chosenDate = new Date(date);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (chosenDate < today) {
      alert('Departure date must be today or later.');
      return;
    }

    // Add the new watch to localStorage
    const newWatch = {
      origin,
      destination,
      departDate: date,
      returnDate,
      windowDays,
      currency: 'USD'
    };
    const watches = getWatches();
    // Prevent duplicate watch with identical origin, destination, departure date,
    // return date (if any), and flexible‐window days
    const exists = watches.some(w =>
      w.origin       === origin &&
      w.destination  === destination &&
      w.departDate   === date &&
      (
        (!w.returnDate && !returnDate && w.windowDays === windowDays) ||
        (w.returnDate  === returnDate && w.windowDays === windowDays)
      )
    );
    if (exists) {
      alert('You are already watching this route on that date.');
    } else {
      watches.push(newWatch);
      saveWatches(watches);
      // Re-render all watches (including the new one)
      renderAllWatches();
      // Clear the form
      form.reset();
    }
  });

  // 3) Fill in current year in footer
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});