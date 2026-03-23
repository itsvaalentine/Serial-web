# Serial Killers Search Engine 


## Enhancement: A — Term Highlighting
The search engine highlights matching query terms directly in the search results. When a user searches for a term, all occurrences of that term (including morphological variants like plurals and verb forms) are visually highlighted in both the document title and text. This makes it immediately clear *why* a document was returned and where the relevant information appears.

### How it works:
1. The backend returns the original query terms along with the search results.
2. The frontend JavaScript builds regular expressions from the query words, expanded with common suffix patterns to catch variants (e.g., searching "kill" also highlights "killer", "killers", "killing", "killed").
3. Each match is wrapped in a `<mark class="highlight">` tag with distinctive styling (red underline + red-tinted background).

## Tech Stack
- **Backend:** FastAPI (Python)
- **Search Engine:** Custom BM25 implementation (no external search libraries)
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Template Engine:** Jinja2

## How to Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/serial-web.git
cd serial-web

# 2. Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the server
python app.py

# 5. Open your browser
# Navigate to http://localhost:8000
```

## Project Structure
```
serial-killer-search-engine/
├── README.md              # This file
├── corpus.json            # 25 serial killer documents with sources
├── search_engine.py       # Text processing, inverted index, BM25
├── app.py                 # FastAPI web server
├── templates/
│   └── index.html         # Main search page template
├── static/
│   ├── style.css          # Dark theme styles
│   └── app.js             # Frontend logic + term highlighting
└── requirements.txt       # Python dependencies
```

## Corpus
- **25 documents** covering notorious serial killers from around the world
- Sources include: History.com, Britannica, Biography.com, Wikipedia, CBS News, Oxygen, FBI
- Categories: American, International, Unidentified


## Sample Queries
- `murder chicago` — Returns H.H. Holmes, John Wayne Gacy
- `unidentified killer` — Returns Jack the Ripper, Zodiac Killer, Monster of Florence
- `women victims` — Returns cases targeting female victims
- `poison hospital` — Returns medical serial killers like Donald Harvey
- `russian serial killer` — Returns Pichushkin and Chikatilo
