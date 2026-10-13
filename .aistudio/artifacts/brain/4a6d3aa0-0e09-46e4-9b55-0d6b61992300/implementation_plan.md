# ATLASYNTH 2.0 — Universal Scientific, Computational & Market Intelligence Lab
## Master Architecture, Research and Development Plan

---

## User Review & Critical Decisions

> [!IMPORTANT]
> This master document specifies Phase 0: Design & Architectural Specification for ATLASYNTH 2.0. No implementation files, GitHub commits, cloud provisioning, or trade execution routes will be created until explicit confirmation of this document.

### Core Architecture Pillars Submitted for Approval
1. **Zero Mandatory Paid Dependency & Local-First Engine**:
   - The primary computational lab, scientific modules, local full-text search, market data collectors, and causal backtesting operate on local client compute (Web Workers / local runtime) at **$0.00 cost**.
   - Gemini LLM is purely an optional plug-in advisory layer (hypothesis formulation, paper summarization) with strict decoupling from numerical truth.
2. **Read-Only Binance Spot Market Intelligence**:
   - Strictly restricted to public REST (`/api/v3/*`) and WebSocket streams.
   - Zero private API keys, zero order routing, zero withdrawal or trade capabilities. Backtesting is 100% causal with strict zero-lookahead bias guarantees.
3. **Specialized Multi-Agent Framework**:
   - Distinct bounded agents with least-privilege contracts, audit trails, and deterministic baseline comparisons.
4. **Rigorous Statistical Validation & Overfitting Prevention**:
   - Integration of Walk-Forward validation, Out-Of-Sample (OOS) testing, Deflated Sharpe Ratio (DSR), Probability of Backtest Overfitting (PBO), and Combinatorial Purged Cross-Validation principles.
5. **Multi-Disciplinary Scientific Computing Architecture**:
   - Progressive expansion contracts for linear algebra, calculus, dynamical systems, probability distributions, spectral analysis, physics, chemistry, and systems engineering.

---

## 1. Product Requirements Document (PRD)

- **Vision**: An industrial-grade, reproducible scientific and market research workbench engineered for mobile ergonomics, transparent data provenance, and deterministic execution.
- **Target Personas**: Researchers, quantitative systems engineers, data scientists, and computational experimentalists.
- **Core Modules**:
  1. *Scientific Computing Engine*: Linear algebra, ODEs, numerical calculus, statistics, dynamical systems.
  2. *Data Platform*: Batch import/export, schema validation, deduplication, incremental updates, time-series cache.
  3. *Knowledge & Research Graph*: Citation networks (OpenAlex / Semantic Scholar connectors), BM25 indexing, epistemic status, BibTeX citations.
  4. *Code & Experiment Lab*: Sandboxed script runner, time-bounded CPU execution, reproducible run logging (code version, seed, data hash).
  5. *Full-Market Spot Intelligence*: Multi-asset screening, order book microstructure, regime classification, scenario modeling, opportunity ranking.
  6. *Multi-Agent Orchestrator*: Bounded collaborative agents with explicit tool contracts and diff review.
- **Explicit Non-Goals**:
  - No live trading, no wallet management, no black-box signal claiming guaranteed returns, no proprietary lock-in.

---

## 2. System Architecture & Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ATLASYNTH 2.0 Presentation Layer (Mobile-First)             │
│        React 19 • TypeScript • Tailwind CSS • Responsive RTL/LTR PWA        │
├──────────────────┬──────────────────┬──────────────────┬────────────────────┤
│ Scientific Lab   │ Market Intel Lab │ Knowledge Graph  │ Experiment Runner  │
│ - Math & Calculus│ - Multi-Pair Scan│ - OpenAlex/Scholar- Sandboxed Code    │
│ - ODE Simulators │ - Microstructure │ - Citation Graph │ - Diff & Baseline  │
│ - Physics & Bio  │ - Regimes & Rank │ - Provenance Hash│ - Agent Collab     │
└──────────────────┴─────────┬────────┴──────────────────┴────────────────────┘
                             │ Dispatches Tasks & RPC Contracts
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Agent Orchestration & Security Gateway                      │
│ - Task Queue & Cancellation Tokens  - Rate Limit & Weight Monitor          │
│ - Epistemic Consensus Arbiter       - Audit Trail & Idempotency Store       │
└───────┬────────────────────┬────────────────────┬────────────────────┬──────┘
        │                    │                    │                    │
        ▼                    ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Scientific  │     │ Market Intel │     │  Knowledge   │     │  Experiment  │
│   Compute    │     │  Collector   │     │  & Research  │     │   Sandbox    │
│ (Web Worker) │     │ (Public REST)│     │  (BM25/Graph)│     │(Worker Limit)│
└───────┬──────┘     └───────┬──────┘     └───────┬──────┘     └───────┬──────┘
        │                    │                    │                    │
        └────────────────────┴──────────┬─────────┴────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Persistence & Provenance Storage Layer                   │
