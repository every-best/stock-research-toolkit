/**
 * 策略库 - 可组合的信号生成器
 * 
 * 策略设计原则：
 * - generateSignals(candles, i, state, params) 返回 { action, signal }
 * - state 用于跨bar记忆（如持仓周期计数）
 * - 重要：只在持仓时判断卖出，空仓时忽略卖出信号
 */

// ============ 工具函数 ============

function SMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

function EMA(data, period) {
  const result = [];
  const k = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[0]);
    } else if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    } else {
      result.push(data[i] * k + result[i - 1] * (1 - k));
    }
  }
  return result;
}

function RSI(data, period = 14) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      let gains = 0, losses = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const diff = data[j] - data[j - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
      }
      const avgGain = gains / period;
      const avgLoss = losses / period;
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - 100 / (1 + rs));
      }
    }
  }
  return result;
}

/**
 * 通用策略基类
 */
class Strategy {
  constructor(name) {
    this.name = name;
  }

  generateSignals(candles, i, state, params) {
    throw new Error('子类必须实现 generateSignals');
  }
}

// ============ 策略1: 简单均线交叉 ============

class MAStrategy extends Strategy {
  constructor() {
    super('MA_Cross');
  }

  generateSignals(candles, i, state, params) {
    const fastPeriod = params.fastPeriod || 10;
    const slowPeriod = params.slowPeriod || 30;

    const closes = candles.map(c => c.close);
    const fastMA = SMA(closes, fastPeriod);
    const slowMA = SMA(closes, slowPeriod);

    if (fastMA[i] === null || slowMA[i] === null || i < slowPeriod) {
      return { action: 'hold', signal: 0 };
    }

    const prevFast = fastMA[i - 1];
    const prevSlow = slowMA[i - 1];
    const currFast = fastMA[i];
    const currSlow = slowMA[i];

    const holding = state.position === 'long';

    // 金叉：fast上穿slow
    if (!holding && prevFast <= prevSlow && currFast > currSlow) {
      state.position = 'long';
      return { action: 'buy', signal: 1 };
    }
    // 死叉：fast下穿slow
    if (holding && prevFast >= prevSlow && currFast < currSlow) {
      state.position = null;
      return { action: 'sell', signal: -1 };
    }

    return { action: 'hold', signal: 0 };
  }
}

// ============ 策略2: RSI 回归 ============

class RSIStrategy extends Strategy {
  constructor() {
    super('RSI');
  }

  generateSignals(candles, i, state, params) {
    const period = params.period || 14;
    const oversold = params.oversold || 30;
    const overbought = params.overbought || 70;

    const closes = candles.map(c => c.close);
    const rsi = RSI(closes, period);

    if (rsi[i] === null) return { action: 'hold', signal: 0 };

    const holding = state.position === 'long';

    // RSI 超卖买入，超买卖出（只在持仓状态判断卖出）
    if (!holding && rsi[i] < oversold) {
      state.position = 'long';
      return { action: 'buy', signal: 1 };
    }
    if (holding && rsi[i] > overbought) {
      state.position = null;
      return { action: 'sell', signal: -1 };
    }

    return { action: 'hold', signal: 0 };
  }
}

// ============ 策略3: 动量策略（MACD + 52周高点）============

class MomentumStrategy extends Strategy {
  constructor() {
    super('Momentum');
  }

