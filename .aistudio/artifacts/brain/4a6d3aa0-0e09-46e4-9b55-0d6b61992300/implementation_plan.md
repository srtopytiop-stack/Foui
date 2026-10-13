# ATLASYNTH — Master Architecture & Implementation Plan

A unified, multi-disciplinary scientific computing, simulation, data research, and financial analysis laboratory designed with a mobile-first philosophy, open-source computational independence, strict safety isolation, and zero mandatory paid dependencies.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> This document represents Phase 1: Architecture & Design Specification only. No executable source files, GitHub modifications, deployments, or external executions will be initiated until the user reviews and confirms the architectural choices outlined below.

### Key Decisions Submitted for User Confirmation
1. **Runtime Execution Model for Mobile & Web**:
   - **Local Tier (Zero cost, mobile-capable)**: Core numerical computing, linear algebra, statistics, differential equations solvers, simulation kernels, local document search, and spot market analytics implemented in standard TypeScript/JavaScript using Web Workers and local IndexedDB/OPFS caching.
   - **Extended Tier (Optional server-side)**: Heavy symbolic mathematics, large-scale Monte Carlo, and C++/Python/Rust bindings via WebAssembly (Wasm) or an optional containerized local/remote runner.
2. **Deterministic Independence from LLMs**:
   - Every scientific formula, numerical calculation, backtesting algorithm, and statistical metric operates with 100% deterministic code.
   - External LLMs (e.g., Gemini) are strictly optional plugin advisory layers, completely decoupled from scientific calculations and verifiable truths.
3. **Binance Spot Lab Boundary**:
   - Strictly read-only against public REST/WebSocket endpoints (OHLCV, orderbook depth, 24hr tickers).
   - Zero trade execution, zero API keys with trade/withdraw scopes, zero automated order routing. Backtesting uses isolated event-driven simulation with realistic fee and slippage modeling.
4. **Mobile UX & Multilingual Design**:
   - Responsive Mobile-First PWA with seamless RTL/LTR toggle (Arabic & English), offline caching of computational engines, interactive scientific visualizations, and strict task lifecycle management (Queued, Running, Cancelled, Completed, Failed).

---

## 1. Product Requirements Document (PRD)

### 1.1 Target Personas
- **Scientific Researchers & Students**: Need mathematical modeling, differential equations, statistical tests, data exploration, and verified literature indexing on-the-go.
- **Engineers & Quantitative Analysts**: Require market regime analysis, OHLCV time-series simulation, backtesting without lookahead bias, and code validation.
- **Developers & Simulation Experimenters**: Need sandboxed code verification, deterministic compute, and reproducible research workflows.

### 1.2 Core Functions (V1 Scope)
1. **Mobile-First Responsive Interface (PWA)**:
   - Full bilingual support (العربية / English) with dynamic RTL/LTR layout transitions.
   - Ergonomic thumb-friendly navigation, workspace tabs, responsive canvas/SVG chart engines, and offline-first computation.
   - Comprehensive task manager displaying real-time execution telemetry (progress %, time elapsed, cancel button, idempotency key).
