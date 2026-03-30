/**
 * 基金批量研究
 * 
 * 使用方法:
 *   node index.js research-funds [startDate]
 *   node index.js research-funds 2023-01-01
 */

const fund = require('../data/fund');
const { CombinedStrategy, RSIStrategy, MAStrategy } = require('../backtester/strategies');
const Backtester = require('../backtester/engine');

// 基金组合
const FUNDS = {
  '000001': { name: '华夏成长混合', type: 'index', risk: 'high' },
  '110022': { name: '易方达消费行业', type: 'active', risk: 'high' },
  '006228': { name: '中欧医疗健康A', type: 'active', risk: 'high' },
  '001875': { name: '平安策略先锋', type: 'active', risk: 'high' },
  '519068': { name: '汇添富成长', type: 'active', risk: 'high' },
  '320006': { name: '诺安灵活配置', type: 'active', risk: 'medium' },
  '000143': { name: '广发聚鑫债券', type: 'bond', risk: 'low' },
  '040040': { name: '华安纯债债券', type: 'bond', risk: 'low' },
};

async function getFundCandlesWithRetry(code, startDate) {
  const maxRetries = 2;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fund.getFundCandles(code, { startDate, endDate: '2026-03-29' });
    } catch (e) {
      if (i === maxRetries - 1) return null;
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

async function runFundResearch(startDate = '2023-01-01') {
  const bt = new Backtester({ initialCapital: 100000, positionSize: 1.0 });
  const strat = new CombinedStrategy();
  const params = { maFast: 15, maSlow: 20, rsiPeriod: 14, rsiOversold: 25, rsiOverbought: 70 };

  console.log('══════════════════════════════════════════════════');
  console.log('📊 A股基金策略研究 — MA+RSI 组合策略');
  console.log('══════════════════════════════════════════════════');
  console.log('数据范围:', startDate, '-> 2026-03-29\n');

  const results = [];
  const entries = Object.entries(FUNDS);
  let count = 0;

  for (const [code, info] of entries) {
    count++;
    process.stdout.write(`[${count}/${entries.length}] ${code} (${info.name})... `);

    const candles = await getFundCandlesWithRetry(code, startDate);

    if (!candles || candles.length < 50) {
      console.log('❌ 数据不足');
      results.push({ code, name: info.name, type: info.type, risk: info.risk, error: '数据不足' });
      continue;
    }

    const r = bt.run(candles, strat, params);
    const sharpe = parseFloat(r.sharpeRatio);
    const ann = parseFloat((r.annualizedReturn * 100).toFixed(1));
    const dd = parseFloat((r.maxDrawdown * 100).toFixed(1));
    const ret = parseFloat((r.totalReturn * 100).toFixed(1));
    const trades = r.totalTrades;
    const winRate = parseFloat(r.winRate);

    console.log(`Sharpe=${sharpe} 收益=${ret}% 年化=${ann}% DD=${dd}% 胜率=${winRate} 交易=${trades}`);

    results.push({
      code, name: info.name, type: info.type, risk: info.risk,
      sharpe, annualizedReturn: ann, maxDrawdown: dd,
      totalReturn: ret, winRate, trades, candles: candles.length
    });
  }

  // 汇总
  console.log('\n' + '═'.repeat(60));
  console.log('📋 基金研究结果（按 Sharpe 降序）');
  console.log('═'.repeat(60) + '\n');

  const sorted = results
    .filter(r => r.sharpe !== undefined)
    .sort((a, b) => b.sharpe - a.sharpe);

  console.log('代码'.padEnd(10) + '名称'.padEnd(14) + '类型'.padEnd(8) + 'Sharpe   年化%   回撤%   胜率%   交易');
  console.log('─'.repeat(65));
  for (const r of sorted) {
    console.log(
      r.code.padEnd(10) + r.name.padEnd(14) + r.type.padEnd(8) +
      r.sharpe.toFixed(2).padStart(6) + '  ' +
      r.annualizedReturn.toString().padStart(6) + '  ' +
      r.maxDrawdown.toString().padStart(6) + '  ' +
      r.winRate.toFixed(2).padStart(6) + '  ' +
      r.trades.toString().padStart(4)
    );
  }

  // 按类型汇总
  const types = ['active', 'index', 'bond'];
  console.log('\n' + '─'.repeat(60));
  console.log('📈 类别平均 Sharpe');
  console.log('─'.repeat(60));
  for (const t of types) {
    const valid = results.filter(r => r.type === t && r.sharpe !== undefined);
    if (valid.length === 0) continue;
    const avg = (valid.reduce((a, r) => a + r.sharpe, 0) / valid.length).toFixed(2);
    const best = valid.sort((a, b) => b.sharpe - a.sharpe)[0];
    console.log(`${t.padEnd(10)} 平均${avg}  |  最佳 ${best.code} (${best.name}) Sharpe=${best.sharpe.toFixed(2)}`);
  }

  return results;
}

// 直接运行
if (require.main === module) {
  const args = process.argv.slice(2);
  const startDate = args[0] || '2023-01-01';
  runFundResearch(startDate).catch(console.error);
}

module.exports = { runFundResearch };
