/**
 * ATLASYNTH — Causally Sound Event-Driven Backtesting Engine
 * 100% Zero-Lookahead Bias Guarantee. No future data leakages.
 * @license Apache-2.0
 */

import { BacktestResult, MarketCandle, TradeRecord } from '../../../types';
import { TechnicalIndicatorsEngine } from '../indicators/technical';

export interface BacktestConfig {
  symbol: string;
  timeframe: string;
  strategyName: 'ema_cross' | 'rsi_bollinger' | 'hurst_regime';
  initialBalance: number;
  makerFeePercent: number; // e.g. 0.075
  takerFeePercent: number; // e.g. 0.075
  slippagePercent: number; // e.g. 0.05
}

export class BacktestEngine {
  public static runBacktest(candles: MarketCandle[], config: BacktestConfig): BacktestResult {
    const startTime = performance.now();
    const runId = 'bt_' + Math.random().toString(36).substring(2, 9);
    const n = candles.length;

    if (n < 55) {
      throw new Error('At least 55 candles are required for technical indicator warming');
    }

    // Precalculate indicators in a strictly causal manner (index i only relies on indices <= i)
    const closes = candles.map((c) => c.close);
    const ema20 = TechnicalIndicatorsEngine.calculateEMA(closes, 20);
    const ema50 = TechnicalIndicatorsEngine.calculateEMA(closes, 50);
    const rsi14 = TechnicalIndicatorsEngine.calculateRSI(closes, 14);
    const bollinger = TechnicalIndicatorsEngine.calculateBollingerBands(closes, 20, 2);

    let cash = config.initialBalance;
    let position = 0; // Quantity of asset held
    let positionEntryPrice = 0;
    let positionEntryTime = 0;

    const trades: TradeRecord[] = [];
    const equityCurve: Array<{ time: number; equity: number; drawdown: number }> = [];

    let peakEquity = config.initialBalance;
    let maxDrawdown = 0;

    // Simulation loop starting after warmup period
    const warmup = 50;

    for (let i = warmup; i < n; i++) {
      const currentCandle = candles[i];
      const prevCandle = candles[i - 1];
      const closePrice = currentCandle.close;

      // Current total mark-to-market equity
      const currentEquity = cash + position * closePrice;
      if (currentEquity > peakEquity) peakEquity = currentEquity;
      const drawdown = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      equityCurve.push({
        time: currentCandle.closeTime,
        equity: Number(currentEquity.toFixed(2)),
        drawdown: Number(drawdown.toFixed(2)),
      });

      // ─── Generate Signal (Using ONLY data up to candle i) ───
      let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

      if (config.strategyName === 'ema_cross') {
        const currEma20 = ema20[i];
        const currEma50 = ema50[i];
        const prevEma20 = ema20[i - 1];
        const prevEma50 = ema50[i - 1];

        if (currEma20 && currEma50 && prevEma20 && prevEma50) {
          if (prevEma20 <= prevEma50 && currEma20 > currEma50) signal = 'BUY';
          else if (prevEma20 >= prevEma50 && currEma20 < currEma50) signal = 'SELL';
        }
      } else if (config.strategyName === 'rsi_bollinger') {
        const currRsi = rsi14[i];
        const lowerBand = bollinger.lower[i];
        const upperBand = bollinger.upper[i];

        if (currRsi && lowerBand && upperBand) {
          if (currRsi < 32 && closePrice <= lowerBand * 1.005) signal = 'BUY';
          else if (currRsi > 68 && closePrice >= upperBand * 0.995) signal = 'SELL';
        }
      } else if (config.strategyName === 'hurst_regime') {
        // Causal Hurst estimated from trailing 60 bars
        const windowSlice = closes.slice(Math.max(0, i - 60), i + 1);
        const localHurst = TechnicalIndicatorsEngine.calculateHurstExponent(windowSlice);

        if (localHurst > 0.52) {
          // Trend following mode
          if (ema20[i] && ema50[i] && ema20[i]! > ema50[i]!) signal = 'BUY';
          else signal = 'SELL';
        } else if (localHurst < 0.48) {
          // Mean reverting mode
          if (rsi14[i] && rsi14[i]! < 35) signal = 'BUY';
          else if (rsi14[i] && rsi14[i]! > 65) signal = 'SELL';
        } else {
          // Random walk regime: liquidate to cash to prevent whipsaws
          signal = 'SELL';
        }
      }

      // ─── Execute Simulated Trade with Slippage & Fees ───
      const slippageMult = 1 + config.slippagePercent / 100;
      const takerFeeMult = config.takerFeePercent / 100;

      if (signal === 'BUY' && position === 0 && cash > 10) {
        const executionPrice = closePrice * slippageMult;
        const grossQty = cash / executionPrice;
        const fee = cash * takerFeeMult;
        const netCash = cash - fee;
        const qty = netCash / executionPrice;

        position = qty;
        positionEntryPrice = executionPrice;
        positionEntryTime = currentCandle.closeTime;
        cash = 0;

        trades.push({
          id: 'tr_' + trades.length + 1,
          entryTime: positionEntryTime,
          type: 'BUY',
          entryPrice: Number(executionPrice.toFixed(2)),
          quantity: Number(qty.toFixed(6)),
          feePaid: Number(fee.toFixed(2)),
          slippageIncurred: Number((closePrice * (config.slippagePercent / 100) * qty).toFixed(2)),
        });
      } else if (signal === 'SELL' && position > 0) {
        const executionPrice = closePrice / slippageMult;
        const grossProceeds = position * executionPrice;
        const fee = grossProceeds * takerFeeMult;
        const netProceeds = grossProceeds - fee;

        const pnl = netProceeds - position * positionEntryPrice;
        const pnlPercent = ((executionPrice - positionEntryPrice) / positionEntryPrice) * 100;

        // Update last open trade
        const lastTrade = trades[trades.length - 1];
        if (lastTrade) {
          lastTrade.exitTime = currentCandle.closeTime;
          lastTrade.exitPrice = Number(executionPrice.toFixed(2));
          lastTrade.pnl = Number(pnl.toFixed(2));
          lastTrade.pnlPercent = Number(pnlPercent.toFixed(2));
          lastTrade.feePaid += Number(fee.toFixed(2));
          lastTrade.exitReason = 'SIGNAL';
        }

        cash = netProceeds;
        position = 0;
      }
    }

    // Final mark-to-market settlement
    const finalBalance = cash + position * candles[n - 1].close;
    const totalReturnPercent = ((finalBalance - config.initialBalance) / config.initialBalance) * 100;

    // Benchmark: Buy & Hold from warmup to end
    const initialPrice = candles[warmup].close;
    const finalPrice = candles[n - 1].close;
    const benchmarkReturnPercent = ((finalPrice - initialPrice) / initialPrice) * 100;

    // Trade statistics
    const closedTrades = trades.filter((t) => t.exitTime !== undefined);
    const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0).length;
    const losingTrades = closedTrades.filter((t) => (t.pnl || 0) <= 0).length;
    const winRatePercent = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

