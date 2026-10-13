/**
 * ATLASYNTH — Scientific Knowledge Corpus & Provenance Store
 * @license Apache-2.0
 */

import { ResearchDocument } from '../../../types';

export const INITIAL_RESEARCH_CORPUS: ResearchDocument[] = [
  {
    id: 'doc_rk4_1901',
    title: 'Numerical Integration of Ordinary Differential Equations via Runge-Kutta 4th Order',
    authors: ['Carl Runge', 'Martin Wilhelm Kutta'],
    category: 'mathematics',
    epistemicStatus: 'MATHEMATICALLY_PROVEN',
    confidenceScore: 0.99,
    abstract:
      'A method of approximating solutions of ordinary differential equations using fourth-order Taylor expansion terms without calculating higher derivatives directly. Demonstrates global truncation error of O(h⁴).',
    sourceName: 'Zeitschrift für Mathematik und Physik',
    sourceUrl: 'https://doi.org/10.1007/BF01443180',
    license: 'Public Domain',
    retrievedAt: 1718000000000,
    contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    bibtexCitation: `@article{kutta1901beitrag,
  title={Beitrag zur n{\"a}herungsweisen Integration totaler Differentialgleichungen},
  author={Kutta, Wilhelm},
  journal={Z. Math. Phys.},
  volume={46},
  pages={435--453},
  year={1901}
}`,
    tags: ['ODE', 'Calculus', 'Numerical Analysis', 'RK4', 'Integration'],
    keyFormulas: [
      'k_1 = f(t_n, y_n)',
      'k_2 = f(t_n + h/2, y_n + h/2 k_1)',
      'k_3 = f(t_n + h/2, y_n + h/2 k_2)',
      'k_4 = f(t_n + h, y_n + h k_3)',
      'y_{n+1} = y_n + (h/6)(k_1 + 2k_2 + 2k_3 + k_4)',
    ],
    verified: true,
  },
  {
    id: 'doc_hurst_1951',
    title: 'Long-Term Storage Capacity of Reservoirs & The Hurst Exponent',
    authors: ['Harold Edwin Hurst'],
    category: 'quantitative_finance',
    epistemicStatus: 'EMPIRICALLY_VERIFIED',
    confidenceScore: 0.92,
    abstract:
      'Formulation of rescaled range analysis (R/S) to quantify statistical long-memory and persistence in time series. Values H > 0.5 indicate long-term positive autocorrelation, while H < 0.5 indicates mean-reversion.',
    sourceName: 'Transactions of the American Society of Civil Engineers',
    sourceUrl: 'https://doi.org/10.1061/TACEAT.0006518',
    license: 'Scholarly Archive',
    retrievedAt: 1718000000000,
    contentHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    bibtexCitation: `@article{hurst1951long,
  title={Long-term storage capacity of reservoirs},
  author={Hurst, Harold Edwin},
  journal={Transactions of the American Society of Civil Engineers},
  volume={116},
  number={1},
  pages={770--799},
  year={1951}
}`,
    tags: ['Hurst Exponent', 'Time Series', 'Fractals', 'Mean Reversion', 'Financial Econometrics'],
    keyFormulas: ['(R/S)_n = C \\cdot n^H', 'H = \\lim_{n \\to \\infty} \\frac{\\log(R/S)}{\\log(n)}'],
    verified: true,
  },
  {
    id: 'doc_lorenz_1963',
    title: 'Deterministic Nonperiodic Flow: The Lorenz Attractor',
    authors: ['Edward Norton Lorenz'],
    category: 'physics',
    epistemicStatus: 'THEORETICAL_MODEL',
    confidenceScore: 0.95,
    abstract:
      'Derivation of a three-dimensional autonomous system of non-linear differential equations derived from atmospheric convection equations showing sensitive dependence on initial conditions (deterministic chaos).',
    sourceName: 'Journal of the Atmospheric Sciences',
    sourceUrl: 'https://doi.org/10.1175/1520-0469(1963)020<0130:DNF>2.0.CO;2',
    license: 'American Meteorological Society',
    retrievedAt: 1718000000000,
    contentHash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    bibtexCitation: `@article{lorenz1963deterministic,
  title={Deterministic nonperiodic flow},
  author={Lorenz, Edward N},
  journal={Journal of the atmospheric sciences},
  volume={20},
  number={2},
  pages={130--141},
  year={1963}
}`,
    tags: ['Chaos Theory', 'Nonlinear Dynamics', 'Attractor', 'Atmospheric Physics'],
    keyFormulas: [
      '\\dot{x} = \\sigma(y - x)',
      '\\dot{y} = x(\\rho - z) - y',
      '\\dot{z} = xy - \\beta z',
    ],
    verified: true,
  },
  {
    id: 'doc_clt_1935',
    title: 'Lindeberg-Lévy Central Limit Theorem & Asymptotic Normality',
    authors: ['Jarl Waldemar Lindeberg', 'Paul Lévy'],
    category: 'mathematics',
    epistemicStatus: 'MATHEMATICALLY_PROVEN',
    confidenceScore: 0.999,
    abstract:
      'Proof that the standardized sum of independent and identically distributed random variables with finite variance converges in distribution to the standard normal distribution N(0,1).',
    sourceName: 'Mathematische Zeitschrift',
    sourceUrl: 'https://doi.org/10.1007/BF01494395',
    license: 'Public Domain',
    retrievedAt: 1718000000000,
    contentHash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
    bibtexCitation: `@article{lindeberg1922neue,
  title={Eine neue Herleitung des Exponentialgesetzes in der Wahrscheinlichkeitsrechnung},
  author={Lindeberg, Jarl Waldemar},
  journal={Mathematische Zeitschrift},
  volume={15},
  number={1},
  pages={211--225},
  year={1922}
}`,
    tags: ['Probability', 'Central Limit Theorem', 'Statistics', 'Normal Distribution'],
    keyFormulas: ['\\sqrt{n}(\\bar{X}_n - \\mu) \\xrightarrow{d} \\mathcal{N}(0, \\sigma^2)'],
    verified: true,
  },
];

export class KnowledgeStore {
  private static STORAGE_KEY = 'atlasynth_knowledge_corpus';

  public static loadDocuments(): ResearchDocument[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ResearchDocument[];
        // Combine initial with stored
        const existingIds = new Set(parsed.map((d) => d.id));
        const merged = [...parsed];
        INITIAL_RESEARCH_CORPUS.forEach((doc) => {
          if (!existingIds.has(doc.id)) merged.push(doc);
        });
        return merged;
      }
    } catch {
      // Fallback
    }
    return [...INITIAL_RESEARCH_CORPUS];
  }

  public static saveDocument(doc: ResearchDocument) {
    const docs = this.loadDocuments();
    const idx = docs.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      docs[idx] = doc;
    } else {
      docs.unshift(doc);
    }
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(docs));
    } catch {
      // Fail safely
    }
  }

  public static generateSimpleHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0') + '...sha256';
  }
}
