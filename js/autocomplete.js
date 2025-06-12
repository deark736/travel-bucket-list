// autocomplete.js
let AIRPORTS = [];

// 1) Load the JSON once
fetch('../data/airports.json')
  .then(resp => resp.json())
  .then(data => { AIRPORTS = data; })
  .catch(err => console.error('Could not load airports.json', err));

// 2) Attaching autocomplete behavior
function setupAutocomplete(inputId, suggestionListId) {
  const input = document.getElementById(inputId);
  const suggestions = document.getElementById(suggestionListId);

  input.addEventListener('input', () => {
    const query = input.value.trim().toUpperCase();
    suggestions.innerHTML = '';

    if (query.length === 0) return;

    // Filter airports whose code or name matches
    const matches = AIRPORTS.filter(({ code, name }) =>
      code.startsWith(query) ||
      name.toUpperCase().includes(query)
    ).slice(0, 8); // show max 8 suggestions

    for (const { code, name } of matches) {
      const li = document.createElement('li');
      li.textContent = `${code} — ${name}`;
      li.addEventListener('click', () => {
        input.value = code;
        suggestions.innerHTML = '';
        input.focus();
      });
      suggestions.appendChild(li);
    }
  });

  // Close suggestions on blur
  input.addEventListener('blur', () => {
    setTimeout(() => { suggestions.innerHTML = ''; }, 100);
  });
}

// 3) Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setupAutocomplete('origin-input', 'origin-suggestions');
  setupAutocomplete('destination-input', 'destination-suggestions');
});