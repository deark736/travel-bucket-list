// watches.js – front‐end logic for adding/removing flight watches, fetching prices, and drawing charts

import { getCheapestFlightPrice } from './flightApi.js';

const WATCHES_KEY = 'flightWatches'; // key under which we store an array of route objects

/**
 * Read the array of watches from localStorage
 * @returns {Array<Object>} each object: { origin, destination, date, currency }
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
 * Remove a watch by matching origin+destination+date exactly
 * @param {string} origin
 * @param {string} destination
 * @param {string} date
 */
function removeWatch(origin, destination, date) {
  let watches = getWatches();
  watches = watches.filter(
    (w) =>
      !(
        w.origin === origin &&
        w.destination === destination &&
        w.date === date
      )
  );
  saveWatches(watches);
  // Also remove the history key
  localStorage.removeItem(`history-${origin}-${destination}-${date}`);
}

/**
 * Append a price to the history array in localStorage under the key:
 *   history-ORIG-DEST-DATE
 * @param {string} origin
 * @param {string} destination
 * @param {string} date
 * @param {number} price
 * @returns {Array<number>} the updated history array
 */
function appendToHistory(origin, destination, date, price) {
  const key = `history-${origin}-${destination}-${date}`;
  const stored = localStorage.getItem(key);
  let history = stored ? JSON.parse(stored) : [];
  history.push(price);
  // Keep only the last 10 data points
  if (history.length > 10) history.shift();
  localStorage.setItem(key, JSON.stringify(history));
  return history;
}

/**
 * Build a single watch‐card DOM element and append it to #watches-container.
 * Also triggers a price fetch, updates history, and draws a Chart.js sparkline.
 *
 * @param {Object} watch - { origin, destination, date, currency }
 */
async function createWatchCard(watch) {
  const { origin, destination, date, currency } = watch;
  const card = document.createElement('div');
  card.className = 'watch-card';

  // 1) Remove Watch button (small × in top‐right)
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '×';
  removeBtn.className = 'remove-watch-btn';
  removeBtn.title = 'Remove this watch';
  removeBtn.setAttribute('aria-label', 'Remove this watch');
  removeBtn.addEventListener('click', () => {
    removeWatch(origin, destination, date);
    card.remove();
  });
  card.appendChild(removeBtn);

  // 2) Card Heading: origin→destination
  const heading = document.createElement('h3');
  heading.textContent = `${origin.toUpperCase()} → ${destination.toUpperCase()}`;
  card.appendChild(heading);

  // 3) Date and currency info
  const dateP = document.createElement('p');
  dateP.textContent = `Depart: ${date}`;
  card.appendChild(dateP);

  const currencyP = document.createElement('p');
  currencyP.textContent = `Currency: ${currency.toUpperCase()}`;
  card.appendChild(currencyP);

  // 4) Current price (placeholder while fetching)
  const priceP = document.createElement('p');
  priceP.className = 'watch-price';
  priceP.textContent = 'Fetching price...';
  card.appendChild(priceP);

  // 5) Canvas for Chart.js sparkline
  const canvas = document.createElement('canvas');
  canvas.className = 'watch-chart';
  // Give each canvas a unique ID so Chart.js can find it
  canvas.id = `chart-${origin}-${destination}-${date}`;
  card.appendChild(canvas);

  // 6) Append card to container, then fetch actual price
  const container = document.getElementById('watches-container');
  container.appendChild(card);

  try {
    // a) Fetch the latest cheapest price from the Amadeus API
    const price = await getCheapestFlightPrice(origin, destination, date, currency);
    priceP.textContent = `Price: ${price.toFixed(2)} ${currency.toUpperCase()}`;

    // b) Append price to history (max 10 entries)
    const history = appendToHistory(origin, destination, date, price);

    // c) Draw Chart.js sparkline
    drawSparkline(canvas.id, history, currency);

    // d) Add a subtle fade‐in for the card (CSS keyframes)
    card.style.animation = 'fadeIn 0.5s ease-out';
  } catch (err) {
    priceP.textContent = 'Error fetching price';
    console.error('Error in createWatchCard:', err);
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
    const newWatch = { origin, destination, date, currency: 'USD' };
    const watches = getWatches();
    // Avoid duplicate (same origin+dest+date)
    const exists = watches.some(
      (w) => w.origin === origin && w.destination === destination && w.date === date
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