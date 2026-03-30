/**
 * 模拟数据生成器 - 用于测试回测引擎
 * 生成带趋势、波动率、动量效应的模拟K线数据
 */

function generateMockCandles(symbol, days = 252 * 5, options = {}) {
  const {
    initialPrice = 100,
    drift = 0.0003,        // 日均漂移（年化约7%）
    volatility = 0.015,   // 日波动率（年化约24%）
    momentumDays = 20,    // 动量持续天数
    momentumStrength = 0.02  // 每次动量切换的幅度
  } = options;

  const candles = [];
  let price = initialPrice;
  let momentum = 0;  // 当前动量方向强度

  // 生成随机游走种子
  const randomNormal = () => {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const startDate = new Date('2020-01-01');

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // 动量切换（每N天有2%概率切换方向）
    if (Math.random() < 0.02) {
      momentum = (Math.random() - 0.5) * momentumStrength;
    } else {
      // 动量衰减
      momentum *= 0.95;
    }

    // 价格变动
    const shock = randomNormal() * volatility + drift + momentum;
    const open = price;
    const close = price * (1 + shock);

    // 生成高低价（简化模型）
    const range = Math.abs(close - open) + price * volatility * Math.abs(randomNormal());
    const high = Math.max(open, close) + range * Math.random() * 0.5;
    const low = Math.min(open, close) - range * Math.random() * 0.5;

    // 成交量（价格变动大时成交量也大）
    const baseVolume = 1000000;
    const volume = Math.floor(baseVolume * (1 + Math.abs(shock) * 10) * (0.5 + Math.random()));

    candles.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    });

    price = close;
  }

  return candles;
}

/**
 * 生成牛市/熊市/震荡三种模拟场景
 */
function generateScenarios(symbol = 'SPY') {
  return {
    bull: generateMockCandles(symbol + '_BULL', 252 * 3, {
      initialPrice: 100, drift: 0.0005, volatility: 0.012
    }),
    bear: generateMockCandles(symbol + '_BEAR', 252 * 2, {
      initialPrice: 100, drift: -0.0003, volatility: 0.02
    }),
    range: generateMockCandles(symbol + '_RANGE', 252 * 2, {
      initialPrice: 100, drift: 0, volatility: 0.01
    })
  };
}

module.exports = { generateMockCandles, generateScenarios };
