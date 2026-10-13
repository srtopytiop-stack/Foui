/**
 * ATLASYNTH — Binance Spot Public Market Data Client
 * Strictly read-only against public REST & WebSocket endpoints.
 * @license Apache-2.0
 */

import { MarketCandle } from '../../../types';

export interface Ticker24h {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
}

export class BinancePublicClient {
  private static rateLimitWeight = 0;
  private static lastWeightReset = Date.now();

  /**
   * Generates realistic synthetic/cached market candles for zero-latency offline research
   */
  public static generateReferenceCandles(symbol: string, timeframe: string, count = 120): MarketCandle[] {
    const candles: MarketCandle[] = [];
    const now = Date.now();
    const intervalMs =
      timeframe === '1h' ? 3600000 : timeframe === '4h' ? 14400000 : timeframe === '1d' ? 86400000 : 3600000;

    let basePrice = 65000;
    let volatility = 0.015;

    if (symbol.includes('ETH')) {
      basePrice = 3450;
      volatility = 0.02;
    } else if (symbol.includes('SOL')) {
      basePrice = 145;
      volatility = 0.03;
    } else if (symbol.includes('BNB')) {
      basePrice = 580;
      volatility = 0.018;
    }

    let currentClose = basePrice;
    const startTs = now - count * intervalMs;

    // Seeded pseudo-random geometric Brownian motion with mean-reversion drift
    for (let i = 0; i < count; i++) {
      const openTime = startTs + i * intervalMs;
      const closeTime = openTime + intervalMs - 1;

      // Realistic cyclical & stochastic component
      const cycle = Math.sin((i / count) * 4 * Math.PI) * 0.005;
      const noise = (Math.sin(i * 13.7) * 43758.5453 - Math.floor(Math.sin(i * 13.7) * 43758.5453) - 0.49) * volatility;
      const returnPct = cycle + noise;

      const open = currentClose;
      const close = Number((open * (1 + returnPct)).toFixed(2));
      const high = Number((Math.max(open, close) * (1 + Math.abs(noise * 0.8))).toFixed(2));
      const low = Number((Math.min(open, close) * (1 - Math.abs(noise * 0.8))).toFixed(2));
      const volume = Number((Math.abs(Math.sin(i * 3.14)) * 500 + 120).toFixed(2));

      candles.push({
        openTime,
        open,
        high,
        low,
        close,
        volume,
        closeTime,
        quoteVolume: Number((volume * close).toFixed(2)),
        trades: Math.floor(volume * 15),
        isClosed: true,
      });

      currentClose = close;
    }

    return candles;
  }

  /**
   * Fetches public K-line data from Binance
   */
  public static async fetchKlines(
    symbol = 'BTCUSDT',
    interval = '1h',
    limit = 100
  ): Promise<{ candles: MarketCandle[]; isLive: boolean }> {
    // Attempt live fetch via direct Binance public endpoint or Vite proxy
    const urls = [
      `/api/binance/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const raw = await response.json();
          if (Array.isArray(raw) && raw.length > 0) {
            const candles: MarketCandle[] = raw.map((k: any) => ({
              openTime: Number(k[0]),
              open: parseFloat(k[1]),
              high: parseFloat(k[2]),
              low: parseFloat(k[3]),
              close: parseFloat(k[4]),
              volume: parseFloat(k[5]),
              closeTime: Number(k[6]),
              quoteVolume: parseFloat(k[7]),
              trades: Number(k[8]),
              isClosed: true,
            }));
            return { candles, isLive: true };
          }
        }
      } catch {
        // Continue to fallback
      }
    }

    // High-fidelity fallback reference dataset
    const reference = this.generateReferenceCandles(symbol, interval, limit);
    return { candles: reference, isLive: false };
  }

  /**
   * Fetches 24-hour ticker statistics
   */
  public static async fetch24hTicker(symbol = 'BTCUSDT'): Promise<{ ticker: Ticker24h; isLive: boolean }> {
    const urls = [
      `/api/binance/api/v3/ticker/24hr?symbol=${symbol}`,
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          return {
            ticker: {
              symbol: data.symbol,
              lastPrice: parseFloat(data.lastPrice),
              priceChangePercent: parseFloat(data.priceChangePercent),
              highPrice: parseFloat(data.highPrice),
              lowPrice: parseFloat(data.lowPrice),
              volume: parseFloat(data.volume),
              quoteVolume: parseFloat(data.quoteVolume),
            },
            isLive: true,
          };
        }
      } catch {
        // Fallback
      }
    }

    // Default reference ticker
    const fallbackPrices: Record<string, { price: number; change: number }> = {
      BTCUSDT: { price: 67450.0, change: 2.34 },
      ETHUSDT: { price: 3520.5, change: -1.15 },
      SOLUSDT: { price: 154.2, change: 4.8 },
      BNBUSDT: { price: 590.1, change: 0.75 },
    };

    const target = fallbackPrices[symbol] || { price: 65000, change: 1.0 };
    return {
      ticker: {
        symbol,
        lastPrice: target.price,
        priceChangePercent: target.change,
        highPrice: target.price * 1.025,
        lowPrice: target.price * 0.98,
        volume: 18450.2,
        quoteVolume: 1245000000,
      },
      isLive: false,
    };
  }
}
