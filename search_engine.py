"""
Search Engine Module - Serial Killers Knowledge Base
Implements text processing, inverted index with posting lists, and BM25 ranking.
"""

import json
import math
import re
import time
from collections import defaultdict
from pathlib import Path

# ─── Stop words ───────────────────────────────────────────────────────────────
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
    "during", "each", "few", "for", "from", "further", "get", "got", "had", "hadn't",
    "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's",
    "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how",
    "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
    "it", "it's", "its", "itself", "just", "let's", "me", "might", "more", "most",
    "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
    "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
    "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
    "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "will", "with", "won't",
    "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your",
    "yours", "yourself", "yourselves", "also", "been", "many", "much", "one", "two",
    "three", "well", "even", "may", "still", "since"
}

# ─── Simple stemmer (Porter-like suffix stripping) ────────────────────────────
def stem(word: str) -> str:
    """Simple suffix-stripping stemmer."""
    if len(word) <= 3:
        return word
    suffixes = [
        ("ational", "ate"), ("tional", "tion"), ("enci", "ence"),
        ("anci", "ance"), ("izer", "ize"), ("isation", "ize"),
        ("ization", "ize"), ("fulness", "ful"), ("ousness", "ous"),
        ("iveness", "ive"), ("ment", ""), ("ness", ""),
        ("ting", "t"), ("ing", ""), ("ies", "y"), ("ied", "y"),
        ("ers", ""), ("er", ""), ("ed", ""), ("ly", ""),
        ("es", ""), ("s", ""),
    ]
    for suffix, replacement in suffixes:
        if word.endswith(suffix) and len(word) - len(suffix) + len(replacement) >= 3:
            return word[:-len(suffix)] + replacement
    return word


# ─── Text processing pipeline ─────────────────────────────────────────────────
def tokenize(text: str) -> list[str]:
    """Tokenize, lowercase, remove stop words, and stem."""
    # Lowercase and extract word tokens
    tokens = re.findall(r'[a-z0-9]+', text.lower())
    # Remove stop words and apply stemming
    return [stem(t) for t in tokens if t not in STOP_WORDS and len(t) > 1]


# ─── Inverted Index ───────────────────────────────────────────────────────────
class InvertedIndex:
    """Inverted index with posting lists storing term frequencies per document."""

    def __init__(self):
        # term -> {doc_id: term_frequency}
        self.index: dict[str, dict[int, int]] = defaultdict(lambda: defaultdict(int))
        self.doc_lengths: dict[int, int] = {}     # doc_id -> number of tokens
        self.documents: dict[int, dict] = {}       # doc_id -> document data
        self.num_docs: int = 0
        self.avg_doc_length: float = 0.0
        self.vocabulary: set[str] = set()

    def add_document(self, doc_id: int, text: str, metadata: dict):
        """Index a single document."""
        tokens = tokenize(text)
        self.doc_lengths[doc_id] = len(tokens)
        self.documents[doc_id] = metadata

        for token in tokens:
            self.index[token][doc_id] += 1
            self.vocabulary.add(token)

        self.num_docs = len(self.documents)
        total_length = sum(self.doc_lengths.values())
        self.avg_doc_length = total_length / self.num_docs if self.num_docs > 0 else 0

    def get_posting_list(self, term: str) -> dict[int, int]:
        """Return posting list for a term: {doc_id: frequency}."""
        stemmed = stem(term.lower())
        return dict(self.index.get(stemmed, {}))

    def get_document_frequency(self, term: str) -> int:
        """Return the number of documents containing the term."""
        stemmed = stem(term.lower())
        return len(self.index.get(stemmed, {}))


# ─── BM25 Scoring ─────────────────────────────────────────────────────────────
class BM25:
    """BM25 ranking algorithm."""

    def __init__(self, index: InvertedIndex, k1: float = 1.5, b: float = 0.75):
        self.index = index
        self.k1 = k1
        self.b = b

    def _idf(self, term: str) -> float:
        """Compute inverse document frequency for a term."""
        df = self.index.get_document_frequency(term)
        if df == 0:
            return 0.0
        N = self.index.num_docs
        return math.log((N - df + 0.5) / (df + 0.5) + 1)

    def score(self, query: str) -> list[tuple[int, float]]:
        """Score all documents for a query. Returns sorted list of (doc_id, score)."""
        query_terms = tokenize(query)
        scores: dict[int, float] = defaultdict(float)

        for term in query_terms:
            idf = self._idf(term)
            posting_list = self.index.get_posting_list(term)

            for doc_id, tf in posting_list.items():
                dl = self.index.doc_lengths[doc_id]
                avgdl = self.index.avg_doc_length
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1 - self.b + self.b * (dl / avgdl))
                scores[doc_id] += idf * (numerator / denominator)

        # Sort by score descending
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return ranked


