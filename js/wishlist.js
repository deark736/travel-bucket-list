// wishlist.js - handles wishlist storage and retrieval using localStorage

const WISHLIST_KEY = 'travelWishlist';

/**
 * Get the current wishlist from localStorage.
 * @returns {Array} Array of country objects.
 */
export function getWishlist() {
  const stored = localStorage.getItem(WISHLIST_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Save the wishlist array to localStorage.
 * @param {Array} wishlist - Array of country objects.
 */
export function saveWishlist(wishlist) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
}

/**
 * Add a country object to the wishlist.
 * Avoid duplicates by country name.
 * @param {Object} country - Country object to add.
 */
export function addToWishlist(country) {
  const wishlist = getWishlist();
  if (!wishlist.find(item => item.name.common === country.name.common)) {
    wishlist.push(country);
    saveWishlist(wishlist);
  }
}

/**
 * Remove a country by name from the wishlist.
 * @param {string} countryName - Common name of the country to remove.
 */
export function removeFromWishlist(countryName) {
  let wishlist = getWishlist();
  wishlist = wishlist.filter(item => item.name.common !== countryName);
  saveWishlist(wishlist);
}

/**
 * Clear the entire wishlist.
 */
export function clearWishlist() {
  localStorage.removeItem(WISHLIST_KEY);
}