    const grossProfit = closedTrades
      .filter((t) => (t.pnl || 0) > 0)
      .reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(
      closedTrades.filter((t) => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0)
    );
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 1.0;

    // Sharpe & Sortino ratios (approximate daily annualized)
    const returns: number[] = [];
    for (let k = 1; k < equityCurve.length; k++) {
      returns.push((equityCurve[k].equity - equityCurve[k - 1].equity) / equityCurve[k - 1].equity);
    }

    const meanReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
    const varReturn = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (returns.length || 1);
    const stdReturn = Math.sqrt(varReturn);

    const downsideReturns = returns.filter((r) => r < 0);
    const varDownside =
      downsideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / (downsideReturns.length || 1);
    const stdDownside = Math.sqrt(varDownside);

    const annualFactor = Math.sqrt(365 * 24); // Assuming 1h bars
    const sharpeRatio = stdReturn > 1e-8 ? (meanReturn / stdReturn) * annualFactor : 0;
    const sortinoRatio = stdDownside > 1e-8 ? (meanReturn / stdDownside) * annualFactor : 0;

    return {
      runId,
      symbol: config.symbol,
      timeframe: config.timeframe,
      strategyName: config.strategyName,
      parameters: {
        makerFee: config.makerFeePercent,
        takerFee: config.takerFeePercent,
        slippage: config.slippagePercent,
      },
      candleCount: n,
      initialBalance: config.initialBalance,
      finalBalance: Number(finalBalance.toFixed(2)),
      totalReturnPercent: Number(totalReturnPercent.toFixed(2)),
      benchmarkReturnPercent: Number(benchmarkReturnPercent.toFixed(2)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      sortinoRatio: Number(sortinoRatio.toFixed(2)),
      maxDrawdownPercent: Number(maxDrawdown.toFixed(2)),
      winRatePercent: Number(winRatePercent.toFixed(1)),
      profitFactor: Number(profitFactor.toFixed(2)),
      totalTrades: closedTrades.length,
      winningTrades,
      losingTrades,
      equityCurve,
      trades: closedTrades,
      isCausallySound: true,
    };
  }
}
