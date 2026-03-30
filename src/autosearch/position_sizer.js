/**
 * position_sizer.js — 仓位分配
 * 
 * AutoSearch 风格美股个股交易系统
 * 第三层：按波动率分散仓位
 * 
 * 核心逻辑：
 * - 波动率越高 → 仓位越小
 * - 单股仓位上限 8%
 * - 最小建仓门槛 1%
 */

import { CONFIG } from './strategy_stock.js';

/**
 * 按波动率倒数分配仓位
 * 
 * @param {Object} signals - 当前有买入信号的股票 { symbol: signalDetails }
 * @param {Object} volatilities - 各股波动率 { symbol: annualVol }
 * @param {number} totalCapital - 总资金（用于计算金额）
 * @param {Object} options - 配置选项
 * @returns {Object} 仓位 { symbol: { weight, shares, dollarValue, entryPrice } }
 */
export function calcPositions(signals, volatilities = {}, totalCapital = 100000, options = {}) {
  const config = { ...CONFIG, ...options };
  
  // 获取当前有买入信号的候选股
  const candidates = Object.entries(signals)
    .filter(([sym, sig]) => sig.signal === 1.0 && (sig.score || 50) >= config.minScore)
    .map(([sym, sig]) => ({
      symbol: sym,
      name: sig.name,
      volatility: volatilities[sym] || sig.volatility || 0.25,
      momentum: sig.momentum,
      rsi: sig.rsi,
      score: sig.score || 50
    }))
    .sort((a, b) => b.score - a.score) // 按评分排序
    .slice(0, config.maxPositions); // 最多取前N个

  if (candidates.length === 0) {
    return {};
  }

  console.log(`\n📊 仓位分配: ${candidates.length} 只候选股票 (评分门槛≥${config.minScore})`);
  console.log('   按波动率倒数分配仓位...\n');

  // 波动率倒数权重
  const weights = {};
  let totalInvVol = 0;

  for (const stock of candidates) {
    const vol = Math.max(stock.volatility, 0.10);
    const invVol = 1 / vol;
    weights[stock.symbol] = { invVol, vol, rawWeight: 0 };
    totalInvVol += invVol;
  }

  // 归一化权重
  for (const stock of candidates) {
    weights[stock.symbol].rawWeight = weights[stock.symbol].invVol / totalInvVol;
  }

  // 目标总仓位：最多80%
  const targetTotalWeight = Math.min(
    candidates.length * config.maxPosition,
    0.80
  );

  // 分配
  const positions = {};
  let totalWeight = 0;

  for (const stock of candidates) {
    const rawWeight = weights[stock.symbol].rawWeight;
    // 按目标总仓位归一化
    let allocatedWeight = rawWeight * targetTotalWeight;
    allocatedWeight = Math.min(allocatedWeight, config.maxPosition);
    
    if (allocatedWeight >= 0.01) {
      const dollarValue = totalCapital * allocatedWeight;
      const currentPrice = signals[stock.symbol].price || 100;
      const shares = Math.floor(dollarValue / currentPrice);
      
      positions[stock.symbol] = {
        weight: allocatedWeight,
        shares,
        dollarValue,
        entryPrice: currentPrice,
        volatility: stock.volatility,
        momentum: stock.momentum,
        rsi: stock.rsi,
        score: stock.score,
        name: stock.name
      };
      
      totalWeight += allocatedWeight;
    }
  }

  // 第四步：显示分配结果
  console.log('─'.repeat(70));
  console.log('📈 仓位分配结果:');
  console.log('─'.repeat(70));
  console.log(`${'股票'.padEnd(8)} ${'名称'.padEnd(16)} ${'波动率'.padEnd(10)} ${'动量'.padEnd(10)} ${'仓位%'.padEnd(8)} ${'金额($)'.padEnd(12)}`);
  console.log('─'.repeat(70));
  
  const sortedPositions = Object.entries(positions)
    .sort((a, b) => b[1].weight - a[1].weight);
  
  for (const [sym, pos] of sortedPositions) {
    console.log(
      `${sym.padEnd(8)} ${(pos.name || '').padEnd(16).slice(0, 16)} ` +
      `${(pos.volatility * 100).toFixed(1).padEnd(10)}% ` +
      `${(pos.momentum * 100).toFixed(1).padEnd(10)}% ` +
      `${(pos.weight * 100).toFixed(1).padEnd(8)}% ` +
      `$${pos.dollarValue.toFixed(0).padEnd(12)}`
    );
  }
  
  console.log('─'.repeat(70));
  console.log(`总计仓位: ${(totalWeight * 100).toFixed(1)}%  现金保留: ${((1 - totalWeight) * 100).toFixed(1)}%`);
  console.log('');

  return positions;
}

/**
 * 调整现有持仓的仓位
 * 
 * @param {Object} currentPositions - 当前持仓
 * @param {Object} targetPositions - 目标仓位
 * @param {number} currentPrice - 当前价格
 * @returns {Object} 需要买卖的调整 { toBuy: [], toSell: [] }
 */
export function rebalancePositions(currentPositions, targetPositions, currentPrices = {}) {
  const toBuy = [];
  const toSell = [];
  
  const currentSymbols = new Set(Object.keys(currentPositions));
  const targetSymbols = new Set(Object.keys(targetPositions));

  // 需要卖出：当前持有没有在目标中的
  for (const sym of currentSymbols) {
    if (!targetSymbols.has(sym)) {
      toSell.push({
        symbol: sym,
        shares: currentPositions[sym].shares,
        currentPrice: currentPrices[sym] || currentPositions[sym].entryPrice,
        reason: '不在目标仓位中'
      });
    }
  }

  // 需要买卖：调整仓位差异
  for (const [sym, target] of Object.entries(targetPositions)) {
    const current = currentPositions[sym];
    const currentPrice = currentPrices[sym] || target.entryPrice;
    
    if (!current) {
      // 新买入
      toBuy.push({
        symbol: sym,
        shares: target.shares,
        price: target.entryPrice,
        reason: '新信号触发'
      });
    } else {
      // 调整现有仓位
      const weightDiff = target.weight - current.weight;
      if (Math.abs(weightDiff) > 0.005) { // 0.5%以上才调整
        if (weightDiff > 0) {
          const additionalShares = Math.floor((target.dollarValue - current.dollarValue) / currentPrice);
          if (additionalShares > 0) {
            toBuy.push({
              symbol: sym,
              shares: additionalShares,
              price: currentPrice,
              reason: `加仓 ${(weightDiff * 100).toFixed(1)}%`
            });
          }
        } else {
          const reduceShares = Math.floor((current.dollarValue - target.dollarValue) / currentPrice);
          if (reduceShares > 0) {
            toSell.push({
              symbol: sym,
              shares: reduceShares,
              currentPrice,
              reason: `减仓 ${(Math.abs(weightDiff) * 100).toFixed(1)}%`
            });
          }
        }
      }
    }
  }

  return { toBuy, toSell };
}

/**
 * 计算组合的整体波动率
 */
export function calcPortfolioVolatility(positions) {
  if (Object.keys(positions).length === 0) return 0;
  
  // 简化模型：假设各股不相关，组合波动率 ≈ Σ(wi * vi)
  let totalVol = 0;
  for (const [sym, pos] of Object.entries(positions)) {
    totalVol += (pos.weight || 0) * (pos.volatility || 0.25);
  }
  
  return totalVol;
}

export default { calcPositions, rebalancePositions, calcPortfolioVolatility };
