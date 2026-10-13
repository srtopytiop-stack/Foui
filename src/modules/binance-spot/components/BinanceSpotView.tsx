/**
 * ATLASYNTH — Binance Spot Research Lab Interactive View
 * Public market feeds, quantitative indicators, regime detection, and causal backtester.
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
  Layers,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { taskManager } from '../../../core/orchestrator/taskManager';
import { translations } from '../../../core/i18n/translations';
import { BacktestResult, Language, MarketCandle, MarketRegime, TechnicalIndicators } from '../../../types';
import { BinancePublicClient, Ticker24h } from '../api/binanceClient';
import { BacktestEngine } from '../backtest/backtestEngine';
import { TechnicalIndicatorsEngine } from '../indicators/technical';

interface Props {
  lang: Language;
}

export const BinanceSpotView: React.FC<Props> = ({ lang }) => {
  const t = translations[lang];

  // ─── Market Data State ─────────────────────────────────────────
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [ticker, setTicker] = useState<Ticker24h | null>(null);
  const [isLiveFeed, setIsLiveFeed] = useState<boolean>(false);
  const [isLoadingMarket, setIsLoadingMarket] = useState<boolean>(false);

  // ─── Technical & Quantitative Analysis State ──────────────────
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [marketRegime, setMarketRegime] = useState<MarketRegime>('MEAN_REVERTING_RANGE');

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

  // ─── Load Market Data ──────────────────────────────────────────
  const loadMarketData = async (targetSymbol = symbol, targetTf = timeframe) => {
    setIsLoadingMarket(true);
    try {
      const tickerRes = await BinancePublicClient.fetch24hTicker(targetSymbol);
      setTicker(tickerRes.ticker);

      const klineRes = await BinancePublicClient.fetchKlines(targetSymbol, targetTf, 100);
      setCandles(klineRes.candles);
      setIsLiveFeed(klineRes.isLive);

      // Compute Quantitative Indicators
      const ind = TechnicalIndicatorsEngine.computeAll(klineRes.candles);
      setIndicators(ind);

      // Regime detection heuristic based on Hurst + EMA alignment
      const lastCandle = klineRes.candles[klineRes.candles.length - 1];
      const lastEma20 = ind.ema20?.[ind.ema20.length - 1];
      const lastEma50 = ind.ema50?.[ind.ema50.length - 1];
      const hurst = ind.hurstExponent || 0.5;

      if (hurst > 0.53 && lastEma20 && lastEma50 && lastEma20 > lastEma50) {
        setMarketRegime('STRONG_BULL_TREND');
      } else if (hurst > 0.53 && lastEma20 && lastEma50 && lastEma20 < lastEma50) {
        setMarketRegime('STRONG_BEAR_TREND');
      } else if (ind.realizedVolatilityAnnualized && ind.realizedVolatilityAnnualized > 75) {
        setMarketRegime('HIGH_VOLATILITY_EXPANSION');
      } else if (ind.realizedVolatilityAnnualized && ind.realizedVolatilityAnnualized < 25) {
        setMarketRegime('LOW_VOLATILITY_COMPRESSION');
      } else {
        setMarketRegime('MEAN_REVERTING_RANGE');
      }
    } catch {
      // Fallback handled inside client
    } finally {
      setIsLoadingMarket(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [symbol, timeframe]);

  // ─── Run Backtest Handler ──────────────────────────────────────
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

      {/* ─── Market Selector & Live Ticker Strip ─────────────────── */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Symbol Selector */}
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs md:text-sm font-bold text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="BTCUSDT">BTC / USDT</option>
              <option value="ETHUSDT">ETH / USDT</option>
              <option value="SOLUSDT">SOL / USDT</option>
              <option value="BNBUSDT">BNB / USDT</option>
            </select>

            {/* Timeframe Selector */}
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

          {/* Connection Status Badge */}
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

        {/* 24-Hour Statistics Bar */}
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

      {/* ─── Candlestick / Price Chart & Regime Detection ───────── */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-zinc-100">
              {symbol} ({timeframe}) Price Action & Bands
            </h3>
          </div>

          {/* Market Regime Badge */}
          <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs">
            <span className="text-zinc-400">{t.marketRegime}:</span>
            <span
              className={`font-semibold font-mono ${
                marketRegime === 'STRONG_BULL_TREND'
                  ? 'text-emerald-400'
                  : marketRegime === 'STRONG_BEAR_TREND'
                  ? 'text-rose-400'
                  : marketRegime === 'HIGH_VOLATILITY_EXPANSION'
                  ? 'text-amber-400'
                  : 'text-cyan-400'
              }`}
            >
              {marketRegime === 'STRONG_BULL_TREND'
                ? t.regimeBull
                : marketRegime === 'STRONG_BEAR_TREND'
                ? t.regimeBear
                : marketRegime === 'HIGH_VOLATILITY_EXPANSION'
                ? t.regimeVolatile
                : marketRegime === 'LOW_VOLATILITY_COMPRESSION'
                ? t.regimeCompress
                : t.regimeRange}
            </span>
          </div>
        </div>

        {/* Quantitative Metrics Summary Strip */}
        {indicators && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 text-xs">
            <div>
              <span className="text-zinc-400 block">{t.hurstExponent}</span>
              <span className="font-mono font-bold text-zinc-200 text-sm">
                H = {indicators.hurstExponent}
              </span>
              <span className="text-[10px] text-zinc-500 block truncate">
                {indicators.hurstExponent && indicators.hurstExponent > 0.5
                  ? 'Persistent Trend'
                  : 'Mean-Reverting'}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 block">Realized Volatility (Annual)</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {indicators.realizedVolatilityAnnualized}%
              </span>
              <span className="text-[10px] text-zinc-500 block">Log returns variance</span>
            </div>

            <div>
              <span className="text-zinc-400 block">RSI (14 Wilder)</span>
              <span className="font-mono font-bold text-cyan-400 text-sm">
                {indicators.rsi14?.[indicators.rsi14.length - 1]?.toFixed(1) || '--'}
              </span>
              <span className="text-[10px] text-zinc-500 block">Momentum oscillator</span>
            </div>
          </div>
        )}

        {/* SVG Price Chart with Candlesticks & Bollinger Bands */}
        {candles.length > 0 && (
          <div className="w-full h-64 md:h-72 bg-zinc-950 rounded-xl p-3 border border-zinc-800 relative overflow-hidden">
            <svg viewBox="0 0 800 240" className="w-full h-full">
              {/* Reference Grid lines */}
              <line x1="30" y1="20" x2="780" y2="20" stroke="#27272a" strokeWidth="1" />
              <line x1="30" y1="120" x2="780" y2="120" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="200" x2="780" y2="200" stroke="#27272a" strokeWidth="1" />

              {(() => {
                const recent = candles.slice(-60); // Show last 60 candles
                const minPrice = Math.min(...recent.map((c) => c.low));
                const maxPrice = Math.max(...recent.map((c) => c.high));
                const priceRange = maxPrice - minPrice || 1;

                const candleWidth = 720 / recent.length;

                return (
                  <g>
                    {/* Render Candlesticks */}
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
                          {/* Wick */}
                          <line x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} stroke={color} strokeWidth="1.2" />
                          {/* Body */}
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

                    {/* EMA 20 overlay line */}
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

            <div className="flex gap-4 text-[11px] text-zinc-400 absolute bottom-2 left-4 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Bullish Candle
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" /> Bearish Candle
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400" /> EMA 20
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Causal Strategy Backtester ─────────────────────────── */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-lg space-y-4">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            {t.backtestTitle}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Strict causal ordering: Signal at bar t fills at bar t close with slippage, preventing lookahead leaks.
          </p>
        </div>

        {/* Backtest Parameters Grid */}
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
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs md:text-sm flex items-center gap-2 shadow transition-all active:scale-95"
        >
          <Play className="w-4 h-4 fill-current" />
          {t.runBacktest}
        </button>

        {/* Backtest Results Dashboard */}
        {backtestResult && (
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 space-y-4">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-900">
              <span className="font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                {t.zeroLookaheadGuaranteed}
              </span>
              <span className="text-zinc-400 font-mono">
                {backtestResult.candleCount} candles simulated
              </span>
            </div>

            {/* Performance KPI Cards */}
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
                <span className="text-[10px] text-zinc-500 block">
                  Final: ${backtestResult.finalBalance.toLocaleString()}
                </span>
              </div>

              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400 block">{t.benchmarkReturn}</span>
                <span
                  className={`text-base font-bold font-mono ${
                    backtestResult.benchmarkReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {backtestResult.benchmarkReturnPercent > 0 ? '+' : ''}
                  {backtestResult.benchmarkReturnPercent}%
                </span>
                <span className="text-[10px] text-zinc-500 block">Buy & Hold</span>
              </div>

              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400 block">{t.sharpeRatio}</span>
                <span className="text-base font-bold font-mono text-cyan-400">
                  {backtestResult.sharpeRatio}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  Sortino: {backtestResult.sortinoRatio}
                </span>
              </div>

              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400 block">{t.maxDrawdown}</span>
                <span className="text-base font-bold font-mono text-rose-400">
                  -{backtestResult.maxDrawdownPercent}%
                </span>
                <span className="text-[10px] text-zinc-500 block">Peak-to-valley</span>
              </div>

              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400 block">{t.winRate}</span>
                <span className="text-base font-bold font-mono text-zinc-100">
                  {backtestResult.winRatePercent}%
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  {backtestResult.winningTrades}W / {backtestResult.losingTrades}L
                </span>
              </div>

              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400 block">{t.profitFactor}</span>
                <span className="text-base font-bold font-mono text-zinc-100">
                  {backtestResult.profitFactor}
                </span>
                <span className="text-[10px] text-zinc-500 block">Gross Profit / Loss</span>
              </div>

              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400 block">{t.totalTrades}</span>
                <span className="text-base font-bold font-mono text-zinc-100">
                  {backtestResult.totalTrades}
                </span>
                <span className="text-[10px] text-zinc-500 block">Executed orders</span>
              </div>
            </div>

            {/* Equity Curve SVG Visualizer */}
            {backtestResult.equityCurve.length > 0 && (
              <div className="space-y-1 pt-2">
                <span className="text-xs font-mono text-zinc-400 block">{t.equityCurve}:</span>
                <div className="w-full h-44 bg-zinc-900/60 rounded-lg p-2 border border-zinc-800">
                  <svg viewBox="0 0 700 160" className="w-full h-full">
                    {(() => {
                      const curve = backtestResult.equityCurve;
                      const equities = curve.map((c) => c.equity);
                      const minEq = Math.min(...equities) * 0.98;
                      const maxEq = Math.max(...equities) * 1.02;
                      const rangeEq = maxEq - minEq || 1;

                      const path = curve
                        .map((pt, i) => {
                          const px = 20 + (i / (curve.length - 1)) * 660;
                          const py = 140 - ((pt.equity - minEq) / rangeEq) * 120;
                          return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
                        })
                        .join(' ');

                      return (
                        <g>
                          <line x1="20" y1="140" x2="680" y2="140" stroke="#27272a" strokeWidth="1" />
                          <path d={path} fill="none" stroke="#10b981" strokeWidth="2.5" />
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