│   IndexedDB (Datasets, Runs, Notes) • OPFS / LocalStorage • JSON/CSV Export │
│   Immutable Raw Data Store • Derived Feature Cache • Experiment Reproducibility│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Reference Project Comparison Matrix

| Project | Reference Principle / Concept | Proposed ATLASYNTH 2.0 Implementation | License & Dependencies |
|---|---|---|---|
| **Freqtrade** | Data download CLI, indicator caching, backtest reporting | Public Binance REST/WS collectors, causal backtest simulator with maker/taker fee modeling | GPLv3 (Inspiration / clean-room TypeScript) |
| **QuantDinger / OpenAlgo** | Standardized tool interfaces, strategy abstraction | Safe Connector Framework with strictly read-only market data contracts (No order execution) | MIT / Apache 2.0 |
| **Microsoft Qlib** | Information-leakage-free data handling, model evaluation | Strict timestamp-aligned splits, Walk-Forward validation, Deflated Sharpe Ratio calculation | MIT |
| **FinRL** | Environment modeling, regime-aware state representation | Discrete market regime classification (Trending, Mean-Reverting, High Volatility, Low Volatility) | MIT |
| **QuantConnect LEAN** | Event-driven causal simulation, realistic slippage & fee modeling | Deterministic bar-by-bar queue simulation where bar $t$ fill occurs at close $t$ or open $t+1$ | Apache 2.0 |
| **Autoresearch** | Automated hypothesis generation, benchmark baseline comparison | Experiment runner with structured hypothesis card, run diffs, and parameter bounds | MIT |
| **OpenAlex / Semantic Scholar** | Scholarly metadata, citation trees, open academic APIs | Read-only connectors for paper abstracts, authors, DOIs, and BibTeX citation formatting | Open APIs / CC0 |

---

## 4. Multi-Agent Orchestration & Contracts

- **Planning Agent**: Breaks research questions into directed acyclic task graphs (DAGs).
- **Math & Science Agent**: Verifies analytical equations, solves ODEs, and checks dimensional units.
- **Data Agent**: Ingests, validates, cleans, deduplicates, and caches time-series and datasets.
- **Market Intel Agent**: Executes multi-pair scans, regime classification, and causal backtests.
- **Code Review & Security Agent**: Inspects code diffs, verifies memory/timeout constraints, and blocks unsafe access.
- **Adversarial / Critique Agent**: Actively probes hypotheses for overfitting, lookahead leaks, and sample bias.
- **Synthesis Agent**: Generates structured, reproducible research reports with uncertainty tags.

---

## 5. Statistical Validation & Anti-Overfitting Safeguards

1. **Causal Time Ordering**: Index $i$ decisions depend solely on indices $\le i$.
2. **Deflated Sharpe Ratio (DSR)**: Adjusts Sharpe ratio downwards based on the number of strategy trials and non-normal return distributions (skewness/kurtosis).
3. **Probability of Backtest Overfitting (PBO)**: Combinatorially evaluates historical partitions to estimate the likelihood that the chosen strategy is an overfit artifact.
4. **Walk-Forward Analysis**: Anchored and rolling train/validation/test partitions ensuring parameter stability across distinct regimes.

---

## 6. Phased Roadmap (Phase 0 to Phase 13+)

- **Phase 0**: Architecture, Design Documentation, ADRs, PRD, and User Approval (Current).
- **Phase 1**: Core Shell, Mobile Ergonomics, Task Orchestration, and Audit Gateway.
- **Phase 2**: Data Platform, Local IndexedDB Storage, and Export/Import Engine.
- **Phase 3**: Advanced Scientific Computing (Linear Algebra, RK4, Multi-variable Calculus, Statistics).
- **Phase 4**: Knowledge Network (BM25, Academic Connectors, BibTeX, Epistemic Tags).
- **Phase 5**: Physical, Dynamical, and Biological Numerical Simulations.
- **Phase 6**: Experiment Runner & Collaborative Agent Orchestrator.
- **Phase 7**: Binance Spot Public Historical Data Aggregator (Batch download, gap detection).
- **Phase 8**: Full-Market Screening & Multi-Timeframe Regime Classifier.
- **Phase 9**: Scenario Analysis & Multi-Factor Opportunity Ranking Engine.
- **Phase 10**: Advanced Statistical Validation (DSR, PBO, Walk-Forward Engine).
- **Phase 11**: Mobile PWA Performance Optimization & Offline Synchronization.
- **Phase 12**: Security Hardening, Audit Verification, and Comprehensive Documentation.
- **Phase 13+**: Expansion Modules (Chemistry, Control Theory, Advanced Astrophysics).
