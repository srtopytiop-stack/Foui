/**
 * ATLASYNTH — BM25 Lexical Search & Tokenizer
 * Local, deterministic full-text search engine for scientific knowledge corpus.
 * @license Apache-2.0
 */

export interface IndexableDoc {
  id: string;
  text: string;
}

export class BM25Engine {
  private k1 = 1.5;
  private b = 0.75;
  private docLengths: Map<string, number> = new Map();
  private avgDocLength = 0;
  private docFrequencies: Map<string, number> = new Map();
  private termFrequencies: Map<string, Map<string, number>> = new Map(); // term -> (docId -> count)
  private totalDocs = 0;

  constructor(docs: IndexableDoc[]) {
    this.buildIndex(docs);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);
  }

  private buildIndex(docs: IndexableDoc[]) {
    this.totalDocs = docs.length;
    let totalTokens = 0;

    for (const doc of docs) {
      const tokens = this.tokenize(doc.text);
      this.docLengths.set(doc.id, tokens.length);
      totalTokens += tokens.length;

      const seenTerms = new Set<string>();

      for (const token of tokens) {
        if (!this.termFrequencies.has(token)) {
          this.termFrequencies.set(token, new Map());
        }
        const docMap = this.termFrequencies.get(token)!;
        docMap.set(doc.id, (docMap.get(doc.id) || 0) + 1);

        seenTerms.add(token);
      }

      for (const term of seenTerms) {
        this.docFrequencies.set(term, (this.docFrequencies.get(term) || 0) + 1);
      }
    }

    this.avgDocLength = this.totalDocs > 0 ? totalTokens / this.totalDocs : 1;
  }

  public search(query: string): Array<{ id: string; score: number }> {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const scores: Map<string, number> = new Map();

    for (const term of queryTokens) {
      const df = this.docFrequencies.get(term) || 0;
      if (df === 0) continue;

      // Robertson-Sparck Jones IDF
      const idf = Math.log(1 + (this.totalDocs - df + 0.5) / (df + 0.5));
      const docMap = this.termFrequencies.get(term)!;

      for (const [docId, tf] of docMap.entries()) {
        const docLen = this.docLengths.get(docId) || this.avgDocLength;
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
        const termScore = idf * (numerator / denominator);

        scores.set(docId, (scores.get(docId) || 0) + termScore);
      }
    }

    return Array.from(scores.entries())
      .map(([id, score]) => ({ id, score: Number(score.toFixed(4)) }))
      .sort((a, b) => b.score - a.score);
  }
}