2. **Deterministic Scientific Computing Engine**:
   - Matrix operations, linear algebra solvers (LU, QR, SVD approximations), eigenvalues.
   - Numerical calculus (Runge-Kutta 4th order ODE solver, Simpson's integration, numerical differentiation).
   - Descriptive & inferential statistics (distributions, hypothesis testing, linear/polynomial regression, covariance).
   - Physical & engineering simulations (harmonic oscillator, projectile physics with drag, cellular automata, percolation models).
3. **Knowledge & Research Engine**:
   - Structured local document/note store with citation metadata, verifiable references, and full provenance tracking.
   - Dual-mode semantic/lexical indexing (BM25 + vector embeddings where supported, falling back gracefully to indexed full-text).
   - Explicit confidence scoring and uncertainty tags separating empirical data from analytical deductions.
4. **Programming & Experiment Engine**:
   - Sandboxed web-worker execution environment for reproducible mathematical scripts.
   - Diff viewer, parameter inspection, and explicit confirmation gate before execution.
5. **Binance Spot Research Lab**:
   - Public market data ingestion (public endpoints: `/api/v3/klines`, `/api/v3/ticker/24hr`, order book snapshots).
   - Multi-asset indicators (EMA, RSI, MACD, Bollinger Bands, ATR, Volatility Cones, Hurst Exponent).
   - Event-driven backtesting engine with zero lookahead bias, timestamp alignment, maker/taker fee schedules, and slippage simulation.
   - Visual market regime classification (trending, mean-reverting, high/low volatility).

### 1.3 Deferred & Out-of-Scope Items
- **Out of Scope (Permanent)**: Real trade execution, wallet management, deposit/withdrawal keys, guaranteed profit indicators.
- **Deferred to V2+**: Heavy distributed cluster computing, multi-node MPI simulation, deep neural network training on device.

---

## 2. Architecture Decision Record (ADR)

| Decision ID | Area | Options Evaluated | Chosen Approach | Rationale & Trade-offs |
|---|---|---|---|---|
| **ADR-001** | Frontend Framework | React 19 + TypeScript vs Svelte vs Vue | **React 19 + TypeScript + Vite + Tailwind CSS** | Matches workspace stack, delivers high modularity, broad ecosystem of math/charting libraries, and seamless PWA support. |
| **ADR-002** | Compute Architecture | Server-only vs Mobile-only vs Hybrid Tiered | **Hybrid Tiered (Client-authoritative Web Workers + optional local/cloud proxy)** | Enables zero-cost, fully offline scientific computing on mobile devices without server bills, while leaving a clean bridge for server-backed heavy workloads. |
| **ADR-003** | Data Storage | Cloud Firestore vs Client IndexedDB/OPFS vs PostgreSQL | **IndexedDB + LocalStorage (V1) with abstraction layer for SQLite/PostgreSQL** | Zero infrastructure cost, instant responsiveness on mobile, complete data privacy, no external account dependency. Clean repository interfaces allow swapping in Cloud SQL if requested later. |
| **ADR-004** | Market Data Ingestion | Private API Keys vs Direct Public Binance REST/WS | **Direct Public Binance REST & Public WebSocket Streams (CORS proxy mediated when in browser)** | Zero risk of account compromise, 100% free, reproducible data pipelines compliant with public rate limits (weight tracking). |
| **ADR-005** | Scientific Engine Implementation | Pure external Python vs In-engine TypeScript + Wasm | **Pure deterministic TypeScript algorithms with Web Workers (V1)** | Guarantees instant zero-install execution on mobile and desktop web browsers without requiring server-side Python containers or cold starts. |
| **ADR-006** | AI / LLM Integration | Compulsory Gemini pipeline vs Independent Plugin | **Strictly Optional Advisory Layer** | Scientific algorithms and calculations must be 100% correct and deterministic without reliance on probabilistic LLM responses. |

---

## 3. System Architecture & Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ATLASYNTH Presentation Layer                          │
│     Mobile-First PWA • Responsive RTL/LTR (العربية / English) • Dark/Light  │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Scientific Lab]    [Binance Spot Lab]    [Research & Docs]   [Task & Audit]│
│  - Math & Calculus   - Public Data Feeds   - Provenance Index  - Queue & Log│
│  - Numerical ODEs    - Multi-Asset Metrics - Citation Graph    - Idempotency│
│  - Physics Models    - Backtest Engine     - Uncertainty Scores- Resource Mon│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Task Dispatches & Queries
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ATLASYNTH Orchestration & Safety Gateway                     │
│  - Task Queue & Cancellation Tokens  - Rate Limiting & Weight Tracker       │
│  - Resource Bounds (Timeout/Memory)   - Audit Event Logger                  │
└──────────────────┬───────────────────┬───────────────────┬──────────────────┘
                   │                   │                   │
        Worker IPC │        Direct Call│         Fetch / WS│
                   ▼                   ▼                   ▼
┌───────────────────────┐ ┌─────────────────────────┐ ┌───────────────────────┐
│ Scientific Computing  │ │ Research & Knowledge    │ │ Binance Spot Research │
│ Engine (Web Worker)   │ │ Engine (IndexedDB/Cache)│ │ Connector & Engine    │
│ - Linear Algebra      │ │ - Document Corpus       │ │ - Public REST Klines  │
│ - ODE / Integrators   │ │ - Full-Text / BM25      │ │ - Public 24h Tickers  │
│ - Statistical Tests   │ │ - Source Citations      │ │ - Regime Detection    │
│ - Simulation Loops    │ │ - Semantic Hash Dedupe  │ │ - Event-driven Sim    │
└───────────────────────┘ └─────────────────────────┘ └───────────────────────┘
                   │                   │                   │
                   └───────────────────┼───────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Storage & Persistence Layer                        │
│   IndexedDB (Datasets, Runs, Notes) • LocalStorage (User Prefs, Theme, Lang)│
│   Export/Import JSON/CSV • Zero external tracking • 100% Local Privacy      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Repository Blueprint

