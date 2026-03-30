/**
 * data_fetcher.js — 个股数据获取
 * 
 * AutoSearch 风格美股个股交易系统
 * 数据层：使用 Twelve Data API
 * 速率控制：免费层 8次/分钟，队列+智能等待
 */

import axios from "axios";

// Twelve Data API Key
const TD_KEY = 'e6d630d07cbb49afacef2f67ef4dcc4f';
const BASE_URL = 'https://api.twelvedata.com';

// 速率控制：每分钟最多8次
const MIN_INTERVAL_MS = 7500; // 8次/分钟 → 每次间隔 ≥7.5s
let lastCallTime = 0;

async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  
  if (elapsed < MIN_INTERVAL_MS) {
    const wait = MIN_INTERVAL_MS - elapsed;
    console.log(`   ⏳ 速率限制，等待 ${(wait/1000).toFixed(1)}s...`);
    await new Promise(r => setTimeout(r, wait));
  }
  
  lastCallTime = Date.now();
  return axios.get(url);
}

/**
 * 获取单只股票历史K线
 */
export async function getStockHistory(symbol, options = {}) {
  const { outputSize = 252 } = options;

  try {
    const url = `${BASE_URL}/time_series?symbol=${symbol}&interval=1day&outputsize=${outputSize}&format=JSON&dp=2&apikey=${TD_KEY}`;
    const res = await rateLimitedFetch(url);
    const data = res.data;

    if (data.status === 'error' || !data.values || data.values.length === 0) {
      return { symbol, error: data.message || 'no data', candles: [] };
    }

    const candles = data.values.slice().reverse().map(v => ({
      date: v.datetime.split(' ')[0],
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume)
    }));

    return { symbol, candles, creditsUsed: res.headers['x-bd-quota-requests-used'] };
  } catch (err) {
    // 速率限制响应
    const status = err.response?.status;
    if (status === 429 || status === 403) {
      return { symbol, error: 'rate_limit', candles: [], retry: true };
    }
    return { symbol, error: err.message, candles: [] };
  }
}

/**
 * 批量获取多只股票（智能速率控制）
 */
export async function getBatchHistory(symbols, options = {}) {
  console.log(`\n📥 批量获取 ${symbols.length} 只股票数据 (Twelve Data)`);
  console.log(`   速率限制: 8次/分钟, 每次间隔 ≥7.5s`);
  
  const results = {};
  let successCount = 0;
  let retryCount = 0;
  const queue = [...symbols];
  let minuteCount = 0;
  let sessionStart = Date.now();

  while (queue.length > 0) {
    const sym = queue[0];
    
    // 检查整天限制（免费层500次/天）
    if (minuteCount > 0 && minuteCount % 100 === 0) {
      const elapsed = ((Date.now() - sessionStart) / 1000 / 60).toFixed(1);
      console.log(`\n   📊 已用 ${minuteCount} 次请求 (${elapsed}分钟内)`);
    }

    const result = await getStockHistory(sym, options);

    if (result.error === 'rate_limit' && result.retry) {
      // 等待75秒（新的一分钟窗口）
      console.log(`   ⏳ 分钟配额耗尽，等待 75s 后重试...`);
      await new Promise(r => setTimeout(r, 75000));
      continue; // 重试同一只
    }

    queue.shift();
    minuteCount++;

    if (result.candles.length > 100) {
      results[sym] = result.candles;
      successCount++;
      const pct = ((minuteCount / symbols.length) * 100).toFixed(0);
      console.log(`   [${minuteCount}/${symbols.length}] ${sym} ✅ ${result.candles.length} 条`);
    } else {
      console.log(`   [${minuteCount}/${symbols.length}] ${sym} ❌ (${result.error})`);
    }
  }

  console.log(`\n✅ 数据获取完成: ${successCount}/${symbols.length} 只成功`);
  return results;
}

/**
 * 获取实时价格
 */
export async function getRealTimePrice(symbol) {
  try {
    const url = `${BASE_URL}/price?symbol=${symbol}&format=JSON&apikey=${TD_KEY}`;
    const res = await rateLimitedFetch(url);
    const data = res.data;

    if (data.status === 'error') return null;

    return { symbol, price: parseFloat(data.price) };
  } catch (err) {
    return null;
  }
}

/**
 * 批量获取实时价格
 */
export async function getBatchRealTimePrices(symbols) {
  const results = {};
  
  for (const sym of symbols) {
    const data = await getRealTimePrice(sym);
    if (data) results[sym] = data;
  }

  return results;
}

/**
 * 准备策略所需的数据格式
 */
export function prepareStrategyData(universe, priceData) {
  const data = { universe };

  for (const stock of universe) {
    const sym = stock.symbol;
    const klines = priceData[sym] || [];
    
    if (klines.length === 0) continue;

    data[`close_${sym}`] = klines.map(k => k.close);
    data[`ohlcv_${sym}`] = klines;
  }

  return data;
}

export default {
  getStockHistory,
  getBatchHistory,
  getRealTimePrice,
  getBatchRealTimePrices,
  prepareStrategyData
};
