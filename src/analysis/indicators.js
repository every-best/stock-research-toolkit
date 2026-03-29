/**
 * 技术指标分析模块
 * 支持：MA、RSI、MACD、KD、Bollinger Bands
 */

class TechnicalIndicators {
  /**
   * 计算移动平均线
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期
   * @returns {number[]} MA值数组
   */
  static MA(prices, period) {
    const result = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(parseFloat((sum / period).toFixed(3)));
      }
    }
    return result;
  }

  /**
   * 计算指数移动平均线
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期
   * @returns {number[]} EMA值数组
   */
  static EMA(prices, period) {
    const result = [];
    const k = 2 / (period + 1);
    
    // 第一个值是SMA
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        result.push(parseFloat(ema.toFixed(3)));
      } else {
        ema = prices[i] * k + ema * (1 - k);
        result.push(parseFloat(ema.toFixed(3)));
      }
    }
    return result;
  }

  /**
   * 计算RSI相对强弱指数
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期 (默认14)
   * @returns {number[]} RSI值数组
   */
  static RSI(prices, period = 14) {
    const result = [];
    const gains = [];
    const losses = [];

    // 计算涨跌
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }

    for (let i = 0; i < gains.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push(parseFloat((100 - 100 / (1 + rs)).toFixed(2)));
      } else {
        const prevAvgGain = (result[i - 1] / 100 * (period - 1) + gains[i]) / period;
        const prevAvgLoss = (result[i - 1] / 100 * (period - 1) * (1 - result[i - 1] / 100) + losses[i]) / period;
        const avgGain = prevAvgGain;
        const avgLoss = prevAvgLoss;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push(parseFloat((100 - 100 / (1 + rs)).toFixed(2)));
      }
    }

    return [null, ...result]; // 前面加一个null对应第一个价格
  }

  /**
   * 计算MACD
   * @param {number[]} prices - 价格数组
   * @param {number} fastPeriod - 快线周期 (默认12)
   * @param {number} slowPeriod - 慢线周期 (默认26)
   * @param {number} signalPeriod - 信号线周期 (默认9)
   * @returns {Object} { macd, signal, histogram }
   */
  static MACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const emaFast = this.EMA(prices, fastPeriod);
    const emaSlow = this.EMA(prices, slowPeriod);
    
    const macdLine = emaFast.map((v, i) => {
      if (v === null || emaSlow[i] === null) return null;
      return parseFloat((v - emaSlow[i]).toFixed(4));
    });

    // 计算信号线(DIF的EMA)
    const macdValues = macdLine.filter(v => v !== null);
    const signalLine = [];
    let signal = macdValues.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
    
    for (let i = 0; i < macdLine.length; i++) {
      if (macdLine[i] === null) {
        signalLine.push(null);
      } else if (signalLine.filter(v => v !== null).length < signalPeriod - 1) {
        signalLine.push(null);
      } else if (signalLine.filter(v => v !== null).length === signalPeriod - 1) {
        const values = macdLine.slice(i - signalPeriod + 1, i + 1).filter(v => v !== null);
        signal = values.reduce((a, b) => a + b, 0) / signalPeriod;
        signalLine.push(parseFloat(signal.toFixed(4)));
      } else {
        signal = macdLine[i] * (2 / (signalPeriod + 1)) + signal * (1 - 2 / (signalPeriod + 1));
        signalLine.push(parseFloat(signal.toFixed(4)));
      }
    }

    const histogram = macdLine.map((v, i) => {
      if (v === null || signalLine[i] === null) return null;
      return parseFloat((v - signalLine[i]).toFixed(4));
    });

    return { macd: macdLine, signal: signalLine, histogram };
  }

  /**
   * 计算KD随机指标
   * @param {Object[]} klines - K线数据数组
   * @param {number} period - 周期 (默认9)
   * @returns {Object} { k, d, j }
   */
  static KD(klines, period = 9) {
    const closes = klines.map(k => k.close);
    const k = [];
    const d = [];

    for (let i = 0; i < klines.length; i++) {
      if (i < period - 1) {
        k.push(null);
        d.push(null);
      } else {
        const recentCloses = closes.slice(i - period + 1, i + 1);
        const high = Math.max(...recentCloses);
        const low = Math.min(...recentCloses);
        const rsv = high === low ? 50 : ((closes[i] - low) / (high - low)) * 100;

        if (i === period - 1) {
          k.push(parseFloat(rsv.toFixed(2)));
          d.push(parseFloat(rsv.toFixed(2)));
        } else {
          const prevK = k[i - 1];
          const prevD = d[i - 1];
          k.push(parseFloat(((2 / 3) * prevK + (1 / 3) * rsv).toFixed(2)));
          d.push(parseFloat(((2 / 3) * prevD + (1 / 3) * k[k.length - 1]).toFixed(2)));
        }
      }
    }

    const j = k.map((v, i) => {
      if (v === null || d[i] === null) return null;
      return parseFloat((3 * v - 2 * d[i]).toFixed(2));
    });

    return { k, d, j };
  }

  /**
   * 计算布林带
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期 (默认20)
   * @param {number} stdDev - 标准差倍数 (默认2)
   * @returns {Object} { upper, middle, lower }
   */
  static BollingerBands(prices, period = 20, stdDev = 2) {
    const middle = this.MA(prices, period);
    const upper = [];
    const lower = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        upper.push(null);
        lower.push(null);
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const mean = middle[i];
        const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
        const sd = Math.sqrt(variance);
        upper.push(parseFloat((mean + stdDev * sd).toFixed(3)));
        lower.push(parseFloat((mean - stdDev * sd).toFixed(3)));
      }
    }

    return { upper, middle, lower };
  }

  /**
   * 综合分析信号
   * @param {Object} indicators - 各种指标数据
   * @returns {Object} 买卖信号
   */
  static generateSignals(indicators) {
    const signals = {
      trend: [],      // 趋势信号
      momentum: [],    // 动量信号
      volatility: []  // 波幅信号
    };

    // MA趋势判断
    if (indicators.ma5 && indicators.ma20) {
      const lastMa5 = indicators.ma5[indicators.ma5.length - 1];
      const lastMa20 = indicators.ma20[indicators.ma20.length - 1];
      if (lastMa5 > lastMa20) signals.trend.push('MA多头');
      else if (lastMa5 < lastMa20) signals.trend.push('MA空头');
    }

    // RSI超买超卖
    if (indicators.rsi) {
      const lastRsi = indicators.rsi[indicators.rsi.length - 1];
      if (lastRsi > 70) signals.momentum.push('RSI超买');
      else if (lastRsi < 30) signals.momentum.push('RSI超卖');
      else signals.momentum.push('RSI中性');
    }

    // MACD信号
    if (indicators.macd) {
      const lastMacd = indicators.macd.histogram[indicators.macd.histogram.length - 1];
      const prevMacd = indicators.macd.histogram[indicators.macd.histogram.length - 2];
      if (lastMacd > 0 && prevMacd <= 0) signals.momentum.push('MACD金叉');
      else if (lastMacd < 0 && prevMacd >= 0) signals.momentum.push('MACD死叉');
    }

    // KD信号
    if (indicators.kd) {
      const { k, d } = indicators.kd;
      const lastK = k[k.length - 1];
      const lastD = d[d.length - 1];
      if (lastK > 80 && lastD > 80) signals.momentum.push('KD超买');
      else if (lastK < 20 && lastD < 20) signals.momentum.push('KD超卖');
    }

    return signals;
  }
}

module.exports = TechnicalIndicators;