```
src/
├── app/                        # Shell, navigation, layout, providers, theme, RTL
│   ├── layout/                 # Mobile bottom bar, desktop sidebar, header
│   └── state/                  # Global reactive state (theme, language, active task)
├── modules/                    # Isolated feature domains
│   ├── scientific-lab/         # Scientific Computing Module
│   │   ├── engines/            # Deterministic math, calculus, ODE, linear algebra
│   │   ├── simulations/        # Physics, mechanics, biological/chemical models
│   │   ├── workers/            # Dedicated Web Worker threads for numerical tasks
│   │   └── components/         # Interactive calculators, coordinate planes, charts
│   ├── binance-spot/           # Binance Spot Research Lab
│   │   ├── api/                # Public market data client & rate-limit regulator
│   │   ├── indicators/         # Technical & statistical indicator calculation
│   │   ├── backtest/           # Causally-sound event simulation & metrics
│   │   └── components/         # Interactive candlestick charts, regime heatmaps
│   ├── research-knowledge/     # Knowledge and Research Engine
│   │   ├── indexer/            # Document parser, citation linker, deduplicator
│   │   ├── storage/            # IndexedDB document repository
│   │   └── components/         # Research paper viewer, citation card, search
│   └── experiment-runner/      # Sandboxed Code & Experiment Engine
│       ├── sandbox/            # Web Worker evaluation with memory & time caps
│       └── components/         # Code editor, diff viewer, output console
├── core/                       # Shared system plumbing
│   ├── orchestrator/           # Task scheduling, idempotency, cancellation
│   ├── storage/                # IndexedDB adapter, export/import utilities
│   ├── units/                  # Dimensional analysis, scientific unit conversion
│   ├── i18n/                   # Arabic & English translation dictionaries
│   └── types/                  # Shared domain types, DTOs, and error contracts
```

---

## 5. Domain & Data Model

- **Task**: `{ id: string, domain: string, type: string, inputPayload: any, status: 'idle'|'queued'|'running'|'completed'|'failed'|'cancelled', progress: number, result?: any, error?: { code: string, message: string }, createdAt: number, startedAt?: number, finishedAt?: number, idempotencyKey: string }`
- **ScientificResult**: `{ calculationId: string, type: 'matrix'|'ode'|'stat'|'simulation', inputs: Record<string, any>, numericalOutputs: Record<string, any>, seriesData?: Array<{ x: number, y: number, label?: string }>, units?: string, executionTimeMs: number, precision: number }`
- **MarketCandle**: `{ openTime: number, open: number, high: number, low: number, close: number, volume: number, closeTime: number, quoteVolume: number, trades: number, isClosed: boolean }`
- **BacktestRun**: `{ runId: string, symbol: string, timeframe: string, startTs: number, endTs: number, initialCapital: number, finalCapital: number, totalTrades: number, winRate: number, profitFactor: number, maxDrawdown: number, sharpeRatio: number, trades: Array<any>, equityCurve: Array<{ time: number, equity: number }> }`
- **ResearchDocument**: `{ id: string, title: string, abstract: string, authors: string[], sourceUrl?: string, license?: string, tags: string[], retrievedAt: number, contentHash: string, notes?: string, verified: boolean }`

---

## 6. Security, Isolation, & Privacy

1. **Sandboxed Worker Execution**:
   - Numerical calculations run inside dedicated Web Workers with structured clone interfaces.
   - Workers cannot access cookies, localStorage, or DOM directly.
   - Execution timeouts (default 10s max per task) prevent infinite loops or UI freezing.
2. **Strict Financial Security**:
   - Zero private API key inputs or storage. No endpoints with `/order`, `/withdraw`, or secret signing.
   - All network calls are strictly read-only against Binance public REST/WS APIs.
3. **Data Sovereignty & Local Privacy**:
   - All scientific runs, notes, and backtests persist exclusively in client browser IndexedDB.
   - Zero analytics, zero tracking cookies, zero external telemetry.
   - Export/Import features provide complete data ownership (portable JSON/CSV).

---

## 7. Phased Development Roadmap

- **Phase 1: Architecture & Design Validation** (Current):
  - Comprehensive PRD, ADR, System Diagrams, and Verification Specifications. User review and explicit approval.
- **Phase 2: Core Infrastructure & Mobile UI Shell**:
  - Implement mobile-first layout with Arabic/English RTL/LTR switching, responsive navigation, dark/light scientific themes, and task orchestrator state.
- **Phase 3: Deterministic Scientific Computing Engine**:
  - Implement core numerical algorithms (Linear algebra, ODE Runge-Kutta 4, statistical tests, physics simulations) in background workers with unit tests.
- **Phase 4: Binance Spot Research Lab**:
  - Implement public data feeds, indicator pipelines, market regime analyzer, and causal backtest engine with zero lookahead bias.
- **Phase 5: Knowledge Engine & Experiment Sandbox**:
  - Implement research document repository, citation graph, verifiable notes, and sandboxed script runner with diff review.
- **Phase 6: Integration, Verification, & PWA Packaging**:
  - End-to-end testing, offline manifest, responsive polish, and documentation.
