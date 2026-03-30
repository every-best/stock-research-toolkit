/**
 * research_loop.js — AutoSearch 研究循环
 * 
 * AutoSearch 风格美股个股交易系统
 * 主循环：每周运行一次，协调所有模块
 * 
 * 流程：
 * 1. 获取候选股票池（快速池或FMP筛选）
 * 2. 获取价格数据
 * 3. 生成交易信号
 * 4. 计算仓位
 * 5. 止损检查
 * 6. 生成报告
 */

import { getQuickUniverse, buildUniverse } from './universe.js';
import { getBatchHistory, getBatchRealTimePrices, prepareStrategyData } from './data_fetcher.js';
import { readBatchCache, writeBatchCache, getMissingSymbols } from './cache_manager.js';
import { generateSignals, getBuySignals, getSellSignals, scoreSignals, CONFIG } from './strategy_stock.js';
import { calcPositions, rebalancePositions } from './position_sizer.js';
import { checkStopLoss, generateHoldingsReport, updateHoldings } from './stop_loss.js';
import { getLastTradingDay, formatDate } from './utils.js';
import { loadHoldings, saveHoldings, loadHistory, saveHistory } from './storage.js';

/**
 * 主研究循环
 */
export async function runResearch(options = {}) {
  const {
    useQuickUniverse = true,
    maxPositions = 8,
    totalCapital = 100000,
    dryRun = true
  } = options;

  const today = formatDate(new Date());
  console.log('═'.repeat(70));
  console.log(`🎯 AutoSearch 美股个股研究循环 - ${today}`);
  console.log('═'.repeat(70));

  // ═══════════════════════════════════════════════════════════
  // 第一步：获取候选股票池
  // ═══════════════════════════════════════════════════════════
  console.log('\n📊 第一步：构建候选股票池');
  
  let universe;
  if (useQuickUniverse) {
    universe = getQuickUniverse();
  } else {
    universe = await buildUniverse({ industryFilter: true, maxResults: 30 });
  }

  const symbols = universe.map(s => s.symbol);
  console.log(`   候选股票: ${symbols.join(', ')}`);

  // ═══════════════════════════════════════════════════════════
  // 第二步：获取价格数据（优先从缓存读取）
  // ═══════════════════════════════════════════════════════════
  console.log('\n📥 第二步：获取价格数据');
  
  // 先尝试从缓存读取
  const cachedData = readBatchCache(symbols);
  const cachedSymbols = Object.keys(cachedData);
  const missingSymbols = getMissingSymbols(symbols);
  
  console.log(`   缓存命中: ${cachedSymbols.length} 只`);
  
  let priceData = { ...cachedData };
  
  // 只获取缓存未命中的股票
  if (missingSymbols.length > 0) {
    console.log(`   需要获取: ${missingSymbols.length} 只（速率限制请耐心等待）`);
    const newData = await getBatchHistory(missingSymbols, { outputSize: 252 });
    
    // 立即写入缓存
    if (Object.keys(newData).length > 0) {
      writeBatchCache(newData);
      console.log(`   缓存已写入: ${Object.keys(newData).length} 只`);
    }
    
    priceData = { ...priceData, ...newData };
  } else {
    console.log(`   全部命中缓存，无需API调用`);
  }
  
  const data = prepareStrategyData(universe, priceData);
  console.log(`   有效数据股票: ${Object.keys(priceData).length} 只`);

  // ═══════════════════════════════════════════════════════════
  // 第三步：生成交易信号
  // ═══════════════════════════════════════════════════════════
  console.log('\n📈 第三步：生成交易信号');
  
  const signals = generateSignals(data, CONFIG);
  const buySignals = getBuySignals(signals);
  const scoredSignals = scoreSignals(signals);
  
  console.log(`   买入信号: ${buySignals.length} 只`);
  for (const s of scoredSignals.slice(0, 5)) {
    console.log(`   ${s.symbol} ${s.name}: 评分${s.score} 动量${(s.momentum*100).toFixed(1)}% RSI=${s.rsi.toFixed(1)}`);
  }

  // ═══════════════════════════════════════════════════════════
  // 第四步：仓位分配
  // ═══════════════════════════════════════════════════════════
  console.log('\n💼 第四步：仓位分配');
  
  const currentPrices = {};
  for (const sym of symbols) {
    if (priceData[sym] && priceData[sym].length > 0) {
      currentPrices[sym] = priceData[sym][priceData[sym].length - 1].close;
    }
  }
  
  const volatilities = {};
  for (const [sym, klines] of Object.entries(priceData)) {
    if (klines && klines.length >= 20) {
      const closes = klines.map(k => k.close);
      const returns = closes.map((p, i) => i === 0 ? 0 : (p - closes[i-1]) / closes[i-1]);
      const recentReturns = returns.slice(-20);
      const std = Math.sqrt(recentReturns.reduce((sum, r) => sum + r * r, 0) / 19);
      volatilities[sym] = std * Math.sqrt(252); // 年化
    }
  }
  
  const targetPositions = calcPositions(signals, volatilities, totalCapital, { maxPosition: 0.08 });
  
  // ═══════════════════════════════════════════════════════════
  // 第五步：止损检查
  // ═══════════════════════════════════════════════════════════
  console.log('\n🔴 第五步：止损检查');
  
  const holdings = loadHoldings();
  const toStopLoss = checkStopLoss(holdings, currentPrices);
  
  // ═══════════════════════════════════════════════════════════
  // 第六步：持仓报告
  // ═══════════════════════════════════════════════════════════
  if (Object.keys(holdings).length > 0) {
    generateHoldingsReport(holdings, currentPrices);
  }

  // ═══════════════════════════════════════════════════════════
  // 第七步：生成操作信号
  // ═══════════════════════════════════════════════════════════
  console.log('\n📋 第七步：操作信号汇总');
  console.log('─'.repeat(60));
  
  const report = {
    date: today,
    newBuys: [],
    continueHold: [],
    stopLoss: [],
    totalWeight: 0,
    cashWeight: 1
  };

  // 新买入
  const existingSymbols = new Set(Object.keys(holdings));
  for (const [sym, pos] of Object.entries(targetPositions)) {
    if (!existingSymbols.has(sym)) {
      report.newBuys.push({
        symbol: sym,
        name: pos.name,
        weight: pos.weight,
        reason: pos.momentum > 0.15 ? '强动量' : '信号确认'
      });
    } else {
      report.continueHold.push({
        symbol: sym,
        name: pos.name,
        weight: pos.weight
      });
    }
  }

  // 止损
  for (const s of toStopLoss) {
    report.stopLoss.push({
      symbol: s.symbol,
      name: s.name,
      reason: s.reason,
      drawdown: s.drawdown
    });
  }

  // 计算总仓位
  const heldWeights = Object.values(holdings).reduce((sum, h) => sum + (h.weight || 0), 0);
  const targetWeights = Object.values(targetPositions).reduce((sum, p) => sum + (p.weight || 0), 0);
  report.totalWeight = heldWeights + (report.newBuys.length > 0 ? report.newBuys.reduce((sum, b) => sum + b.weight, 0) : 0);
  report.cashWeight = 1 - report.totalWeight;

  // ═══════════════════════════════════════════════════════════
  // 打印报告
  // ═══════════════════════════════════════════════════════════
  console.log(`
📊 AutoSearch 美股个股信号报告 - ${today}
${'─'.repeat(60)}

🆕 新增买入信号 (${report.newBuys.length} 只):`);
  
  for (const buy of report.newBuys) {
    console.log(`   ${buy.symbol.padEnd(8)} ${(buy.name || '').padEnd(14).slice(0, 14)} 仓位 ${(buy.weight * 100).toFixed(1)}%  [${buy.reason}]`);
  }

  if (report.newBuys.length === 0) {
    console.log('   (无)');
  }

  console.log(`
📌 继续持有 (${report.continueHold.length} 只):`);
  
  for (const hold of report.continueHold) {
    console.log(`   ${hold.symbol.padEnd(8)} ${(hold.name || '').padEnd(14).slice(0, 14)} 仓位 ${(hold.weight * 100).toFixed(1)}%`);
  }

  if (report.continueHold.length === 0) {
    console.log('   (无)');
  }

  console.log(`
🔴 止损出场 (${report.stopLoss.length} 只):`);
  
  for (const stop of report.stopLoss) {
    console.log(`   ${stop.symbol.padEnd(8)} ${(stop.name || '').padEnd(14).slice(0, 14)} ${stop.reason}`);
  }

  if (report.stopLoss.length === 0) {
    console.log('   (无)');
  }

  console.log(`
💰 仓位概览:
   总持仓: ${(report.totalWeight * 100).toFixed(1)}%
   现金保留: ${(report.cashWeight * 100).toFixed(1)}%
${'─'.repeat(60)}
`);

  // ═══════════════════════════════════════════════════════════
  // 飞书推送格式
  // ═══════════════════════════════════════════════════════════
  const feishuReport = formatFeishuReport(report);
  console.log('\n📱 飞书推送内容:');
  console.log(feishuReport);

  // ═══════════════════════════════════════════════════════════
  // 保存记录
  // ═══════════════════════════════════════════════════════════
  const history = loadHistory();
  history.signals.push(report);
  
  // 执行交易（模拟）
  if (!dryRun) {
    // TODO: 实现实际交易
    const trades = {
      buy: report.newBuys.map(b => ({
        symbol: b.symbol,
        name: b.name,
        shares: Math.floor(totalCapital * b.weight / currentPrices[b.symbol]),
        price: currentPrices[b.symbol],
        dollarValue: totalCapital * b.weight
      })),
      sell: report.stopLoss.map(s => ({
        symbol: s.symbol,
        shares: holdings[s.symbol]?.shares || 0,
        price: s.currentPrice
      }))
    };
    
    const updatedHoldings = updateHoldings(holdings, trades);
    saveHoldings(updatedHoldings);
    history.trades.push({ date: today, ...trades });
  }
  
  saveHistory(history);

  return report;
}

