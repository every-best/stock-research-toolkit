/**
 * regression_analysis.js — 回归预测模块
 * 
 * 使用线性回归预测未来收益率
 * 特征：动量、波动率、RSI、均线偏离度
 */

import { readBatchCache } from './cache_manager.js';
import { rollingMean, pctChange } from './utils.js';

// 目标股票池（价值投资方向）
const VALUE_STOCKS = [
  { symbol: 'UNH', name: 'UnitedHealth', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer', sector: 'Healthcare' },
  { symbol: 'ORCL', name: 'Oracle', sector: 'Technology' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'MRK', name: 'Merck', sector: 'Healthcare' },
  { symbol: 'GD', name: 'General Dynamics', sector: 'Defense' },
  { symbol: 'OKLO', name: 'Oklo', sector: 'Nuclear' },
  { symbol: 'NNE', name: 'Nano Nuclear', sector: 'Nuclear' },
  { symbol: 'LEU', name: 'Centrus Energy', sector: 'Nuclear' },
];

/**
 * 计算单只股票的特征
 */
function extractFeatures(candles) {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  
  const n = closes.length;
  if (n < 60) return null;
  
  // 日收益率
  const returns = [];
  for (let i = 1; i < n; i++) {
    returns.push((closes[i] - closes[i-1]) / closes[i-1]);
  }
  
  // 特征计算
  const currentPrice = closes[n - 1];
  
  // 均线
  const ma20 = rollingMean(closes.slice(-20), 20)[20-1] || currentPrice;
  const ma60 = rollingMean(closes.slice(-60), 60)[60-1] || currentPrice;
  const ma120 = rollingMean(closes.slice(-120), 120)[120-1] || currentPrice;
  
  // 动量（不同窗口）
  const mom5 = pctChange(closes, 5)[n-1] || 0;
  const mom20 = pctChange(closes, 20)[n-1] || 0;
  const mom60 = pctChange(closes, 60)[n-1] || 0;
  
  // 波动率
  const vol20 = computeVolatility(returns.slice(-20));
  const vol60 = computeVolatility(returns.slice(-60));
  
  // RSI
  const rsi14 = computeRSI(returns.slice(-15));
  
  // 均线偏离度
  const priceVsMa20 = (currentPrice - ma20) / ma20;
  const priceVsMa60 = (currentPrice - ma60) / ma60;
  const priceVsMa120 = (currentPrice - ma120) / ma120;
  
  // 未来收益率（用于训练）
  const futureReturn = returns.length > 20 
    ? returns.slice(0, 20).reduce((a, b) => a + b, 0) / 20 
    : 0;
  
  return {
    symbol: candles[0]?.symbol || '',
    currentPrice,
    ma20, ma60, ma120,
    mom5, mom20, mom60,
    vol20, vol60,
    rsi14,
    priceVsMa20, priceVsMa60, priceVsMa120,
    futureReturn,
    // 标准化特征（用于回归）
    features: [
      mom20,       // 20日动量
      vol20,       // 20日波动率
      rsi14 / 100, // RSI标准化
      priceVsMa20, // 均线偏离
      mom5 / (mom20 + 0.001) // 短期/中期动量比
    ]
  };
}

/**
 * 计算波动率
 */
function computeVolatility(returns) {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  return Math.sqrt(variance * 252); // 年化
}

/**
 * 计算RSI
 */
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
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * 简单线性回归
 */
function linearRegression(x, y) {
  const n = x.length;
  if (n !== y.length || n < 2) return null;
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // R²
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yPred = slope * x[i] + intercept;
    ssTot += Math.pow(y[i] - yMean, 2);
    ssRes += Math.pow(y[i] - yPred, 2);
  }
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  
  return { slope, intercept, rSquared };
}

/**
 * 主预测函数
 */
