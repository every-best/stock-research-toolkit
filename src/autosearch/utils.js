/**
 * utils.js — 共享工具函数
 * 
 * AutoSearch 风格美股个股交易系统
 * 数据处理和计算工具
 */

/**
 * 移动平均
 */
export function rollingMean(arr, window) {
  if (arr.length < window) {
    return arr.map(() => NaN);
  }
  
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
    } else {
      const slice = arr.slice(i - window + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }
  }
  return result;
}

/**
 * 百分比变化
 */
export function pctChange(arr, periods = 1) {
  if (arr.length <= periods) {
    return arr.map(() => NaN);
  }
  
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < periods) {
      result.push(NaN);
    } else {
      const change = (arr[i] - arr[i - periods]) / arr[i - periods];
      result.push(change);
    }
  }
  return result;
}

/**
 * 前向填充 NaN
 */
export function ffill(arr) {
  let lastValid = arr[0];
  return arr.map(val => {
    if (isFinite(val)) {
      lastValid = val;
    }
    return lastValid;
  });
}

/**
 * 填充 NaN 为指定值
 */
export function fillNaN(arr, fillValue = 0) {
  return arr.map(val => isFinite(val) ? val : fillValue);
}

/**
 * 计算标准差
 */
export function stdDev(arr, window = 20) {
  if (arr.length < window) {
    return arr.map(() => NaN);
  }
  
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
    } else {
      const slice = arr.slice(i - window + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (slice.length - 1);
      result.push(Math.sqrt(variance));
    }
  }
  return result;
}

/**
 * 日期工具
 */
export function getLastNTradingDays(n = 30) {
  const days = [];
  const today = new Date();
  
  for (let i = n + 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    
    // 跳过周末
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days.push(d.toISOString().split('T')[0]);
    }
  }
  
  return days;
}

/**
 * 格式化日期
 */
export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 获取过去N个交易日（不包括今天）
 */
export function getLastNTradingDaysExcludingToday(n = 252) {
  const days = [];
  const today = new Date();
  
  let daysAdded = 0;
  let currentDate = new Date(today);
  
  while (daysAdded < n) {
    currentDate.setDate(currentDate.getDate() - 1);
    
    // 跳过周末
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      days.push(formatDate(currentDate));
      daysAdded++;
    }
  }
  
  return days;
}

/**
 * 格式化美元
 */
export function formatDollar(amount) {
  if (amount >= 1e9) {
    return `$${(amount / 1e9).toFixed(2)}B`;
  } else if (amount >= 1e6) {
    return `$${(amount / 1e6).toFixed(2)}M`;
  } else if (amount >= 1e3) {
    return `$${(amount / 1e3).toFixed(2)}K`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * 格式化百分比
 */
export function formatPercent(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(2)}%`;
}

/**
 * 计算复利收益
 */
export function compoundReturns(returns) {
  const result = [1];
  for (const r of returns) {
    result.push(result[result.length - 1] * (1 + r));
  }
  return result;
}

/**
 * 计算年化收益率
 */
export function annualizedReturn(totalReturn, days) {
  if (days <= 0) return 0;
  const years = days / 252;
  return Math.pow(1 + totalReturn, 1 / years) - 1;
}

/**
 * 计算夏普比率
 */
export function sharpeRatio(returns, riskFreeRate = 0.04) {
  if (!returns || returns.length < 2) return 0;
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
  );
  
  if (stdDev === 0) return 0;
  
  // 年化
  const annualizedAvg = avgReturn * 252;
  const annualizedStd = stdDev * Math.sqrt(252);
  
  return (annualizedAvg - riskFreeRate) / annualizedStd;
}

/**
 * 深拷贝对象
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 判断是否是交易日
 */
export function isTradingDay(date = new Date()) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

/**
 * 获取最近一个交易日的日期
 */
export function getLastTradingDay() {
  const today = new Date();
  let daysBack = 1;
  
  while (daysBack <= 7) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysBack);
    
    if (isTradingDay(d)) {
      return formatDate(d);
    }
    daysBack++;
  }
  
  return formatDate(today);
}

export default {
  rollingMean,
  pctChange,
  ffill,
  fillNaN,
  stdDev,
  getLastNTradingDays,
  formatDate,
  getLastNTradingDaysExcludingToday,
  formatDollar,
  formatPercent,
  compoundReturns,
  annualizedReturn,
  sharpeRatio,
  deepClone,
  isTradingDay,
  getLastTradingDay
};
