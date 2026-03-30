/**
 * Finnhub 数据获取模块 - 美股
 * API Key: d74allhr01qno4q12eagd74allhr01qno4q12eb0
 */

const API_KEY = 'd74allhr01qno4q12eagd74allhr01qno4q12eb0';
const BASE_URL = 'https://finnhub.io/api/v1';

/**
 * 获取日K线数据
 * @param {string} symbol - 股票代码，如 'AAPL'
 * @param {number} from - Unix timestamp 开始时间
 * @param {number} to - Unix timestamp 结束时间
 */
async function getDailyCandles(symbol, from, to) {
  const url = `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.s !== 'ok') {
    throw new Error(`Finnhub API error: ${data.s} for ${symbol}`);
  }
  
  // 转换格式: { t, o, h, l, c, v } → [{ date, open, high, low, close, volume }]
  const candles = [];
  const count = data.t.length;
  
  for (let i = 0; i < count; i++) {
    candles.push({
      date: new Date(data.t[i] * 1000).toISOString().split('T')[0],
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i]
    });
  }
  
  return candles;
}

/**
 * 获取单只股票近期日K线（最近 count 个交易日）
 */
async function getRecentCandles(symbol, count = 365) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - count * 86400 * 2; // 多取一些冗余
  return getDailyCandles(symbol, from, to);
}

/**
 * 搜索股票
 */
async function searchSymbol(keyword) {
  const url = `${BASE_URL}/search?q=${encodeURIComponent(keyword)}&token=${API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return (data.result || []).map(item => ({
    symbol: item.symbol,
    name: item.description,
    type: item.type,
    exchange: item.exchange
  }));
}

/**
 * 获取基本面数据
 */
async function getProfile(symbol) {
  const url = `${BASE_URL}/stock/profile2?symbol=${symbol}&token=${API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

/**
 * 获取财务指标
 */
async function getFinancialMetrics(symbol) {
  const url = `${BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

module.exports = {
  getDailyCandles,
  getRecentCandles,
  searchSymbol,
  getProfile,
  getFinancialMetrics
};
