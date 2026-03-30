/**
 * strategy_stock.js — 个股价格信号生成
 * 
 * AutoSearch 风格美股个股交易系统
 * 第二层：价格信号（MA + RSI + 动量）
 * 
 * 与 ETF 策略的区别：
 * - 动量窗口更短（90天 vs 120天）
 * - 均线参数更短（150天 vs 200天）
 * - 加入财报日回避逻辑
 */

import { rollingMean, pctChange, fillNaN, ffill } from './utils.js';

export const CONFIG = {
  // 动量窗口（天数）
  momentumWindow: 90,
  
  // 均线周期（天数）
  maFilter: 150,
  
  // RSI 参数
  rsiPeriod: 14,
  
  // RSI 区间
  rsiLow: 50,
  rsiHigh: 75,
  
  // 止损线（跌X%出场）
  stopLoss: 0.08,
  
  // 单股最大仓位（20%）
  maxPosition: 0.20,
  
  // 最小动量阈值（排除横盘）
  minMomentum: 0.05,
  
  // 最小评分门槛（建仓需要）
  minScore: 20,
  
  // 最多同时持仓股票数
  maxPositions: 8,
  
  // 调仓频率
  rebalanceFreq: 'W', // W=周, D=日
};

/**
 * 计算 RSI
 */
function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) {
    return prices.map(() => NaN);
  }
  
  const changes = prices.map((p, i) => i === 0 ? 0 : p - prices[i - 1]);
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

  const rsi = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      rsi.push(NaN);
      continue;
    }
    
    const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

/**
 * 计算波动率（年化）
 */
function calcVolatility(prices, window = 20) {
  if (prices.length < window + 1) {
    return prices.map(() => 0.2); // 默认20%波动率
  }
  
  const returns = prices.map((p, i) => i === 0 ? 0 : (p - prices[i - 1]) / prices[i - 1]);
  
  const volatilities = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < window) {
      volatilities.push(NaN);
      continue;
    }
    
    const slice = returns.slice(i - window, i);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (slice.length - 1);
    const annualVol = Math.sqrt(variance * 252); // 年化
    volatilities.push(annualVol);
  }
  
  return volatilities;
}

/**
 * 生成单只股票的交易信号
 */
function generateStockSignal(prices, config) {
  if (!prices || prices.length < config.maFilter + 10) {
    return { signal: 0, details: {} };
  }

  const ma = rollingMean(prices, config.maFilter);
  const momentum = pctChange(prices, config.momentumWindow);
  const rsi = calcRSI(prices, config.rsiPeriod);
  const volatility = calcVolatility(prices, 20);

  const currentPrice = prices[prices.length - 1];
  const currentMA = ma[ma.length - 1];
  const currentMomentum = momentum[momentum.length - 1];
  const currentRSI = rsi[rsi.length - 1];
  const currentVol = volatility[volatility.length - 1];

  // 信号判定
  const trendUp = currentPrice > currentMA;           // 价格在均线上方
  const momentumPositive = currentMomentum > config.minMomentum;  // 动量为正
  const rsiHealthy = currentRSI > config.rsiLow && currentRSI < config.rsiHigh; // RSI 适中

  // 三者同时满足 = 买入信号
  let signal = 0;
  let signalReason = '';
  
  if (trendUp && momentumPositive && rsiHealthy) {
    signal = 1;
    signalReason = `趋势↑ MA+, 动量+${(currentMomentum * 100).toFixed(1)}%, RSI=${currentRSI.toFixed(1)}`;
  } else if (currentPrice < currentMA) {
    signal = -1;
    signalReason = `趋势↓ 价格<MA`;
  } else if (currentRSI >= config.rsiHigh) {
    signal = -1;
    signalReason = `RSI超买 ${currentRSI.toFixed(1)}`;
  }

  return {
    signal,
    details: {
      price: currentPrice,
      ma: currentMA,
      momentum: currentMomentum,
      rsi: currentRSI,
      volatility: currentVol || 0.25,
      reason: signalReason
    }
  };
}

/**
 * 对整个候选池生成信号
 * 
 * @param {Object} data - 包含 universe 和 price 数据
 * @param {Object} config - 策略配置
 * @returns {Object} signals - { symbol: { signal, details } }
 */
export function generateSignals(data, config = CONFIG) {
  const results = {};
  const universe = data.universe || [];

  for (const stock of universe) {
    const sym = stock.symbol;
    const priceKey = `close_${sym}`;
    
    if (!data[priceKey] || data[priceKey].length < config.maFilter + 10) {
      continue;
    }

    const prices = data[priceKey];
    const { signal, details } = generateStockSignal(prices, config);

    results[sym] = {
      signal,
      ...details,
      name: stock.name,
      sector: stock.sector
    };
  }

  return results;
}

/**
 * 获取当前有买入信号的股票列表
 */
export function getBuySignals(signals) {
  return Object.entries(signals)
    .filter(([_, v]) => v.signal === 1)
    .map(([sym, v]) => ({ symbol: sym, ...v }))
    .sort((a, b) => b.momentum - a.momentum); // 按动量排序
}

/**
 * 获取当前需要卖出的股票列表
 */
export function getSellSignals(signals, currentPositions) {
  const toSell = [];
  
  for (const [sym, pos] of Object.entries(currentPositions)) {
    if (pos.weight <= 0) continue;
    
    const sig = signals[sym];
    if (sig && sig.signal === -1) {
      toSell.push({
        symbol: sym,
        name: sig.name,
        reason: sig.reason,
        currentPrice: sig.price,
        weight: pos.weight,
        entryPrice: pos.entryPrice
      });
    }
  }
  
  return toSell;
}

/**
 * 信号评分（用于排序和选择）
 */
export function scoreSignals(signals) {
  return Object.entries(signals)
    .filter(([_, v]) => v.signal === 1)
    .map(([sym, v]) => ({
      symbol: sym,
      name: v.name,
      sector: v.sector,
      score: (
        (v.momentum > 0.15 ? 30 : 0) +          // 强动量加分
        (v.rsi > 55 && v.rsi < 70 ? 20 : 0) +   // RSI 适中加分
        (v.volatility < 0.35 ? 15 : 0) +        // 低波动加分
        (v.trendUp ? 10 : 0)                     // 趋势确认
      ),
      momentum: v.momentum,
      rsi: v.rsi,
      volatility: v.volatility
    }))
    .sort((a, b) => b.score - a.score);
}

export { calcRSI, calcVolatility };
export default { generateSignals, getBuySignals, getSellSignals, scoreSignals, CONFIG };
