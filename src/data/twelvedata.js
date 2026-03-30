/**
 * Twelve Data - 美股数据源
 * 免费额度: 8 API credits/min, 800/day
 * 每个历史K线请求 = 1 credit
 * 限制: 每7秒最多1个请求（约8/min），加上短暂爆发后休眠
 */

const API_KEY = 'e6d630d07cbb49afacef2f67ef4dcc4f';
const BASE_URL = 'https://api.twelvedata.com';

// 简单内存缓存（同进程内有效）
const cache = new Map();
const pending = new Map();

// 速率限制：上次请求时间
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 7500; // 每7.5秒1次，8次刚好在1分钟内

/**
 * 带速率限制的 fetch
 */
async function rateLimitedFetch(url) {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestTime));
  if (wait > 0) {
    await new Promise(r => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

/**
 * 获取日K线（自动缓存 + 速率限制）
 * @param {string} symbol - 代码如 'AAPL', 'SPY'
 * @param {Object} options - { start_date, end_date }
 */
async function getDailyCandles(symbol, options = {}) {
  const cacheKey = `${symbol}|${options.start_date || ''}|${options.end_date || ''}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  if (pending.has(cacheKey)) {
    return pending.get(cacheKey);
  }

  const promise = (async () => {
    let url = `${BASE_URL}/time_series?symbol=${symbol}&interval=1day&format=JSON&outputsize=5000&apikey=${API_KEY}`;
    if (options.start_date) url += `&start_date=${options.start_date}`;
    if (options.end_date) url += `&end_date=${options.end_date}`;

    const response = await rateLimitedFetch(url);
    const data = await response.json();

    if (data.status === 'error' || data.code) {
      throw new Error(`Twelve Data error: ${data.message || data.code}`);
    }

    const candles = (data.values || []).map(v => ({
      date: v.datetime.split(' ')[0],
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume)
    })).reverse();

    cache.set(cacheKey, candles);
    return candles;
  })();

  pending.set(cacheKey, promise);
  
  try {
    return await promise;
  } finally {
    pending.delete(cacheKey);
  }
}

/**
 * 批量获取（自动串行化，避免超标）
 * @param {string[]} symbols
 * @param {Object} options
 */
async function getBatchDailyCandles(symbols, options = {}) {
  const results = [];
  for (const sym of symbols) {
    try {
      const candles = await getDailyCandles(sym, options);
      results.push({ symbol: sym, candles, success: true });
    } catch (e) {
      results.push({ symbol: sym, error: e.message, success: false });
    }
    // 每批后稍作休息（12秒足够再拿8个credit）
    if (symbols.indexOf(sym) < symbols.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  return results;
}

/**
 * 搜索股票
 */
async function searchSymbol(keyword) {
  const url = `${BASE_URL}/symbol_search?symbol=${encodeURIComponent(keyword)}&apikey=${API_KEY}`;
  const response = await rateLimitedFetch(url);
  const data = await response.json();
  return (data.data || []).map(item => ({
    symbol: item.symbol,
    name: item.name || item.symbol,
    exchange: item.exchange
  }));
}

/**
 * 获取实时报价
 */
async function getQuote(symbol) {
  const url = `${BASE_URL}/quote?symbol=${symbol}&apikey=${API_KEY}`;
  const response = await rateLimitedFetch(url);
  const data = await response.json();
  if (data.status === 'error') throw new Error(data.message);
  return {
    symbol: data.symbol,
    price: parseFloat(data.close),
    change: parseFloat(data.percent_change) / 100,
    high: parseFloat(data.high),
    low: parseFloat(data.low),
    volume: parseInt(data.volume)
  };
}

module.exports = { getDailyCandles, getBatchDailyCandles, searchSymbol, getQuote };
