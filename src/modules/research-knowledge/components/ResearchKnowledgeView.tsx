/**
 * ATLASYNTH — Research & Knowledge Hub Interactive View
 * Provenance tracking, BM25 semantic search, and epistemic confidence scoring.
 * @license Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { translations } from '../../../core/i18n/translations';
import { EpistemicStatus, Language, ResearchDocument } from '../../../types';
import { BM25Engine } from '../indexer/bm25';
import { KnowledgeStore } from '../storage/knowledgeStore';

interface Props {
  lang: Language;
}

export const ResearchKnowledgeView: React.FC<Props> = ({ lang }) => {
  const t = translations[lang];

  const [documents, setDocuments] = useState<ResearchDocument[]>(() =>
    KnowledgeStore.loadDocuments()
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Note Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newAuthors, setNewAuthors] = useState<string>('');
  const [newAbstract, setNewAbstract] = useState<string>('');
  const [newCategory, setNewCategory] = useState<any>('mathematics');
  const [newStatus, setNewStatus] = useState<EpistemicStatus>('MATHEMATICALLY_PROVEN');
  const [newConfidence, setNewConfidence] = useState<number>(0.95);
  const [newSource, setNewSource] = useState<string>('');
  const [newTags, setNewTags] = useState<string>('');

  // BM25 Search Index
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return documents;

    const bm25Docs = documents.map((d) => ({
      id: d.id,
      text: `${d.title} ${d.abstract} ${d.authors.join(' ')} ${d.tags.join(' ')} ${
        d.keyFormulas?.join(' ') || ''
      }`,
    }));

    const engine = new BM25Engine(bm25Docs);
    const scored = engine.search(searchQuery);
    const scoreMap = new Map(scored.map((s) => [s.id, s.score]));

    return documents
      .filter((d) => scoreMap.has(d.id))
      .sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));
  }, [searchQuery, documents]);

  const filteredDocs = useMemo(() => {
    if (selectedCategory === 'all') return searchResults;
    return searchResults.filter((d) => d.category === selectedCategory);
  }, [searchResults, selectedCategory]);

  const handleCopyBibtex = (doc: ResearchDocument) => {
    navigator.clipboard.writeText(doc.bibtexCitation);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAbstract.trim()) return;

    const id = 'doc_usr_' + Math.random().toString(36).substring(2, 9);
    const authorsArr = newAuthors
      ? newAuthors.split(',').map((a) => a.trim())
      : ['ATLASYNTH Researcher'];
    const tagsArr = newTags ? newTags.split(',').map((t) => t.trim()) : ['Research'];

    const newDoc: ResearchDocument = {
      id,
      title: newTitle,
      authors: authorsArr,
      abstract: newAbstract,
      category: newCategory,
      epistemicStatus: newStatus,
      confidenceScore: newConfidence,
      sourceName: newSource || 'ATLASYNTH Internal Lab Note',
      license: 'Creative Commons BY-NC 4.0',
      retrievedAt: Date.now(),
      contentHash: KnowledgeStore.generateSimpleHash(newTitle + newAbstract),
      bibtexCitation: `@misc{${id},
  title={${newTitle}},
  author={${authorsArr.join(' and ')}},
  year={${new Date().getFullYear()}},
  note={ATLASYNTH Computational Lab}
}`,
      tags: tagsArr,
      verified: true,
    };

    KnowledgeStore.saveDocument(newDoc);
    setDocuments(KnowledgeStore.loadDocuments());
    setShowAddModal(false);

    // Reset Form
    setNewTitle('');
    setNewAuthors('');
    setNewAbstract('');
    setNewSource('');
    setNewTags('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              {t.researchHubTitle}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{t.researchSubtitle}</p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold px-3 py-1.5 rounded-lg text-xs md:text-sm flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" />
            {t.addResearchNote}
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-xs md:text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto scrollbar-none bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
            {['all', 'mathematics', 'physics', 'quantitative_finance', 'computer_science'].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md font-medium capitalize whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-cyan-500 text-zinc-950 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat === 'quantitative_finance' ? 'Quant Finance' : cat}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Document Feed Cards */}
      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400 text-xs">
            No research papers or notes found matching your search.
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-3.5 hover:border-zinc-700 transition"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm md:text-base font-semibold text-zinc-100">
                    {doc.title}
                  </h4>
                  {doc.verified && (
                    <span title="Verified Citation">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    </span>
                  )}
                </div>

                {/* Epistemic Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                      doc.epistemicStatus === 'MATHEMATICALLY_PROVEN'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : doc.epistemicStatus === 'EMPIRICALLY_VERIFIED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : doc.epistemicStatus === 'THEORETICAL_MODEL'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {doc.epistemicStatus === 'MATHEMATICALLY_PROVEN'
                      ? t.epistemicProven
                      : doc.epistemicStatus === 'EMPIRICALLY_VERIFIED'
                      ? t.epistemicEmpirical
                      : doc.epistemicStatus === 'THEORETICAL_MODEL'
                      ? t.epistemicTheoretical
                      : t.epistemicApprox}
                  </span>
                </div>
              </div>

              {/* Authors & Source metadata */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 font-mono">
                <span>By: {doc.authors.join(', ')}</span>
                <span>• Source: {doc.sourceName}</span>
                <span>• License: {doc.license}</span>
              </div>

              {/* Abstract */}
              <p className="text-xs md:text-sm text-zinc-300/90 leading-relaxed font-sans">
                {doc.abstract}
              </p>

              {/* Key Formulas Section */}
              {doc.keyFormulas && doc.keyFormulas.length > 0 && (
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 space-y-1">
                  <span className="text-[11px] font-mono text-cyan-400 font-semibold block">
                    Core Mathematical Formulation:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {doc.keyFormulas.map((formula, fi) => (
                      <code
                        key={fi}
                        className="bg-zinc-900 px-2 py-1 rounded text-xs font-mono text-zinc-200 border border-zinc-800"
                      >
                        {formula}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence Bar & Actions Strip */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-zinc-800/80 text-xs">
                {/* Confidence bar */}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-[11px]">{t.confidenceScore}:</span>
                  <div className="w-24 bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${doc.confidenceScore * 100}%` }}
                      className="bg-cyan-500 h-full rounded-full"
                    />
                  </div>
                  <span className="font-mono text-zinc-200 font-bold text-[11px]">
                    {(doc.confidenceScore * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-zinc-500" title="Content Digest">
                    SHA: {doc.contentHash.substring(0, 14)}...
                  </span>

                  {doc.sourceUrl && (
                    <a
                      href={doc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-cyan-400 p-1"
                      title="Open Source Document"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => handleCopyBibtex(doc)}
                    className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded border border-zinc-700 text-[11px] transition"
                  >
                    {copiedId === doc.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        {t.copied}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        {t.bibtexFormat}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Add Research Document Modal ───────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              {t.addResearchNote}
            </h3>

            <form onSubmit={handleCreateDocument} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Asymptotic Proof of Runge-Kutta"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Authors (comma-separated)</label>
                <input
                  type="text"
                  value={newAuthors}
                  onChange={(e) => setNewAuthors(e.target.value)}
                  placeholder="e.g. Carl Gauss, Bernhard Riemann"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="mathematics">Mathematics</option>
                    <option value="physics">Physics</option>
                    <option value="quantitative_finance">Quantitative Finance</option>
                    <option value="computer_science">Computer Science</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Epistemic Status</label>
                  <select
                    value={newStatus}
                    onChange={(e: any) => setNewStatus(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MATHEMATICALLY_PROVEN">Proven Theorem</option>
                    <option value="EMPIRICALLY_VERIFIED">Empirically Grounded</option>
                    <option value="THEORETICAL_MODEL">Theoretical Model</option>
                    <option value="NUMERICAL_APPROXIMATION">Numerical Approximation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Abstract / Key Formulation *</label>
                <textarea
                  rows={3}
                  required
                  value={newAbstract}
                  onChange={(e) => setNewAbstract(e.target.value)}
                  placeholder="Detailed scientific explanation, bounding conditions, and verified equations..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Source Name / Publication</label>
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="e.g. arXiv:2401.12345 or Physical Review Letters"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold rounded"
                >
                  {t.confirm}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
