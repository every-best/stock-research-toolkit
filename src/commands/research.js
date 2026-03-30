/**
 * 研究实验命令 - 批量策略搜索
 * 
 * 使用方法:
 *   node index.js research <symbol> [batch_count]
 *   node index.js research SPY 1
 */

const td = require('../data/twelvedata');
const Backtester = require('../backtester/engine');
const { runBatch } = require('../backtester/optimizer');
const { MAStrategy, RSIStrategy, MomentumStrategy, BollingerStrategy, CombinedStrategy } = require('../backtester/strategies');
const fs = require('fs');
const path = require('path');

async function runResearch(symbol = 'SPY', batchCount = 1) {
  console.log(`\n📈 美股策略研究 - ${symbol}`);
  console.log('='.repeat(50));

  // 读取 program.md
  const programPath = path.join(__dirname, '..', '..', 'program.md');
  const programContent = fs.readFileSync(programPath, 'utf-8');
  console.log('\n📋 当前研究方向:\n');
  
  // 解析关键参数（优先用命令行传入的 symbol）
  const dateMatch = programContent.match(/时间范围：(\d{4}-\d{2}-\d{2}) 至 (\d{4}-\d{2}-\d{2})/);
  const targetSymbol = symbol;  // 命令行参数优先
  const startDate = dateMatch ? dateMatch[1] : '2020-01-01';
  const endDate = dateMatch ? dateMatch[2] : '2026-03-01';

  console.log(`   数据: ${targetSymbol} 日线 ${startDate} ~ ${endDate}`);

  // 获取数据（优先用 Twelve Data，fallback 用 mock）
  console.log('\n📡 从 Twelve Data 获取数据...');
  let candles;
  try {
    candles = await td.getDailyCandles(targetSymbol, { start_date: startDate, end_date: endDate });
    console.log(`   成功获取 ${candles.length} 根K线`);
  } catch (e) {
    console.error(`❌ 数据获取失败: ${e.message}`);
    return;
  }

  // 策略列表
  const strategyMap = {
    'MA': MAStrategy,
    'RSI': RSIStrategy,
    'Momentum': MomentumStrategy,
    'Bollinger': BollingerStrategy,
    'Combined': CombinedStrategy
  };

  console.log('\n🔬 开始批量实验...\n');

  // 每次 batch 轮流选策略（batch 1-5）
  const strategyNames = Object.keys(strategyMap);
  const strategyName = strategyNames[(batchCount - 1) % strategyNames.length];
  const StrategyClass = strategyMap[strategyName];

  console.log(`   策略: ${strategyName}Strategy`);

  // 定义参数空间
  let ranges;
  switch (strategyName) {
    case 'MA':
      ranges = {
        fastPeriod: [5, 10, 15, 20],
        slowPeriod: [20, 30, 40, 50, 60]
      };
      break;
    case 'RSI':
      ranges = {
        period: [7, 10, 14, 21],
        oversold: [20, 25, 30, 35],
        overbought: [60, 65, 70, 75, 80]
      };
      break;
    case 'Momentum':
      ranges = {
        lookback: [20, 40, 60],
        momentumThreshold: [0.5, 0.55, 0.6, 0.65],
        yearHighThreshold: [0.90, 0.95]
      };
      break;
    case 'Bollinger':
      ranges = {
        period: [10, 15, 20, 25, 30],
        stdDev: [1.5, 2.0, 2.5]
      };
      break;
    case 'Combined':
      ranges = {
        maFast: [5, 10, 15],
        maSlow: [20, 30, 50],
        rsiPeriod: [7, 14, 21],
        rsiOversold: [25, 30, 35],
        rsiOverbought: [65, 70, 75]
      };
      break;
      break;
  }

  const result = runBatch(candles, StrategyClass, {}, ranges, {
    minTrades: 5,
    maxDrawdown: 0.5,
    maxExperiments: 200,
    topN: 10
  });

  // 保存结果
  const reportPath = path.join(__dirname, '..', '..', 'reports', `research_${symbol}_${strategyName}_${Date.now()}.json`);
  const fs2 = require('fs');
  fs2.writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(`\n💾 报告已保存: ${reportPath}`);

  if (result.bestStrategy) {
    console.log('\n🏆 最佳策略:');
    console.log(`   Sharpe: ${result.bestStrategy.metrics.sharpe}`);
    console.log(`   年化收益: ${result.bestStrategy.metrics.annualizedReturn}%`);
    console.log(`   最大回撤: ${result.bestStrategy.metrics.maxDrawdown}%`);
    console.log(`   胜率: ${result.bestStrategy.metrics.winRate}%`);
    console.log(`   参数: ${JSON.stringify(result.bestStrategy.params)}`);
  }

  return result;
}

module.exports = { runResearch };

// 如果直接运行
if (require.main === module) {
  const args = process.argv.slice(2);
  const symbol = args[1] || 'SPY';
  const batch = parseInt(args[2] || '1');
  runResearch(symbol, batch).catch(console.error);
}