  generateSignals(candles, i, state, params) {
    const lookback = params.lookback || 60;  // 约3个月
    const macdFast = params.macdFast || 12;
    const macdSlow = params.macdSlow || 26;
    const macdSignal = params.macdSignal || 9;

    if (i < macdSlow) return { action: 'hold', signal: 0 };

    const closes = candles.map(c => c.close);

    // MACD
    const emaFast = EMA(closes, macdFast);
    const emaSlow = EMA(closes, macdSlow);
    const macdLine = emaFast.map((v, idx) => v !== null && emaSlow[idx] !== null ? v - emaSlow[idx] : null);
    const signalLine = EMA(macdLine.filter(v => v !== null), macdSignal);
    const offset = macdLine.length - signalLine.length;

    // 52周高点（约252天）
    const yearHigh = Math.max(...closes.slice(Math.max(0, i - 252), i + 1));
    const nearYearHigh = closes[i] >= yearHigh * (params.yearHighThreshold || 0.95);

    // 动量方向
    let momentumUp = 0;
    for (let j = Math.max(0, i - lookback + 1); j <= i; j++) {
      if (closes[j] > closes[j - 1]) momentumUp++;
    }
    const momentumSignal = momentumUp / lookback;

    // MACD 黄金叉
    const macdIdx = i - offset;
    const macdHist = macdLine[i] - (macdIdx >= 0 && macdIdx < signalLine.length ? signalLine[macdIdx] : 0);
    const prevMacdHist = macdLine[i - 1] - (macdIdx - 1 >= 0 && macdIdx - 1 < signalLine.length ? signalLine[macdIdx - 1] : 0);

    const momentumBuy = momentumSignal > (params.momentumThreshold || 0.55) && nearYearHigh && macdLine[i] > 0;
    const momentumSell = macdLine[i] < 0 || momentumSignal < (params.momentumThreshold || 0.4);
    const holding = state.position === 'long';

    // 持仓状态下才能卖，空仓状态下忽略卖出信号
    if (holding && momentumSell) {
      return { action: 'sell', signal: -1 };
    }
    if (!holding && momentumBuy) {
      state.position = 'long';
      return { action: 'buy', signal: momentumSignal };
    }

    return { action: 'hold', signal: momentumSignal };
  }
}

// ============ 策略4: 布林带均值回归 ============

class BollingerStrategy extends Strategy {
  constructor() {
    super('BollingerBands');
  }

  generateSignals(candles, i, state, params) {
    const period = params.period || 20;
    const stdDev = params.stdDev || 2;

    if (i < period) return { action: 'hold', signal: 0 };

    const closes = candles.map(c => c.close);
    const sma = SMA(closes, period);
    const mean = sma[i];

    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSq += Math.pow(closes[j] - mean, 2);
    }
    const std = Math.sqrt(sumSq / period);

    const upper = mean + stdDev * std;
    const lower = mean - stdDev * std;
    const curr = closes[i];

    // 价格触及下轨买入，上轨卖出（布林带均值回归）
    const holding = state.position === 'long';

    if (!holding && curr <= lower) {
      state.position = 'long';
      return { action: 'buy', signal: 1 };
    }
    if (holding && curr >= upper) {
      state.position = null;
      return { action: 'sell', signal: -1 };
    }

    return { action: 'hold', signal: 0 };
  }
}

// ============ 策略5: 组合策略（MA + RSI 共识）============

class CombinedStrategy extends Strategy {
  constructor() {
    super('MA_RSI_Combined');
  }

  generateSignals(candles, i, state, params) {
    const maFast = params.maFast || 10;
    const maSlow = params.maSlow || 30;
    const rsiPeriod = params.rsiPeriod || 14;
    const rsiOversold = params.rsiOversold || 35;
    const rsiOverbought = params.rsiOverbought || 65;

    if (i < Math.max(maSlow, rsiPeriod)) return { action: 'hold', signal: 0 };

    const closes = candles.map(c => c.close);

    // MA 信号
    const maFastVals = SMA(closes, maFast);
    const maSlowVals = SMA(closes, maSlow);
    const maBull = maFastVals[i] !== null && maSlowVals[i] !== null && maFastVals[i] > maSlowVals[i];
    const maBear = maFastVals[i] !== null && maSlowVals[i] !== null && maFastVals[i] < maSlowVals[i];

    // RSI 信号
    const rsiVals = RSI(closes, rsiPeriod);
    const rsiVal = rsiVals[i];
    const rsiOversoldSig = rsiVal !== null && rsiVal < rsiOversold;
    const rsiOverboughtSig = rsiVal !== null && rsiVal > rsiOverbought;

    const holding = state.position === 'long';

    // 买入：MA多头 + RSI超卖（两者同时满足）
    if (!holding && maBull && rsiOversoldSig) {
      state.position = 'long';
      return { action: 'buy', signal: 1 };
    }

    // 卖出：MA空头 + RSI超买（两者同时满足）或 MA死叉
    if (holding && (maBear && rsiOverboughtSig)) {
      state.position = null;
      return { action: 'sell', signal: -1 };
    }

    return { action: 'hold', signal: 0 };
  }
}

// ============ 导出 ============

module.exports = {
  MAStrategy,
  RSIStrategy,
  MomentumStrategy,
  BollingerStrategy,
  CombinedStrategy,
  SMA,
  EMA,
  RSI
};
