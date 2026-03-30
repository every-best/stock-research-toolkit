/**
 * stop_loss.js — 止损监控
 * 
 * AutoSearch 风格美股个股交易系统
 * 第四层：每日止损检查
 * 
 * 止损策略：
 * 1. 固定止损：亏损8%止损
 * 2. 移动止损：最高点回撤8%止损
 * 3. 时间止损：持有超过30天强制Review
 */

import { CONFIG } from './strategy_stock.js';

/**
 * 检查是否触发止损
 * 
 * @param {Object} holdings - 当前持仓 { symbol: { weight, shares, entryPrice, entryDate, peakPrice } }
 * @param {Object} currentPrices - 当前价格 { symbol: price }
 * @param {Object} options - 配置覆盖
 * @returns {Array} 需要止损出场的股票列表
 */
export function checkStopLoss(holdings, currentPrices, options = {}) {
  const config = { ...CONFIG, ...options };
  const toExit = [];

  console.log('\n🔴 止损检查:');
  console.log('─'.repeat(60));

  for (const [sym, pos] of Object.entries(holdings)) {
    if (!pos.weight || pos.weight <= 0) continue;
    
    const entry = pos.entryPrice;
    const current = currentPrices[sym];
    
    if (!entry || !current) continue;

    const drawdown = (current - entry) / entry;
    const drawdownPct = drawdown * 100;
    
    // 更新Peak Price
    if (current > (pos.peakPrice || entry)) {
      pos.peakPrice = current;
    }
    
    const peakDrawdown = pos.peakPrice 
      ? (current - pos.peakPrice) / pos.peakPrice 
      : 0;
    const peakDrawdownPct = peakDrawdown * 100;

    // 持有天数
    const holdDays = pos.entryDate 
      ? Math.floor((Date.now() - new Date(pos.entryDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    let exitReason = null;
    let exitPriority = 0;

    // 1. 固定止损：亏损超过阈值
    if (drawdown < -config.stopLoss) {
      exitReason = `固定止损 ${drawdownPct.toFixed(1)}%`;
      exitPriority = 1;
    }
    // 2. 移动止损：从峰值回撤超过阈值
    else if (peakDrawdown < -0.10) { // 10%移动止损
      exitReason = `移动止损 ${peakDrawdownPct.toFixed(1)}%`;
      exitPriority = 2;
    }
    // 3. 时间止损：持有过久
    else if (holdDays > 45) {
      exitReason = `时间止损 持有${holdDays}天`;
      exitPriority = 3;
    }
    // 4. RSI超买预警（观察）
    else if (pos.rsi && pos.rsi > 80) {
      exitReason = `RSI超买 ${pos.rsi.toFixed(1)}`;
      exitPriority = 4;
    }

    const status = exitReason 
      ? `❌ ${exitReason}` 
      : `✅ 正常 (回撤${drawdownPct >= 0 ? '+' : ''}${drawdownPct.toFixed(1)}%, 峰值${peakDrawdownPct >= 0 ? '+' : ''}${peakDrawdownPct.toFixed(1)}%)`;

    console.log(
      ` ${sym.padEnd(8)} ${(pos.name || '').padEnd(14).slice(0, 14)} ` +
      `现价$${current.toFixed(2).padEnd(10)} 进价$${entry.toFixed(2)} ` +
      `${status}`
    );

    if (exitReason) {
      toExit.push({
        symbol: sym,
        name: pos.name,
        shares: pos.shares,
        currentPrice: current,
        entryPrice: entry,
        drawdown: drawdownPct,
        peakDrawdown: peakDrawdownPct,
        holdDays,
        reason: exitReason,
        priority: exitPriority,
        exitValue: pos.shares * current
      });
    }
  }

  console.log('─'.repeat(60));

  // 按优先级排序
  toExit.sort((a, b) => a.priority - b.priority);

  if (toExit.length > 0) {
    console.log(`\n⚠️  需要止损 ${toExit.length} 只:`);
    for (const stock of toExit) {
      console.log(`   ${stock.symbol} ${stock.name}: ${stock.reason} 预计出场 $${stock.exitValue.toFixed(0)}`);
    }
  }

  return toExit;
}

/**
 * 计算持仓的当前价值
 */
export function calcHoldingsValue(holdings, currentPrices) {
  let totalValue = 0;
  const details = {};

  for (const [sym, pos] of Object.entries(holdings)) {
    const price = currentPrices[sym] || pos.entryPrice;
    const value = pos.shares * price;
    const cost = pos.shares * pos.entryPrice;
    const pnl = value - cost;
    const pnlPct = cost > 0 ? (pnl / cost * 100) : 0;
    
    details[sym] = {
      ...pos,
      currentPrice: price,
      currentValue: value,
      cost,
      pnl,
      pnlPct
    };
    
    totalValue += value;
  }

  return { totalValue, details };
}

/**
 * 生成持仓报告
 */
export function generateHoldingsReport(holdings, currentPrices) {
  const { totalValue, details } = calcHoldingsValue(holdings, currentPrices);
  
  console.log('\n📊 持仓报告:');
  console.log('─'.repeat(75));
  console.log(`${'代码'.padEnd(8)} ${'名称'.padEnd(12)} ${'持仓%'.padEnd(8)} ${'现价'.padEnd(10)} ${'市值'.padEnd(12)} ${'盈亏'.padEnd(10)} ${'天数'.padEnd(6)}`);
  console.log('─'.repeat(75));
  
  const sortedHoldings = Object.entries(details).sort((a, b) => b[1].weight - a[1].weight);
  
  for (const [sym, pos] of sortedHoldings) {
    const holdDays = pos.entryDate 
      ? Math.floor((Date.now() - new Date(pos.entryDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    console.log(
      `${sym.padEnd(8)} ${(pos.name || '').padEnd(12).slice(0, 12)} ` +
      `${(pos.weight * 100).toFixed(1).padEnd(8)}% ` +
      `$${pos.currentPrice.toFixed(2).padEnd(10)} ` +
      `$${pos.currentValue.toFixed(0).padEnd(12)} ` +
      `${pos.pnlPct >= 0 ? '+' : ''}${pos.pnlPct.toFixed(1).padEnd(10)}% ` +
      `${holdDays.toString().padEnd(6)}天`
    );
  }
  
  console.log('─'.repeat(75));
  console.log(`总市值: $${totalValue.toFixed(2)}`);
  console.log('');

  return { totalValue, details };
}

/**
 * 更新持仓记录
 */
export function updateHoldings(holdings, trades) {
  const updated = { ...holdings };

  // 执行买入
  for (const trade of trades.buy || []) {
    if (updated[trade.symbol]) {
      // 加仓
      const existing = updated[trade.symbol];
      const totalShares = existing.shares + trade.shares;
      const totalCost = existing.shares * existing.entryPrice + trade.shares * trade.price;
      updated[trade.symbol] = {
        ...existing,
        shares: totalShares,
        entryPrice: totalCost / totalShares,
        entryDate: existing.entryDate, // 保持最初的入场日期
        weight: existing.weight + (trade.dollarValue / 100000 * existing.weight)
      };
    } else {
      // 新建仓位
      updated[trade.symbol] = {
        symbol: trade.symbol,
        name: trade.name,
        shares: trade.shares,
        entryPrice: trade.price,
        entryDate: new Date().toISOString().split('T')[0],
        peakPrice: trade.price,
        weight: trade.dollarValue / 100000,
        sector: trade.sector
      };
    }
  }

  // 执行卖出
  for (const trade of trades.sell || []) {
    if (updated[trade.symbol]) {
      const existing = updated[trade.symbol];
      const remainingShares = existing.shares - trade.shares;
      
      if (remainingShares <= 0) {
        delete updated[trade.symbol];
      } else {
        updated[trade.symbol] = {
          ...existing,
          shares: remainingShares,
          weight: remainingShares * existing.entryPrice / 100000
        };
      }
    }
  }

  return updated;
}

export default { checkStopLoss, calcHoldingsValue, generateHoldingsReport, updateHoldings };
