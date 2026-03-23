"""
FastAPI Web Server for Serial Killers Search Engine
"""

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os

from search_engine import SearchEngine

# ─── Initialize ───────────────────────────────────────────────────────────────
app = FastAPI(title="Serial Killers Search Engine")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
corpus_path = os.path.join(BASE_DIR, "corpus.json")
engine = SearchEngine(corpus_path)

# Static files & templates
os.makedirs(os.path.join(BASE_DIR, "static"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "templates"), exist_ok=True)

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Serve the main search page."""
    stats = engine.get_stats()
    return templates.TemplateResponse("index.html", {
        "request": request,
        "stats": stats,
    })


@app.get("/api/search")
async def api_search(q: str = "", top_k: int = 10):
    """Search API endpoint."""
    if not q.strip():
        return {"query": "", "num_results": 0, "results": [], "search_time_ms": 0, "query_terms": []}
    results = engine.search(q.strip(), top_k=top_k)
    return results


@app.get("/api/stats")
async def api_stats():
    """Return index statistics."""
    return engine.get_stats()


@app.get("/api/suggest")
async def api_suggest(prefix: str = ""):
    """Return autocomplete suggestions."""
    if not prefix.strip():
        return {"suggestions": []}
    suggestions = engine.get_suggestions(prefix.strip())
    return {"suggestions": suggestions}


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)