/**
 * 格式化飞书推送内容
 */
function formatFeishuReport(report) {
  let text = `📊 **AutoSearch 美股个股信号 ${report.date}**
${'─'.repeat(50)}

🆕 **新增买入** (${report.newBuys.length} 只):`;

  if (report.newBuys.length === 0) {
    text += '\n   (无新信号)';
  } else {
    for (const buy of report.newBuys) {
      text += `\n   • ${buy.symbol} ${buy.name} 仓位${(buy.weight * 100).toFixed(1)}% [${buy.reason}]`;
    }
  }

  text += `

📌 **继续持有** (${report.continueHold.length} 只):`;

  if (report.continueHold.length === 0) {
    text += '\n   (无持仓)';
  } else {
    for (const hold of report.continueHold) {
      text += `\n   • ${hold.symbol} ${hold.name} ${(hold.weight * 100).toFixed(1)}%`;
    }
  }

  text += `

🔴 **止损出场** (${report.stopLoss.length} 只):`;

  if (report.stopLoss.length === 0) {
    text += '\n   (无触发)';
  } else {
    for (const stop of report.stopLoss) {
      text += `\n   • ${stop.symbol} ${stop.name} — ${stop.reason}`;
    }
  }

  text += `

💰 **仓位**: ${(report.totalWeight * 100).toFixed(1)}% 持仓 / ${(report.cashWeight * 100).toFixed(1)}% 现金`;

  return text;
}

export default { runResearch };
