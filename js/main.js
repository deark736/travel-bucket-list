
// main.js – ties together API and wishlist logic, handles DOM interactions

import { getCountryByName, getRandomCountry, getExchangeRate } from './api.js';
import { getWishlist, addToWishlist, removeFromWishlist, clearWishlist } from './wishlist.js';

// Helper to create country card HTML
function createCountryCard(country, rate) {
  const card = document.createElement('div');
  card.className = 'country-card';

  // ----- Flag Image -----
  const flagImg = document.createElement('img');
  flagImg.src = country.flags.svg || country.flags.png;
  flagImg.alt = `Flag of ${country.name.common}`;
  card.appendChild(flagImg);

  // ----- Country Info List -----
  const infoList = document.createElement('ul');
  infoList.className = 'country-info';
  const currencyCode = Object.keys(country.currencies)[0];
  const rateText = rate
    ? `1 USD = ${rate.toFixed(2)} ${currencyCode}`
    : 'N/A';
  const fields = [
    ['Name', country.name.common],
    ['Capital', country.capital ? country.capital[0] : 'N/A'],
    ['Population', country.population.toLocaleString()],
    ['Region', country.region],
    ['Currency', rateText]
  ];
  fields.forEach(([label, value]) => {
    const li = document.createElement('li');
    li.textContent = `${label}: ${value}`;
    infoList.appendChild(li);
  });
  card.appendChild(infoList);

  // ----- Add or Remove Button -----
  const btn = document.createElement('button');
  const wishlist = getWishlist();
  const inWishlist = wishlist.some(item => item.name.common === country.name.common);

  if (inWishlist && document.getElementById('wishlist-container')) {
    // wishlist.html: small “×” in top-right (absolute is fine there)
    btn.textContent = '×';
    btn.className = 'remove-btn';
    btn.title = 'Remove from Wishlist';
    btn.setAttribute('aria-label', 'Remove from Wishlist');

    btn.addEventListener('click', () => {
      removeFromWishlist(country.name.common);
      card.remove();
    });

  } else {
    // index.html, handle both add/remove in the same spot
    if (inWishlist) {
      btn.textContent = 'Remove from Wishlist';
      btn.className = 'remove-full-btn';
      btn.title = 'Remove from Wishlist';
      btn.setAttribute('aria-label', 'Remove from Wishlist');
    } else {
      btn.textContent = 'Add to Wishlist';
      btn.className = 'add-btn';
      btn.title = 'Add to Wishlist';
      btn.setAttribute('aria-label', 'Add to Wishlist');
    }

    btn.addEventListener('click', () => {
      if (btn.classList.contains('add-btn')) {
        // Switch to “Remove from Wishlist”
        addToWishlist(country);
        btn.textContent = 'Remove from Wishlist';
        btn.className = 'remove-full-btn';
        btn.title = 'Remove from Wishlist';
        btn.setAttribute('aria-label', 'Remove from Wishlist');
      } else {
        // Switch back to “Add to Wishlist”
        removeFromWishlist(country.name.common);
        btn.textContent = 'Add to Wishlist';
        btn.className = 'add-btn';
        btn.title = 'Add to Wishlist';
        btn.setAttribute('aria-label', 'Add to Wishlist');
      }
    });
  }

  card.appendChild(btn);
  return card;
}

// Display country details in results section
async function displayCountry(name) {
  try {
    const country = await getCountryByName(name);
    const currencyCode = Object.keys(country.currencies)[0];
    const rate = await getExchangeRate(currencyCode);
    const resultsSection = document.getElementById('results-section');
    resultsSection.innerHTML = ''; // clear previous
    const card = createCountryCard(country, rate);
    resultsSection.appendChild(card);
  } catch (err) {
    alert(err.message);
  }
}

// Display random country
async function displayRandomCountry() {
  try {
    const country = await getRandomCountry();
    const currencyCode = Object.keys(country.currencies)[0];
    const rate = await getExchangeRate(currencyCode);
    const resultsSection = document.getElementById('results-section');
    resultsSection.innerHTML = '';
    const card = createCountryCard(country, rate);
    resultsSection.appendChild(card);
  } catch (err) {
    alert(err.message);
  }
}

// Initialize search and random buttons on index.html
function initIndexPage() {
  const form = document.getElementById('search-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('country-input').value.trim();
    if (name) displayCountry(name);
  });

  const randomBtn = document.getElementById('random-btn');
  randomBtn.addEventListener('click', () => {
    displayRandomCountry();
  });
}

// Initialize wishlist page display
function initWishlistPage() {
  const container = document.getElementById('wishlist-container');
  const wishlist = getWishlist();
  container.innerHTML = '';
  wishlist.forEach(country => {
    const currencyCode = Object.keys(country.currencies)[0];
    getExchangeRate(currencyCode).then(rate => {
      const card = createCountryCard(country, rate);
      container.appendChild(card);
    });
  });

  const clearBtn = document.getElementById('clear-wishlist-btn');
  clearBtn.addEventListener('click', () => {
    clearWishlist();
    container.innerHTML = '';
  });
}

// Determine page and initialize accordingly
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('search-section')) {
    initIndexPage();
  }
  if (document.getElementById('wishlist-section')) {
    initWishlistPage();
  }

  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});