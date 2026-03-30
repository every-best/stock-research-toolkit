/**
 * value_screen.js — 价值低估筛选
 * 
 * 基于价格位置筛选被低估的股票
 * 指标：从高点回调幅度、价格vs均线、52周位置
 */

import { readBatchCache } from './cache_manager.js';

const symbols = ['NVDA', 'MSFT', 'AAPL', 'GOOGL', 'META', 'AVGO', 'CRM', 'ORCL', 'AMD', 'INTC', 
                'LLY', 'UNH', 'JNJ', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'BMY', 'AMGN',
                'BA', 'RTX', 'LMT', 'NOC', 'GD', 'HON', 'CAT', 'GE', 'CCJ', 'DNN',
                'LEU', 'NNE', 'OKLO', 'VST', 'CEG'];

const allData = readBatchCache(symbols);
const analysis = [];

for (const [symbol, candles] of Object.entries(allData)) {
  if (!candles || candles.length < 252) continue;
  
  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];
  
  // 1年均线
  const ma252 = closes.reduce((a, b) => a + b, 0) / closes.length;
  
  // 历史高点（全部数据）
  const highAll = Math.max(...closes);
  
  // 从高点回调
  const drawdown = (currentPrice - highAll) / highAll;
  
  // 价格vs均线
  const priceVsMa = (currentPrice - ma252) / ma252;
  
  // 52周区间
  const high52w = Math.max(...closes.slice(-252));
  const low52w = Math.min(...closes.slice(-252));
  const position52w = (currentPrice - low52w) / (high52w - low52w);
  
  analysis.push({
    symbol,
    currentPrice,
    ma252,
    highAll,
    drawdown,
    priceVsMa,
    high52w,
    low52w,
    position52w
  });
}

// 按从高点回调排序
analysis.sort((a, b) => a.drawdown - b.drawdown);

console.log('最被低估的20只（从历史高点跌幅最大）');
console.log('股票   现价     高点      高点回调  1年均线  价格vs均线  52W位置');
console.log('-'.repeat(75));

for (const s of analysis.slice(0, 20)) {
  console.log(
    s.symbol.padEnd(8) + ' ' +
    '$' + s.currentPrice.toFixed(2).padEnd(9) + ' ' +
    '$' + s.highAll.toFixed(2).padEnd(9) + ' ' +
    (s.drawdown * 100).toFixed(1).padEnd(7) + '% ' +
    '$' + s.ma252.toFixed(2).padEnd(9) + ' ' +
    (s.priceVsMa * 100).toFixed(1).padEnd(9) + '% ' +
    (s.position52w * 100).toFixed(0) + '%'
  );
}

// 价格最低的10只
console.log('\n\n价格最低的10只（绝对价格）');
console.log('股票   现价');
const byPrice = [...analysis].sort((a, b) => a.currentPrice - b.currentPrice);
for (const s of byPrice.slice(0, 10)) {
  console.log(s.symbol.padEnd(8) + ' $' + s.currentPrice.toFixed(2));
}

// 最接近历史高点的
console.log('\n\n最接近历史高点的10只（强势股）');
const byHigh = [...analysis].sort((a, b) => b.drawdown - a.drawdown);
for (const s of byHigh.slice(0, 10)) {
  console.log(s.symbol.padEnd(8) + ' $' + s.currentPrice.toFixed(2) + ' 距离高点 ' + (s.drawdown * 100).toFixed(1) + '%');
}
