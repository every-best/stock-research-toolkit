/**
 * 回测引擎 - 事件驱动型
 * 支持做多/做空/做多+做空，最大回撤、Sharpe、胜率等指标计算
 */

class Backtester {
  constructor(options = {}) {
    this.initialCapital = options.initialCapital || 100000;   // 初始资金
    this.positionSize = options.positionSize || 1.0;           // 仓位比例 (0-1)
    this.commission = options.commission || 0.001;            // 手续费 (0.1%)
    this.slippage = options.slippage || 0.001;                // 滑点 (0.1%)
  }

  /**
   * 运行回测
   * @param {Array} candles - K线数据
   * @param {Object} strategy - 策略对象 { generateSignals(candles, i, state) => { action: 'buy'|'sell'|'hold', signal: number } }
   * @param {Object} params - 策略参数
   * @returns {Object} 回测结果
   */
  run(candles, strategy, params = {}) {
    if (candles.length < 2) {
      throw new Error('K线数据不足');
    }

    let capital = this.initialCapital;
    let position = 0;          // 持仓股数
    let entryPrice = 0;        // 入场价格
    let state = {};             // 策略状态（用于跨bar记忆）

    const trades = [];          // 交易记录
    const equityCurve = [];     // 权益曲线
    let currentDrawdown = 0;
    let maxDrawdown = 0;
    let peak = this.initialCapital;

    // 预热期（跳过前N根K线，等指标计算稳定）
    const warmup = params.warmup || 20;

    for (let i = warmup; i < candles.length; i++) {
      const bar = candles[i];
      const prevBars = candles.slice(Math.max(0, i - 100), i);

      // 生成信号
      const signal = strategy.generateSignals(candles, i, state, params);

      // 执行交易
      if (signal.action === 'buy' && position === 0) {
        // 买入（成本包含手续费和滑点）
        const buyCost = bar.close * (1 + this.slippage + this.commission);
        const shares = Math.floor(capital * this.positionSize / buyCost);

        if (shares > 0) {
          const totalCost = shares * buyCost;
          position = shares;
          entryPrice = bar.close * (1 + this.slippage);
          capital -= totalCost;

          trades.push({
            type: 'buy',
            date: bar.date,
            price: entryPrice,
            shares,
            capital
          });
        }
      } else if (signal.action === 'sell' && position > 0) {
        // 卖出（收入扣除手续费和滑点）
        const sellPrice = bar.close * (1 - this.slippage - this.commission);
        const revenue = position * sellPrice;
        capital += revenue;

        trades.push({
          type: 'sell',
          date: bar.date,
          price: sellPrice,
          shares: position,
          capital
        });

        position = 0;
        entryPrice = 0;
      }

      // 记录权益（用组合总市值计算回撤）
      const portfolioValue = capital + position * bar.close;
      if (portfolioValue > peak) peak = portfolioValue;
      const currentDrawdown = (peak - portfolioValue) / peak;
      if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;
      equityCurve.push({
        date: bar.date,
        value: portfolioValue,
        drawdown: currentDrawdown
      });
    }

    // 平仓计算
    if (position > 0) {
      const lastBar = candles[candles.length - 1];
      capital += position * lastBar.close * (1 - this.slippage - this.commission);
      position = 0;
    }

    const finalValue = capital;
    const totalReturn = (finalValue - this.initialCapital) / this.initialCapital;

    // 计算年化指标
    const tradingDays = candles.length - warmup;
    const years = tradingDays / 252;
    const annualizedReturn = years > 0 ? Math.pow(finalValue / this.initialCapital, 1 / years) - 1 : 0;

    // 计算 Sharpe Ratio（假设无风险利率 4%）
    const riskFreeRate = 0.04;
    const dailyReturns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      dailyReturns.push((equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value);
    }
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length || 0;
    const stdReturn = Math.sqrt(dailyReturns.map(r => Math.pow(r - avgReturn, 2)).reduce((a, b) => a + b, 0) / dailyReturns.length) || 1;
    const sharpeRatio = years > 0 ? (avgReturn * 252 - riskFreeRate) / (stdReturn * Math.sqrt(252)) : 0;

    // 胜率
    let wins = 0, losses = 0;
    for (let i = 0; i < trades.length - 1; i += 2) {
      if (trades[i + 1]) {
        const buyCost = trades[i].shares * trades[i].price;
        const sellRevenue = trades[i + 1].shares * trades[i + 1].price;
        if (sellRevenue > buyCost) wins++;
        else losses++;
      }
    }
    const winRate = (wins + losses) > 0 ? wins / (wins + losses) : 0;

    return {
      initialCapital: this.initialCapital,
      finalValue,
      totalReturn,                     // 总收益率
      annualizedReturn,                // 年化收益率
      sharpeRatio: Math.max(sharpeRatio, -10).toFixed(2),  // Sharpe
      maxDrawdown: maxDrawdown.toFixed(4),                 // 最大回撤
      winRate: winRate.toFixed(2),    // 胜率
      totalTrades: Math.floor(trades.length / 2),          // 交易次数
      wins,
      losses,
      trades,
      equityCurve
    };
  }
}

module.exports = Backtester;
