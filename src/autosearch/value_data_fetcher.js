/**
 * value_data_fetcher.js — 价值投资数据获取
 * 
 * 支持：港股（东方财富）+ 美股（Twelve Data）
 */

import axios from "axios";

// Twelve Data API Key
const TD_KEY = 'e6d630d07cbb49afacef2f67ef4dcc4f';
const TD_BASE_URL = 'https://api.twelvedata.com';
const EM_BASE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';

// 速率控制
const MIN_INTERVAL_MS = 7500;
let lastCallTime = 0;

async function rateLimitSleep() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastCallTime = Date.now();
}

/**
 * 腾讯财经获取港股K线
 */
async function getEMHKCandles(symbol, options = {}) {
  const { outputSize = 252 } = options;
  
  // 腾讯财经格式: hk00700
  const tencentCode = symbol.replace('.HK', '').toLowerCase();
  const paddedCode = tencentCode.padStart(5, '0');
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?_var=kline_dayqfq&param=hk${paddedCode},day,,,${outputSize},qfq&r=0.1`;

  try {
    await rateLimitSleep();
    const res = await axios.get(url, {
      headers: {
        'Referer': 'https://gu.qq.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    // 解析 JSONP 响应
    const text = res.data;
    const jsonStr = text.replace(/^[^=]+=/, '');
    const json = JSON.parse(jsonStr);
    
    const dayData = json?.data?.[`hk${paddedCode}`]?.day;
    if (!dayData || dayData.length === 0) {
      return [];
    }

    return dayData.map(item => {
      // item: ["2024-12-06","406.800","412.600","414.600","405.000","27711445.000", {...}]
      return {
        date: item[0],
        open: parseFloat(item[1]),
        close: parseFloat(item[2]),
        high: parseFloat(item[3]),
        low: parseFloat(item[4]),
        volume: parseInt(parseFloat(item[5]))
      };
    });
  } catch (err) {
    console.error(`获取港股 ${symbol} 失败:`, err.message);
    return [];
  }
}

/**
 * Twelve Data 获取美股K线
 */
async function getTDCandles(symbol, options = {}) {
  const { outputSize = 252 } = options;
  
  try {
    await rateLimitSleep();
    const url = `${TD_BASE_URL}/time_series?symbol=${symbol}&interval=1day&outputsize=${outputSize}&format=JSON&dp=2&apikey=${TD_KEY}`;
    const res = await axios.get(url);
    const data = res.data;

    if (data.status === 'error' || !data.values || data.values.length === 0) {
      return [];
    }

    return data.values.slice().reverse().map(v => ({
      date: v.datetime.split(' ')[0],
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume)
    }));
  } catch (err) {
    console.error(`获取美股 ${symbol} 失败:`, err.message);
    return [];
  }
}

/**
 * 获取单只股票K线（自动识别市场）
 */
export async function getCandles(symbol, options = {}) {
  if (symbol.endsWith('.HK')) {
    return getEMHKCandles(symbol, options);
  } else {
    return getTDCandles(symbol, options);
  }
}

/**
 * 批量获取多只股票
 */
export async function getBatchCandles(stocks, options = {}) {
  const { outputSize = 252 } = options;
  
  console.log(`\n📥 批量获取 ${stocks.length} 只股票数据`);
  console.log(`   港股: ${stocks.filter(s => s.symbol.endsWith('.HK')).length} 只`);
  console.log(`   美股: ${stocks.filter(s => !s.symbol.endsWith('.HK')).length} 只`);
  
  const results = {};
  
  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    const candles = await getCandles(stock.symbol, { outputSize });
    
    if (candles.length > 100) {
      results[stock.symbol] = candles;
      console.log(`   [${i + 1}/${stocks.length}] ${stock.symbol} ✅ ${candles.length} 条`);
    } else {
      console.log(`   [${i + 1}/${stocks.length}] ${stock.symbol} ❌`);
    }
  }
  
  console.log(`\n✅ 成功获取: ${Object.keys(results).length}/${stocks.length} 只`);
  return results;
}

/**
 * 计算价值投资指标
 */
export function calcValueMetrics(candles) {
  if (!candles || candles.length < 60) return null;
  
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  
  const currentPrice = closes[closes.length - 1];
  
  // 均线系统
  const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
  const ma60 = closes.slice(-60).reduce((a, b) => a + b, 0) / Math.min(60, closes.length);
  const ma252 = closes.reduce((a, b) => a + b, 0) / closes.length;
  
  // 动量
  const mom20 = (currentPrice - closes[Math.max(0, closes.length - 21)]) / closes[Math.max(0, closes.length - 21)];
  const mom60 = (currentPrice - closes[Math.max(0, closes.length - 61)]) / closes[Math.max(0, closes.length - 61)];
  
  // 波动率（年化）
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i-1]) / closes[i-1]);
  }
  const vol20 = Math.sqrt(returns.slice(-20).reduce((s, r) => s + r * r, 0) / 19) * Math.sqrt(252);
  
  // RSI
  const rsi = computeRSI(returns.slice(-15));
  
  // 价格位置
  const high252 = Math.max(...closes.slice(-252));
  const low252 = Math.min(...closes.slice(-252));
  const priceVsHigh252 = (currentPrice - high252) / high252;
  const priceVsMa252 = (currentPrice - ma252) / ma252;
  
  // 52周区间位置
  const high52w = Math.max(...closes.slice(-252));
  const low52w = Math.min(...closes.slice(-252));
  const position52w = (currentPrice - low52w) / (high52w - low52w);
  
  return {
    currentPrice,
    ma20, ma60, ma252,
    mom20, mom60,
    vol20,
    rsi,
    high252, low252,
    priceVsHigh252,
    priceVsMa252,
    position52w
  };
}

function computeRSI(returns) {
  if (returns.length < 2) return 50;
  let gains = 0, losses = 0;
  for (const r of returns) {
    if (r > 0) gains += r;
    else losses += Math.abs(r);
  }
  const avgGain = gains / returns.length;
  const avgLoss = losses / returns.length;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

export default { getCandles, getBatchCandles, calcValueMetrics };
