/**
 * 全量批量研究 - 一次测试所有标的
 * 
 * 使用方法:
 *   node index.js research-all
 */

const td = require('../data/twelvedata');
const china = require('../data/chinastock');
const hk = require('../data/hkstock');
const { CombinedStrategy, MAStrategy } = require('../backtester/strategies');
const Backtester = require('../backtester/engine');

// 全部标的
const PORTFOLIO = {
  // 美股ETF
  'SPY':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'QQQ':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'IWM':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'GLD':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'TLT':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'IEF':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'XLK':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'XLV':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'XLE':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'XLF':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'XLY':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'EEM':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'EFA':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  'DBC':   { source: 'td',       params: { start_date: '2020-01-01', end_date: '2026-03-01' } },
  // A股ETF
  '159919': { source: 'china',   params: { period: 'daily', count: 1000 } },
  '159915': { source: 'china',   params: { period: 'daily', count: 1000 } },
  // 港股ETF
  'hk02800': { source: 'hk',     params: 500 },
  'hk02823': { source: 'hk',     params: 500 },
  'hk03033': { source: 'hk',     params: 500 },
  'hk03188': { source: 'hk',     params: 500 },
  'hk09834': { source: 'hk',     params: 500 },
};

// 分类标签
const CATEGORIES = {
  '核心美股': ['SPY', 'QQQ', 'IWM'],
  '防御/对冲': ['GLD', 'TLT', 'IEF'],
  '行业轮动': ['XLK', 'XLV', 'XLE', 'XLF', 'XLY'],
  '国际分散': ['EEM', 'EFA'],
  '大宗商品': ['DBC'],
  'A股': ['159919', '159915'],
  '港股ETF': ['hk02800', 'hk02823', 'hk03033', 'hk03188', 'hk09834'],
};

async function getCandles(symbol, config) {
  try {
    switch (config.source) {
      case 'td':
        return await td.getDailyCandles(symbol, config.params);
      case 'china':
        return await china.getAStockCandles(symbol, config.params);
      case 'hk':
        return await hk.getHKIndexCandles(symbol, config.params);
    }
  } catch (e) {
    return null;
  }
}

async function runAllResearch() {
  const bt = new Backtester({ initialCapital: 100000, positionSize: 1.0 });
  const strat = new CombinedStrategy();
  // 最优参数（MA+RSI）
  const params = { maFast: 15, maSlow: 20, rsiPeriod: 14, rsiOversold: 25, rsiOverbought: 70 };

  console.log('══════════════════════════════════════════════════');
  console.log('📊 全球 ETF 策略研究 — MA+RSI 组合策略');
  console.log('══════════════════════════════════════════════════\n');

  const results = {};
  let count = 0;
  const total = Object.keys(PORTFOLIO).length;

  for (const [symbol, config] of Object.entries(PORTFOLIO)) {
    count++;
    process.stdout.write(`[${count}/${total}] ${symbol}... `);
    
    const candles = await getCandles(symbol, config);
    
    if (!candles || candles.length < 30) {
      console.log('❌ 数据不足');
      results[symbol] = { error: '数据不足' };
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

    results[symbol] = {
      sharpe, annualizedReturn: ann, maxDrawdown: dd,
      totalReturn: ret, winRate, trades, candles: candles.length
    };

    // 速率限制
    if (config.source === 'td') {
      await new Promise(r => setTimeout(r, 8000)); // 每分钟8次
    }
  }

  // 打印分类汇总
  console.log('\n' + '═'.repeat(60));
  console.log('📋 分类汇总（按 Sharpe 降序）');
  console.log('═'.repeat(60) + '\n');

  const sortedResults = Object.entries(results)
    .filter(([, r]) => r.sharpe !== undefined)
    .sort((a, b) => b[1].sharpe - a[1].sharpe);

  // 打印表头
  console.log('标的'.padEnd(12) + 'Sharpe   年化%   回撤%   胜率%   交易次数');
  console.log('─'.repeat(60));

  for (const [symbol, r] of sortedResults) {
    const cat = Object.entries(CATEGORIES).find(([, arr]) => arr.includes(symbol))?.[0] || '';
    console.log(
      symbol.padEnd(12) +
      r.sharpe.toFixed(2).padStart(6) + '  ' +
      r.annualizedReturn.toString().padStart(6) + '  ' +
      r.maxDrawdown.toString().padStart(6) + '  ' +
      r.winRate.toFixed(2).padStart(6) + '  ' +
      r.trades.toString().padStart(6)
    );
  }

  // 按类别汇总
  console.log('\n' + '─'.repeat(60));
  console.log('📈 类别平均 Sharpe');
  console.log('─'.repeat(60));
  for (const [cat, symbols] of Object.entries(CATEGORIES)) {
    const valid = symbols.map(s => results[s]).filter(r => r.sharpe !== undefined);
    if (valid.length === 0) continue;
    const avgSharpe = (valid.reduce((a, r) => a + r.sharpe, 0) / valid.length).toFixed(2);
    const best = symbols.filter(s => results[s]?.sharpe !== undefined).sort((a, b) => results[b].sharpe - results[a].sharpe)[0];
    const bestSharpe = results[best]?.sharpe.toFixed(2);
    console.log(`${cat.padEnd(12)} 平均${avgSharpe}  |  最佳 ${best} (${bestSharpe})`);
  }

  return results;
}

runAllResearch().catch(console.error);