# ─── TF-IDF Scoring  ─────────────────
class TFIDF:
    """Basic TF-IDF scoring for reference."""

    def __init__(self, index: InvertedIndex):
        self.index = index

    def score(self, query: str) -> list[tuple[int, float]]:
        query_terms = tokenize(query)
        scores: dict[int, float] = defaultdict(float)

        for term in query_terms:
            df = self.index.get_document_frequency(term)
            if df == 0:
                continue
            idf = math.log(self.index.num_docs / df)
            posting_list = self.index.get_posting_list(term)

            for doc_id, tf in posting_list.items():
                dl = self.index.doc_lengths[doc_id]
                tf_normalized = tf / dl if dl > 0 else 0
                scores[doc_id] += tf_normalized * idf

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return ranked


# ─── Search Engine ──────────────────────────────────────
class SearchEngine:
    """Main search engine class."""

    def __init__(self, corpus_path: str = "corpus.json"):
        self.index = InvertedIndex()
        self.bm25 = BM25(self.index)
        self._load_corpus(corpus_path)

    def _load_corpus(self, path: str):
        """Load documents from corpus.json and index them."""
        corpus_file = Path(path)
        if not corpus_file.exists():
            raise FileNotFoundError(f"Corpus file not found: {path}")

        with open(corpus_file, "r", encoding="utf-8") as f:
            documents = json.load(f)

        for doc in documents:
            doc_id = doc["id"]
            text = f"{doc['title']} {doc['text']}"
            metadata = {
                "id": doc_id,
                "title": doc["title"],
                "text": doc["text"],
                "source": doc.get("source", ""),
                "category": doc.get("category", "General"),
                "country": doc.get("country", "Unknown"),
                "years_active": doc.get("years_active", ""),
                "proven_victims": doc.get("proven_victims", ""),
                "possible_victims": doc.get("possible_victims", ""),
            }
            self.index.add_document(doc_id, text, metadata)

    def search(self, query: str, top_k: int = 10) -> dict:
        """Execute a search query and return results with metadata."""
        start_time = time.perf_counter()
        ranked = self.bm25.score(query)
        elapsed = time.perf_counter() - start_time

        results = []
        for doc_id, score in ranked[:top_k]:
            doc = self.index.documents[doc_id]
            results.append({
                "id": doc["id"],
                "title": doc["title"],
                "text": doc["text"],
                "source": doc["source"],
                "category": doc["category"],
                "country": doc.get("country", "Unknown"),
                "years_active": doc.get("years_active", ""),
                "proven_victims": doc.get("proven_victims", ""),
                "possible_victims": doc.get("possible_victims", ""),
                "score": round(score, 4),
            })

        return {
            "query": query,
            "query_terms": tokenize(query),
            "num_results": len(results),
            "search_time_ms": round(elapsed * 1000, 2),
            "results": results,
        }

    def get_stats(self) -> dict:
        """Return index statistics."""
        return {
            "total_documents": self.index.num_docs,
            "vocabulary_size": len(self.index.vocabulary),
            "avg_document_length": round(self.index.avg_doc_length, 1),
            "categories": list(set(
                doc["category"] for doc in self.index.documents.values()
            )),
        }

    def get_suggestions(self, prefix: str, max_results: int = 8) -> list[str]:
        """Return vocabulary terms matching a prefix (for potential autocomplete)."""
        prefix = prefix.lower().strip()
        if len(prefix) < 2:
            return []
        matches = [t for t in self.index.vocabulary if t.startswith(prefix)]
        return sorted(matches)[:max_results]


# ─── Quick test ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    engine = SearchEngine()
    stats = engine.get_stats()
    print(f"Indexed {stats['total_documents']} documents")
    print(f"Vocabulary size: {stats['vocabulary_size']}")
    print(f"Avg doc length: {stats['avg_document_length']} tokens")
    print()

    test_queries = ["serial killer women", "murder chicago", "unidentified killer"]
    for q in test_queries:
        results = engine.search(q)
        print(f"Query: '{q}' — {results['num_results']} results in {results['search_time_ms']}ms")
        for r in results["results"][:3]:
            print(f"  [{r['score']}] {r['title']}")
        print()