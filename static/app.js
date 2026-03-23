// ═══════════════════════════════════════════════════════════════════
// Serial Killers Search Engine — Frontend Logic
// Enhancement A: Term Highlighting + Autocomplete & Suggestions
// ═══════════════════════════════════════════════════════════════════

const input       = document.getElementById('search-input');
const resultsSec  = document.getElementById('results-section');
const resultsList = document.getElementById('results-list');
const resultsCount = document.getElementById('results-count');
const searchTime  = document.getElementById('search-time');
const hero        = document.getElementById('hero');
const searchBox   = document.getElementById('search-box');

// ─── Create autocomplete dropdown ─────────────────────────────────
const dropdown = document.createElement('div');
dropdown.className = 'autocomplete-dropdown';
dropdown.id = 'autocomplete-dropdown';
searchBox.parentNode.style.position = 'relative';
searchBox.insertAdjacentElement('afterend', dropdown);

let debounceTimer = null;
let activeIndex = -1;
let currentSuggestions = [];

// ─── Input events ─────────────────────────────────────────────────
input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const val = input.value.trim();
    if (val.length < 1) {
        hideDropdown();
        return;
    }
    debounceTimer = setTimeout(() => fetchSuggestions(val), 150);
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < currentSuggestions.length) {
            selectSuggestion(currentSuggestions[activeIndex]);
        } else {
            hideDropdown();
            doSearch();
        }
        return;
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, currentSuggestions.length - 1);
        renderDropdownHighlight();
        return;
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, -1);
        renderDropdownHighlight();
        return;
    }
    if (e.key === 'Escape') {
        hideDropdown();
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!searchBox.contains(e.target) && !dropdown.contains(e.target)) {
        hideDropdown();
    }
});

// ─── Fetch suggestions from API ───────────────────────────────────
async function fetchSuggestions(prefix) {
    try {
        const res = await fetch(`/api/suggest?prefix=${encodeURIComponent(prefix)}`);
        const data = await res.json();
        currentSuggestions = data.suggestions || [];
        activeIndex = -1;
        renderDropdown(prefix);
    } catch (err) {
        console.error('Suggestion fetch failed:', err);
    }
}

// ─── Render dropdown ──────────────────────────────────────────────
function renderDropdown(prefix) {
    if (currentSuggestions.length === 0) {
        hideDropdown();
        return;
    }

    const prefixLower = prefix.toLowerCase();
    dropdown.innerHTML = currentSuggestions.map((s, i) => {
        const isDoc = s.type === 'document';
        const icon = isDoc ? '📄' : '🔍';
        const text = highlightPrefix(s.text, prefixLower);
        const meta = isDoc
            ? `<span class="ac-meta">${escapeHtml(s.country || '')}${s.victims ? ' · ' + s.victims + ' victims' : ''}</span>`
            : '';
        return `<div class="ac-item${i === activeIndex ? ' ac-active' : ''}" data-index="${i}" onmousedown="selectSuggestionByIndex(${i})">
            <span class="ac-icon">${icon}</span>
            <div class="ac-content">
                <span class="ac-text">${text}</span>
                ${meta}
            </div>
        </div>`;
    }).join('');

    dropdown.classList.add('visible');
}

function renderDropdownHighlight() {
    const items = dropdown.querySelectorAll('.ac-item');
    items.forEach((el, i) => {
        el.classList.toggle('ac-active', i === activeIndex);
    });
}

function highlightPrefix(text, prefix) {
    const idx = text.toLowerCase().indexOf(prefix);
    if (idx === -1) return escapeHtml(text);
    const before = escapeHtml(text.slice(0, idx));
    const match = escapeHtml(text.slice(idx, idx + prefix.length));
    const after = escapeHtml(text.slice(idx + prefix.length));
    return `${before}<strong>${match}</strong>${after}`;
}

function selectSuggestion(suggestion) {
    input.value = suggestion.text;
    hideDropdown();
    doSearch();
}

