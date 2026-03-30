/**
 * 参数优化器 - 批量实验引擎
 * 
 * 类似 autoresearch 的 batch 概念：
 * - 给定参数空间 → 并行/串行跑多个回测
 * - 按指标排序，输出最优参数组合
 * - 记录每次实验结果到 history
 */

const Backtester = require('./engine');

/**
 * 参数空间生成器
 * 给定参数范围，生成所有组合
 */
function paramGrid(baseParams, ranges) {
  const keys = Object.keys(ranges);
  const result = [];

  function gen(prefix, depth) {
    if (depth === keys.length) {
      result.push({ ...baseParams, ...prefix });
      return;
    }
    const key = keys[depth];
    for (const val of ranges[key]) {
      gen({ ...prefix, [key]: val }, depth + 1);
    }
  }

  gen({}, 0);
  return result;
}

/**
 * 运行一批实验
 * @param {Array} candles - K线数据
 * @param {Object} strategy - 策略类
 * @param {Object} baseParams - 基础参数
 * @param {Object} ranges - 参数范围 { paramName: [values] }
 * @param {Object} constraints - 约束条件 { maxDrawdown: 0.2, minTrades: 5 }
 * @returns {Object} 实验结果
 */
function runBatch(candles, StrategyClass, baseParams, ranges, constraints = {}) {
  const grid = paramGrid(baseParams, ranges);
  const strategy = new StrategyClass();
  const backtester = new Backtester();

  const results = [];
  const MAX_EXPERIMENTS = constraints.maxExperiments || 200;

  console.log(`🔬 开始批量实验: ${Math.min(grid.length, MAX_EXPERIMENTS)} 组参数 (共 ${grid.length} 种组合)`);

  for (let i = 0; i < Math.min(grid.length, MAX_EXPERIMENTS); i++) {
    const params = grid[i];

    try {
      const result = backtester.run(candles, strategy, params);

      // 应用约束
      if (constraints.minTrades && result.totalTrades < constraints.minTrades) continue;
      if (constraints.maxDrawdown && parseFloat(result.maxDrawdown) > constraints.maxDrawdown) continue;

      results.push({
        experimentId: i + 1,
        params,
        metrics: {
          sharpe: parseFloat(result.sharpeRatio),
          totalReturn: parseFloat((result.totalReturn * 100).toFixed(2)),
          maxDrawdown: parseFloat((parseFloat(result.maxDrawdown) * 100).toFixed(2)),
          winRate: parseFloat(result.winRate),
          annualizedReturn: parseFloat((result.annualizedReturn * 100).toFixed(2)),
          totalTrades: result.totalTrades
        },
        equityCurve: result.equityCurve
      });
    } catch (e) {
      // 忽略失败实验
    }

    if ((i + 1) % 50 === 0) {
      console.log(`   进度: ${i + 1}/${Math.min(grid.length, MAX_EXPERIMENTS)}`);
    }
  }

  // 按 Sharpe 排序
  results.sort((a, b) => b.metrics.sharpe - a.metrics.sharpe);

  // 取 Top N
  const topN = constraints.topN || 10;
  const top = results.slice(0, topN);

  console.log(`✅ 完成 ${results.length} 个有效实验\n`);

  // 打印 Top 结果
  console.log('📊 Top 策略:');
  console.log('─'.repeat(80));
  console.log('ID  | Sharpe | 收益%  | 年化% | 回撤% | 胜率% | 交易次数 | 参数');
  console.log('─'.repeat(80));
  top.forEach((r, idx) => {
    const p = r.params;
    const paramStr = Object.keys(p).map(k => `${k}=${p[k]}`).join(',');
    console.log(
      `${(idx + 1).toString().padStart(2)}  | ` +
      `${r.metrics.sharpe.toFixed(2).padStart(6)} | ` +
      `${r.metrics.totalReturn.toFixed(1).padStart(6)} | ` +
      `${r.metrics.annualizedReturn.toFixed(1).padStart(6)} | ` +
      `${r.metrics.maxDrawdown.toFixed(1).padStart(5)} | ` +
      `${r.metrics.winRate.toFixed(1).padStart(5)} | ` +
      `${r.metrics.totalTrades.toString().padStart(9)} | ` +
      `${paramStr.slice(0, 30)}`
    );
  });

  return {
    totalExperiments: results.length,
    topStrategies: top,
    bestStrategy: top[0] || null
  };
}

module.exports = { runBatch, paramGrid };