export function runRegressionAnalysis() {
  console.log('='.repeat(70));
  console.log('📈 回归预测分析 — 价值投资池');
  console.log('='.repeat(70));
  
  const results = [];
  
  // 提取每只股票的特征
  for (const stock of VALUE_STOCKS) {
    const candles = readBatchCache([stock.symbol])[stock.symbol];
    if (!candles || candles.length < 120) {
      console.log(`${stock.symbol}: 数据不足 (${candles?.length || 0} 条)`);
      continue;
    }
    
    // 标记symbol
    const labeled = candles.map(c => ({ ...c, symbol: stock.symbol }));
    const features = extractFeatures(labeled);
    
    if (features) {
      results.push({ ...stock, ...features });
    }
  }
  
  if (results.length === 0) {
    console.log('没有足够数据进行分析');
    return [];
  }
  
  // 使用历史滚动窗口数据进行回归
  // 特征: [动量20日, 波动率, RSI, 均线偏离, 短期/中期动量比]
  // 目标: 未来20日收益率
  
  const allFeatures = [];
  const allTargets = [];
  
  for (const stock of results) {
    // 模拟多个滚动窗口
    const candles = readBatchCache([stock.symbol])[stock.symbol];
    if (!candles || candles.length < 252) continue;
    
    // 取中间段数据（避免首尾效应）
    const windowSize = 20;
    for (let i = 100; i < candles.length - windowSize - 10; i += 10) {
      const window = candles.slice(i, i + 60);
      const closes = window.map(c => c.close);
      const returns = [];
      for (let j = 1; j < closes.length; j++) {
        returns.push((closes[j] - closes[j-1]) / closes[j-1]);
      }
      
      if (returns.length < 60) continue;
      
      const mom20 = pctChange(closes, 20)[20-1] || 0;
      const vol20 = computeVolatility(returns.slice(-20));
      const rsi14 = computeRSI(returns.slice(-15));
      const ma20 = rollingMean(closes.slice(-20), 20)[20-1] || closes[closes.length-1];
      const priceVsMa20 = (closes[closes.length-1] - ma20) / ma20;
      const mom5 = pctChange(closes, 5)[5-1] || 0;
      
      // 未来20日收益率
      const futureReturns = [];
      const startIdx = i + 60;
      const endIdx = Math.min(startIdx + windowSize, candles.length);
      for (let j = startIdx; j < endIdx; j++) {
        futureReturns.push((candles[j].close - candles[j-1].close) / candles[j-1].close);
      }
      const futureReturn = futureReturns.length > 0 
        ? futureReturns.reduce((a, b) => a + b, 0) / futureReturns.length 
        : 0;
      
      allFeatures.push([
        mom20,
        vol20,
        rsi14 / 100,
        priceVsMa20,
        mom5 / (mom20 + 0.001)
      ]);
      allTargets.push(futureReturn);
    }
  }
  
  // 训练简单线性回归模型
  // 使用第一个特征（动量）做单变量回归作为演示
  const x = allFeatures.map(f => f[0]); // 动量
  const y = allTargets;
  
  const reg = linearRegression(x, y);
  
  console.log('\n📊 单变量线性回归结果（动量 → 未来收益）');
  console.log('-'.repeat(50));
  if (reg) {
    console.log(`斜率: ${(reg.slope * 100).toFixed(4)}%`);
    console.log(`截距: ${(reg.intercept * 100).toFixed(4)}%`);
    console.log(`R²: ${reg.rSquared.toFixed(4)}`);
    console.log(`解释: 动量每增加1%, 未来收益预期增加 ${(reg.slope * 100).toFixed(4)}%`);
  }
  
  // 预测各股票的未来收益
  console.log('\n🎯 各股票未来收益预测');
  console.log('-'.repeat(70));
  console.log('股票   名称              当前价   动量(20日)  波动率   RSI    预测收益(20日)');
  console.log('-'.repeat(70));
  
  const predictions = [];
  for (const stock of results) {
    // 用回归模型预测
    let predictedReturn = 0;
    if (reg && reg.rSquared > 0.01) {
      predictedReturn = reg.slope * stock.mom20 + reg.intercept;
    } else {
      // 无显著回归时用动量均值
      predictedReturn = stock.mom20 * 0.3;
    }
    
    predictions.push({
      ...stock,
      predictedReturn
    });
    
    console.log(
      stock.symbol.padEnd(8) + ' ' +
      stock.name.padEnd(18) + ' ' +
      '$' + stock.currentPrice.toFixed(2).padEnd(9) + ' ' +
      (stock.mom20 * 100).toFixed(1).padEnd(12) + '% ' +
      (stock.vol20 * 100).toFixed(1).padEnd(9) + '% ' +
      stock.rsi14.toFixed(1).padEnd(7) + ' ' +
      (predictedReturn * 100 > 0 ? '+' : '') + (predictedReturn * 100).toFixed(2) + '%'
    );
  }
  
  // 按预测收益排序
  predictions.sort((a, b) => b.predictedReturn - a.predictedReturn);
  
  console.log('\n📋 预测收益排序（从高到低）');
  console.log('-'.repeat(50));
  for (const p of predictions) {
    const direction = p.predictedReturn > 0 ? '📈' : '📉';
    console.log(
      `${direction} ${p.symbol.padEnd(8)} ${(p.predictedReturn * 100).toFixed(2).padStart(7)}%  ${p.name}`
    );
  }
  
  console.log('\n⚠️  注意: 回归预测仅供参考，市场有风险，投资需谨慎');
  
  return predictions;
}

export default { runRegressionAnalysis };
