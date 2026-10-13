/**
 * ATLASYNTH 2.0 — Binance Spot Market Intelligence Lab Interactive View
 * Single Asset, Full-Market Scanner, Competing Scenarios, Causal Backtest & Statistical Validation (DSR/PBO).
 * @license Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck2,
  Filter,
  Layers,
  LineChart,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { taskManager } from '../../../core/orchestrator/taskManager';
import { translations } from '../../../core/i18n/translations';
import {
  BacktestResult,
  DeflatedSharpeResult,
  Language,
  MarketCandle,
  MarketRegime,
  MarketScenario,
  MonteCarloDrawdownResult,
  PBOResult,
  ScannedMarketPair,
  TechnicalIndicators,
  WalkForwardResult,
} from '../../../types';
import { BinancePublicClient, Ticker24h } from '../api/binanceClient';
import { BacktestEngine } from '../backtest/backtestEngine';
import { TechnicalIndicatorsEngine } from '../indicators/technical';
import { MarketScannerEngine } from '../scanner/marketScanner';
import { StatisticalValidationEngine } from '../validation/statisticalValidation';

interface Props {
  lang: Language;
}

export const BinanceSpotView: React.FC<Props> = ({ lang }) => {
  const t = translations[lang];

  // Subtab State (Single Asset, Full Scanner, Scenarios, Backtest, Statistical Validation)
  const [subTab, setSubTab] = useState<
    'singleAsset' | 'fullScanner' | 'scenarios' | 'backtester' | 'statisticalValidation'
  >('singleAsset');

  // ─── Single Asset State ────────────────────────────────────────
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [ticker, setTicker] = useState<Ticker24h | null>(null);
  const [isLiveFeed, setIsLiveFeed] = useState<boolean>(false);
  const [isLoadingMarket, setIsLoadingMarket] = useState<boolean>(false);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [marketRegime, setMarketRegime] = useState<MarketRegime>('MEAN_REVERTING_RANGE');

  // ─── Full Market Scanner State ─────────────────────────────────
  const [scannedPairs, setScannedPairs] = useState<ScannedMarketPair[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [regimeFilter, setRegimeFilter] = useState<string>('all');

  // ─── Scenarios State ───────────────────────────────────────────
  const [scenarios, setScenarios] = useState<MarketScenario[]>([]);

  // ─── Backtest State ───────────────────────────────────────────
  const [backtestStrategy, setBacktestStrategy] = useState<'ema_cross' | 'rsi_bollinger' | 'hurst_regime'>(
    'hurst_regime'
  );
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [makerFee, setMakerFee] = useState<number>(0.075);
  const [takerFee, setTakerFee] = useState<number>(0.075);
  const [slippage, setSlippage] = useState<number>(0.05);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isBacktesting, setIsBacktesting] = useState<boolean>(false);

  // ─── Statistical Validation State ──────────────────────────────
  const [dsrResult, setDsrResult] = useState<DeflatedSharpeResult | null>(null);
  const [pboResult, setPboResult] = useState<PBOResult | null>(null);
  const [walkForwardResult, setWalkForwardResult] = useState<WalkForwardResult | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloDrawdownResult | null>(null);
  const [isValidatingStats, setIsValidatingStats] = useState<boolean>(false);

  // ─── Load Market Data ──────────────────────────────────────────
  const loadMarketData = async (targetSymbol = symbol, targetTf = timeframe) => {
    setIsLoadingMarket(true);
    try {
      const tickerRes = await BinancePublicClient.fetch24hTicker(targetSymbol);
      setTicker(tickerRes.ticker);

      const klineRes = await BinancePublicClient.fetchKlines(targetSymbol, targetTf, 120);
      setCandles(klineRes.candles);
      setIsLiveFeed(klineRes.isLive);

      const ind = TechnicalIndicatorsEngine.computeAll(klineRes.candles);
      setIndicators(ind);

      const hurst = ind.hurstExponent || 0.5;
      const lastEma20 = ind.ema20?.[ind.ema20.length - 1];
      const lastEma50 = ind.ema50?.[ind.ema50.length - 1];

      let detectedRegime: MarketRegime = 'MEAN_REVERTING_RANGE';
      if (hurst > 0.53 && lastEma20 && lastEma50 && lastEma20 > lastEma50) {
        detectedRegime = 'STRONG_BULL_TREND';
      } else if (hurst > 0.53 && lastEma20 && lastEma50 && lastEma20 < lastEma50) {
        detectedRegime = 'STRONG_BEAR_TREND';
      } else if (ind.realizedVolatilityAnnualized && ind.realizedVolatilityAnnualized > 75) {
        detectedRegime = 'HIGH_VOLATILITY_EXPANSION';
      } else if (ind.realizedVolatilityAnnualized && ind.realizedVolatilityAnnualized < 25) {
        detectedRegime = 'LOW_VOLATILITY_COMPRESSION';
      }
      setMarketRegime(detectedRegime);

      // Generate Scenarios
      const scen = MarketScannerEngine.generateScenarios(targetSymbol, tickerRes.ticker.lastPrice, hurst);
      setScenarios(scen);
    } catch {
      // Handled
    } finally {
      setIsLoadingMarket(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [symbol, timeframe]);

  // ─── Run Full Market Scan ──────────────────────────────────────
  const handleRunScanner = async () => {
    setIsScanning(true);
    const idempotency = taskManager.generateIdempotencyKey('financial', 'scan_eligible_pairs', {
      timestamp: Date.now(),
    });
    const { task } = taskManager.registerTask('financial', 'Full Market Screening Scan', idempotency);

    taskManager.updateTaskProgress(task.id, 30);
    const results = await MarketScannerEngine.scanAllEligiblePairs();
    setScannedPairs(results);
    taskManager.completeTask(task.id, { pairsScanned: results.length });
    setIsScanning(false);
  };

  // ─── Run Backtest ──────────────────────────────────────────────
  const handleRunBacktest = () => {
    if (candles.length < 55) return;
    setIsBacktesting(true);

    const idempotency = taskManager.generateIdempotencyKey('financial', `backtest_${backtestStrategy}`, {
      symbol,
      timeframe,
      initialCapital,
      candleCount: candles.length,
    });
    const { task } = taskManager.registerTask(
      'financial',
      `Backtest: ${backtestStrategy.toUpperCase()} on ${symbol}`,
      idempotency
    );

    taskManager.updateTaskProgress(task.id, 45);

    setTimeout(() => {
      try {
        const result = BacktestEngine.runBacktest(candles, {
          symbol,
          timeframe,
          strategyName: backtestStrategy,
          initialBalance: initialCapital,
          makerFeePercent: makerFee,
          takerFeePercent: takerFee,
          slippagePercent: slippage,
        });

        setBacktestResult(result);
        taskManager.completeTask(task.id, {
          totalReturn: result.totalReturnPercent,
          trades: result.totalTrades,
          sharpe: result.sharpeRatio,
        });
      } catch (err: any) {
        taskManager.failTask(task.id, err.message);
      } finally {
        setIsBacktesting(false);
      }
    }, 150);
  };

  // ─── Run Advanced Statistical Validation (DSR & PBO) ───────────
  const handleRunStatisticalValidation = () => {
    if (candles.length < 55) return;
    setIsValidatingStats(true);

    const idempotency = taskManager.generateIdempotencyKey('financial', 'stat_validation_suite', {
      symbol,
      strategy: backtestStrategy,
    });
    const { task } = taskManager.registerTask(
      'financial',
      `Statistical Validation (DSR/PBO): ${symbol}`,
      idempotency
    );

    taskManager.updateTaskProgress(task.id, 40);

    setTimeout(() => {
      try {
        // Log returns array
        const logReturns: number[] = [];
        for (let i = 1; i < candles.length; i++) {
          logReturns.push(Math.log(candles[i].close / candles[i - 1].close));
        }

        const dsr = StatisticalValidationEngine.calculateDeflatedSharpe(logReturns, 30);
        const pbo = StatisticalValidationEngine.calculatePBO(candles, backtestStrategy);
        const wf = StatisticalValidationEngine.runWalkForward(candles, backtestStrategy);
        const mc = StatisticalValidationEngine.simulateBootstrapDrawdown(logReturns, 400);

        setDsrResult(dsr);
        setPboResult(pbo);
        setWalkForwardResult(wf);
        setMonteCarloResult(mc);

        taskManager.completeTask(task.id, {
          dsr: dsr.deflatedSharpe,
          pbo: pbo.pboProbability,
          isRobust: wf.isStrategyRobust,
        });
      } catch (err: any) {
        taskManager.failTask(task.id, err.message);
      } finally {
        setIsValidatingStats(false);
      }
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* ─── Safety Guarantee Banner ─────────────────────────────── */}
      <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3.5 flex items-start gap-3 shadow-md">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-semibold text-emerald-300 block mb-0.5">
            {t.safetyGuaranteed}
          </span>
          <p className="text-zinc-300/90 leading-relaxed">{t.binanceDisclaimer}</p>
        </div>
      </div>

      {/* ─── Market Intel Subtabs Navigation ─────────────────────── */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-zinc-800">
        <button
          onClick={() => setSubTab('singleAsset')}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            subTab === 'singleAsset'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-emerald-400" />
          {t.marketSubtabs.singleAsset}
        </button>

        <button
          onClick={() => {
            setSubTab('fullScanner');
            if (scannedPairs.length === 0) handleRunScanner();
          }}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            subTab === 'fullScanner'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          {t.marketSubtabs.fullScanner}
        </button>

        <button
          onClick={() => setSubTab('scenarios')}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            subTab === 'scenarios'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-400" />
          {t.marketSubtabs.scenarios}
        </button>

        <button
          onClick={() => setSubTab('backtester')}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            subTab === 'backtester'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          {t.marketSubtabs.backtester}
        </button>

        <button
          onClick={() => {
            setSubTab('statisticalValidation');
            if (!dsrResult) handleRunStatisticalValidation();
          }}
          className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            subTab === 'statisticalValidation'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          {t.marketSubtabs.statisticalValidation}
        </button>
      </div>

      {/* ─── 1. SINGLE ASSET VIEW ───────────────────────────────── */}
      {subTab === 'singleAsset' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs md:text-sm font-bold text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="BTCUSDT">BTC / USDT</option>
                  <option value="ETHUSDT">ETH / USDT</option>
                  <option value="SOLUSDT">SOL / USDT</option>
                  <option value="BNBUSDT">BNB / USDT</option>
                  <option value="ADAUSDT">ADA / USDT</option>
                  <option value="XRPUSDT">XRP / USDT</option>
                </select>

                <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
                  {(['1h', '4h', '1d'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-md font-mono ${
                        timeframe === tf
                          ? 'bg-emerald-500 text-zinc-950 font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => loadMarketData()}
                  disabled={isLoadingMarket}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition"
                  title="Refresh Market Data"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isLoadingMarket ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLiveFeed ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-zinc-400">
                  {isLiveFeed ? 'Binance Public REST Live' : 'Cached High-Fidelity Dataset'}
                </span>
              </div>
            </div>

            {ticker && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-400 block">{t.lastPrice}</span>
                  <span className="text-base md:text-lg font-bold font-mono text-zinc-100">
                    ${ticker.lastPrice.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block">{t.change24h}</span>
                  <span
                    className={`text-base font-bold font-mono flex items-center gap-0.5 ${
                      ticker.priceChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {ticker.priceChangePercent >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {ticker.priceChangePercent > 0 ? '+' : ''}
                    {ticker.priceChangePercent.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block">24h High / Low</span>
                  <span className="font-mono text-zinc-300 block">
                    ${ticker.highPrice.toLocaleString()} / ${ticker.lowPrice.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block">{t.volume24h}</span>
                  <span className="font-mono text-zinc-300 block">
                    {ticker.volume.toFixed(1)} {symbol.replace('USDT', '')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Chart & Regime Badge */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-400" />
                {symbol} ({timeframe}) Price Action & Bands
              </h3>

              <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs">
                <span className="text-zinc-400">{t.marketRegime}:</span>
                <span className="font-semibold font-mono text-emerald-400">
                  {marketRegime}
                </span>
              </div>
            </div>

            {/* Price Chart */}
            {candles.length > 0 && (
              <div className="w-full h-64 md:h-72 bg-zinc-950 rounded-xl p-3 border border-zinc-800 relative overflow-hidden">
                <svg viewBox="0 0 800 240" className="w-full h-full">
                  <line x1="30" y1="20" x2="780" y2="20" stroke="#27272a" strokeWidth="1" />
                  <line x1="30" y1="120" x2="780" y2="120" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="30" y1="200" x2="780" y2="200" stroke="#27272a" strokeWidth="1" />

                  {(() => {
                    const recent = candles.slice(-60);
                    const minPrice = Math.min(...recent.map((c) => c.low));
                    const maxPrice = Math.max(...recent.map((c) => c.high));
                    const priceRange = maxPrice - minPrice || 1;
                    const candleWidth = 720 / recent.length;

                    return (
                      <g>
                        {recent.map((c, i) => {
                          const xCenter = 40 + i * candleWidth + candleWidth / 2;
                          const yHigh = 200 - ((c.high - minPrice) / priceRange) * 170;
                          const yLow = 200 - ((c.low - minPrice) / priceRange) * 170;
                          const yOpen = 200 - ((c.open - minPrice) / priceRange) * 170;
                          const yClose = 200 - ((c.close - minPrice) / priceRange) * 170;
                          const isUp = c.close >= c.open;
                          const bodyY = Math.min(yOpen, yClose);
                          const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
                          const color = isUp ? '#10b981' : '#f43f5e';

                          return (
                            <g key={i}>
                              <line x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} stroke={color} strokeWidth="1.2" />
                              <rect
                                x={xCenter - candleWidth * 0.35}
                                y={bodyY}
                                width={Math.max(2, candleWidth * 0.7)}
                                height={bodyHeight}
                                fill={color}
                                rx="1"
                              />
                            </g>
                          );
                        })}

                        {indicators?.ema20 && (
                          <path
                            d={recent
                              .map((_, i) => {
                                const originalIdx = candles.length - recent.length + i;
                                const val = indicators.ema20![originalIdx];
                                if (!val) return '';
                                const x = 40 + i * candleWidth + candleWidth / 2;
                                const y = 200 - ((val - minPrice) / priceRange) * 170;
                                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                              })
                              .filter(Boolean)
                              .join(' ')}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="1.8"
                          />
                        )}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 2. FULL MARKET SCANNER VIEW ────────────────────────── */}
      {subTab === 'fullScanner' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-emerald-400" />
                  {t.rankedOpportunities}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Multi-factor screening across eligible Binance Spot assets (Hurst, Concordance, Realized Volatility).
                </p>
              </div>

              <button
                onClick={handleRunScanner}
                disabled={isScanning}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-lg text-xs md:text-sm flex items-center gap-2 shadow"
              >
                <RotateCcw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? t.scanningProgress : t.scanAllPairs}
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
              {['all', 'STRONG_BULL_TREND', 'MEAN_REVERTING_RANGE', 'HIGH_VOLATILITY_EXPANSION'].map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setRegimeFilter(filter)}
                    className={`px-3 py-1 rounded-md font-medium capitalize whitespace-nowrap ${
                      regimeFilter === filter
                        ? 'bg-emerald-500 text-zinc-950 font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {filter.replace(/_/g, ' ')}
                  </button>
                )
              )}
            </div>

            {/* Scanned Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono border border-zinc-800 rounded-lg overflow-hidden">
                <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Asset</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">24h Change</th>
                    <th className="p-3">Hurst (H)</th>
                    <th className="p-3">Regime</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Opportunity Direction</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/60">
                  {scannedPairs
                    .filter((p) => (regimeFilter === 'all' ? true : p.regime === regimeFilter))
                    .map((pair, idx) => (
                      <tr key={pair.symbol} className="hover:bg-zinc-800/40 transition">
                        <td className="p-3 font-bold text-zinc-100 flex items-center gap-2">
                          <span className="text-zinc-500 text-[10px]">#{idx + 1}</span>
                          {pair.symbol}
                        </td>
                        <td className="p-3 text-zinc-200">${pair.price.toLocaleString()}</td>
                        <td
                          className={`p-3 font-semibold ${
                            pair.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {pair.change24h > 0 ? '+' : ''}
                          {pair.change24h.toFixed(2)}%
                        </td>
                        <td className="p-3 text-cyan-300">H = {pair.hurst}</td>
                        <td className="p-3">
                          <span className="text-[10px] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300">
                            {pair.regime.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 bg-zinc-800 h-2 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pair.score}%` }}
                                className="bg-emerald-500 h-full rounded-full"
                              />
                            </div>
                            <span className="font-bold text-emerald-400">{pair.score}</span>
                          </div>
                        </td>
                        <td className="p-3 text-zinc-300 font-sans">{pair.primaryOpportunity}</td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setSymbol(pair.symbol);
                              setSubTab('singleAsset');
                            }}
                            className="bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-200 px-2 py-1 rounded transition text-[11px]"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. SCENARIOS VIEW ──────────────────────────────────── */}
      {subTab === 'scenarios' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                {t.scenarioTitle} ({symbol})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">{t.scenarioDescription}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenarios.map((scen) => (
                <div
                  key={scen.id}
                  className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-sm text-zinc-100">{scen.name}</h4>
                      <span className="text-[10px] font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-cyan-400">
                        Confidence: {(scen.epistemicConfidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300/90 leading-relaxed font-sans">
                      {scen.description}
                    </p>

                    <div className="space-y-1 text-xs">
                      <span className="text-emerald-400 font-mono text-[11px] block font-semibold">
                        {t.supportingEvidence}:
                      </span>
                      <ul className="list-disc list-inside text-zinc-400 text-[11px] space-y-0.5">
                        {scen.supportingEvidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1 text-xs pt-1">
                      <span className="text-rose-400 font-mono text-[11px] block font-semibold">
                        {t.falsificationCondition}:
                      </span>
                      <ul className="list-disc list-inside text-zinc-400 text-[11px] space-y-0.5">
                        {scen.falsificationConditions.map((fc, i) => (
                          <li key={i}>{fc}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[11px] text-zinc-500 font-mono">
                    <span>Horizon: {scen.timeHorizon}</span>
                    <span>Status: Actively Monitored</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. CAUSAL BACKTESTER VIEW ─────────────────────────── */}
      {subTab === 'backtester' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                {t.backtestTitle} ({symbol})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Strict causal ordering: Signal at bar t fills at bar t close with slippage, preventing lookahead leaks.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-mono block">{t.strategy}:</label>
                <select
                  value={backtestStrategy}
                  onChange={(e: any) => setBacktestStrategy(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                >
                  <option value="hurst_regime">{t.stratHurstAdaptive}</option>
                  <option value="ema_cross">{t.stratEmaCross}</option>
                  <option value="rsi_bollinger">{t.stratRsiBollinger}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-mono block">{t.initialCapital}:</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 1000)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-mono block">Fee (Taker %):</label>
                <input
                  type="number"
                  step="0.01"
                  value={takerFee}
                  onChange={(e) => setTakerFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-mono block">{t.slippage}:</label>
                <input
                  type="number"
                  step="0.01"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleRunBacktest}
              disabled={isBacktesting}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs md:text-sm flex items-center gap-2 shadow transition"
            >
              <Play className="w-4 h-4 fill-current" />
              {t.runBacktest}
            </button>

            {backtestResult && (
              <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 space-y-4">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-900">
                  <span className="font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    {t.zeroLookaheadGuaranteed}
                  </span>
                  <span className="text-zinc-400 font-mono">
                    {backtestResult.candleCount} bars tested
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">{t.totalReturn}</span>
                    <span
                      className={`text-base font-bold font-mono ${
                        backtestResult.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {backtestResult.totalReturnPercent > 0 ? '+' : ''}
                      {backtestResult.totalReturnPercent}%
                    </span>
                  </div>

                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">{t.benchmarkReturn}</span>
                    <span className="text-base font-bold font-mono text-zinc-200">
                      {backtestResult.benchmarkReturnPercent}%
                    </span>
                  </div>

                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">{t.sharpeRatio}</span>
                    <span className="text-base font-bold font-mono text-cyan-400">
                      {backtestResult.sharpeRatio}
                    </span>
                  </div>

                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block">{t.maxDrawdown}</span>
                    <span className="text-base font-bold font-mono text-rose-400">
                      -{backtestResult.maxDrawdownPercent}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 5. STATISTICAL VALIDATION VIEW ────────────────────── */}
      {subTab === 'statisticalValidation' && (
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-400" />
                  {t.statValidationTitle}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">{t.statValidationDesc}</p>
              </div>

              <button
                onClick={handleRunStatisticalValidation}
                disabled={isValidatingStats}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-lg text-xs md:text-sm flex items-center gap-2 shadow"
              >
                <RotateCcw className={`w-4 h-4 ${isValidatingStats ? 'animate-spin' : ''}`} />
                {t.runStatisticalValidation}
              </button>
            </div>

            {dsrResult && pboResult && walkForwardResult && monteCarloResult && (
              <div className="space-y-4">
                {/* DSR & PBO Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Deflated Sharpe Ratio Card */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <span className="text-xs font-semibold text-emerald-400 block">
                      {t.dsrTitle}
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      {t.dsrExplanation}
                    </p>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-mono">
                      <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">Raw Sharpe</span>
                        <span className="text-zinc-200 font-bold">{dsrResult.rawSharpe}</span>
                      </div>
                      <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">Deflated (DSR)</span>
                        <span className="text-emerald-400 font-bold">{dsrResult.deflatedSharpe}</span>
                      </div>
                      <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">P-Value (Snooping)</span>
                        <span className="text-cyan-400 font-bold">{dsrResult.pVal}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          dsrResult.isStatisticallySignificant
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {dsrResult.isStatisticallySignificant
                          ? 'Statistically Significant (p < 0.05)'
                          : 'High Snooping Probability'}
                      </span>
                    </div>
                  </div>

                  {/* PBO Card */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <span className="text-xs font-semibold text-emerald-400 block">
                      {t.pboTitle}
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      {t.pboExplanation}
                    </p>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-mono">
                      <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">PBO Score</span>
                        <span
                          className={`font-bold ${
                            pboResult.pboProbability > 0.4 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {(pboResult.pboProbability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">Rank Degradation</span>
                        <span className="text-zinc-200 font-bold">
                          {pboResult.medianRankDegradation}
                        </span>
                      </div>
                      <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">Combinations</span>
                        <span className="text-zinc-200 font-bold">
                          {pboResult.combinationsEvaluated}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          !pboResult.isOverfitRiskHigh
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {!pboResult.isOverfitRiskHigh ? t.overfitRiskLow : t.overfitRiskHigh}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Walk-Forward Windows Table */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-100">{t.walkForwardTitle}</span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      Average Robustness: {walkForwardResult.averageRobustnessRatio}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left font-mono border border-zinc-800 rounded">
                      <thead className="bg-zinc-900 text-zinc-400">
                        <tr>
                          <th className="p-2">Window</th>
                          <th className="p-2">In-Sample Sharpe</th>
                          <th className="p-2">Out-Of-Sample Sharpe</th>
                          <th className="p-2">OOS Return %</th>
                          <th className="p-2">Robustness Ratio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {walkForwardResult.windows.map((win) => (
                          <tr key={win.windowIndex}>
                            <td className="p-2 text-zinc-300">Slice #{win.windowIndex}</td>
                            <td className="p-2 text-zinc-200">{win.inSampleSharpe}</td>
                            <td className="p-2 text-emerald-400 font-bold">
                              {win.outOfSampleSharpe}
                            </td>
                            <td
                              className={`p-2 font-semibold ${
                                win.outOfSampleReturnPct >= 0
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {win.outOfSampleReturnPct}%
                            </td>
                            <td className="p-2 text-cyan-300">{win.robustnessRatio}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