// Global function for inline onclick
window.selectSuggestionByIndex = function(index) {
    if (index >= 0 && index < currentSuggestions.length) {
        selectSuggestion(currentSuggestions[index]);
    }
};

function hideDropdown() {
    dropdown.classList.remove('visible');
    dropdown.innerHTML = '';
    currentSuggestions = [];
    activeIndex = -1;
}

// ─── Suggested queries (chips) ────────────────────────────────────
async function loadPopularQueries() {
    try {
        const res = await fetch('/api/popular');
        const data = await res.json();
        const container = document.getElementById('suggested-queries');
        if (!container || !data.queries) return;
        container.innerHTML = data.queries.map(q =>
            `<button class="query-chip" onclick="searchFromChip('${escapeAttr(q)}')">${escapeHtml(q)}</button>`
        ).join('');
    } catch (err) {
        console.error('Failed to load popular queries:', err);
    }
}

window.searchFromChip = function(query) {
    input.value = query;
    doSearch();
};

// Load on page init
loadPopularQueries();

// ─── Main search function ─────────────────────────────────────────
async function doSearch() {
    const query = input.value.trim();
    if (!query) return;

    try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        renderResults(data);
    } catch (err) {
        console.error('Search failed:', err);
        resultsList.innerHTML = `<div class="no-results"><span>⚠️</span>Search request failed. Please try again.</div>`;
        resultsSec.classList.remove('hidden');
    }
}

// ─── Render results ───────────────────────────────────────────────
function renderResults(data) {
    hero.classList.add('collapsed');
    resultsSec.classList.remove('hidden');

    searchTime.textContent = data.search_time_ms;
    resultsCount.textContent = `${data.num_results} result${data.num_results !== 1 ? 's' : ''} for "${data.query}"`;

    if (data.results.length === 0) {
        resultsList.innerHTML = `<div class="no-results"><span>🔍</span>No results found for "${escapeHtml(data.query)}"</div>`;
        return;
    }

    const queryWords = data.query.toLowerCase().split(/\s+/).filter(w => w.length > 1);

    resultsList.innerHTML = data.results.map((r, i) => `
        <div class="result-card" style="animation-delay: ${i * 0.05}s">
            <div class="result-top-row">
                <div class="result-title">${highlightText(r.title, queryWords)}</div>
                <div class="result-meta">
                    <span class="result-category">${escapeHtml(r.category)}</span>
                    <span class="result-score">${r.score.toFixed(4)}</span>
                </div>
            </div>
            <div class="result-details">
                ${r.country ? `<span class="detail-chip">📍 ${escapeHtml(r.country)}</span>` : ''}
                ${r.years_active ? `<span class="detail-chip">📅 ${escapeHtml(r.years_active)}</span>` : ''}
                ${r.proven_victims ? `<span class="detail-chip">⚠️ ${escapeHtml(r.proven_victims)} proven victims${r.possible_victims ? ' (' + escapeHtml(r.possible_victims) + ' possible)' : ''}</span>` : ''}
            </div>
            <div class="result-text">${highlightText(r.text, queryWords)}</div>
            <div class="result-source">
                Source: <a href="${escapeHtml(r.source)}" target="_blank" rel="noopener">${escapeHtml(r.source)}</a>
            </div>
        </div>
    `).join('');

    resultsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── ENHANCEMENT A: Term Highlighting ─────────────────────────────
function highlightText(text, queryWords) {
    if (!queryWords.length) return escapeHtml(text);

    let safe = escapeHtml(text);

    const patterns = queryWords.map(word => {
        const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return `${esc}[a-z]*`;
    });

    const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
    safe = safe.replace(regex, '<mark class="highlight">$1</mark>');

    return safe;
}

// ─── Reset ────────────────────────────────────────────────────────
function resetSearch() {
    hero.classList.remove('collapsed');
    resultsSec.classList.add('hidden');
    resultsList.innerHTML = '';
    input.value = '';
    searchTime.textContent = '—';
    input.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Utilities ────────────────────────────────────────────────────
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}