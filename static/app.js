// ═══════════════════════════════════════════════════════════════════
// Serial Killers Search Engine — Frontend Logic
// Enhancement A: Term Highlighting
// ═══════════════════════════════════════════════════════════════════

const input     = document.getElementById('search-input');
const resultsSec = document.getElementById('results-section');
const resultsList = document.getElementById('results-list');
const resultsCount = document.getElementById('results-count');
const searchTime  = document.getElementById('search-time');
const hero        = document.getElementById('hero');

// ─── Trigger search on Enter ──────────────────────────────────────
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
});

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
    // Collapse hero
    hero.classList.add('collapsed');
    resultsSec.classList.remove('hidden');

    // Update stats
    searchTime.textContent = data.search_time_ms;
    resultsCount.textContent = `${data.num_results} result${data.num_results !== 1 ? 's' : ''} for "${data.query}"`;

    if (data.results.length === 0) {
        resultsList.innerHTML = `<div class="no-results"><span>🔍</span>No results found for "${escapeHtml(data.query)}"</div>`;
        return;
    }

    // Build the original query words (lowercased) for highlighting
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

    // Scroll to results
    resultsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── ENHANCEMENT A: Term Highlighting ─────────────────────────────
// Highlights all occurrences of query words (and their common forms)
// inside the text, wrapping them in <mark class="highlight">
function highlightText(text, queryWords) {
    if (!queryWords.length) return escapeHtml(text);

    let safe = escapeHtml(text);

    // Build expanded patterns: for each query word, also match simple
    // morphological variants (plural, -ing, -ed, -er, -ly, -tion)
    const patterns = queryWords.map(word => {
        // Escape regex special chars
        const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match the root word + common suffixes
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

// ─── Utility ──────────────────────────────────────────────────────
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}