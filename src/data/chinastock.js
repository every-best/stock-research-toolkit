/**
 * A股指数数据 - 基于东方财富
 * 支持沪深300、中证500、创业板、科创板等主要指数
 */

const fetcher = require('./fetcher');

/**
 * A股指数代码映射（东方财富格式）
 */
const INDEX_MAP = {
  // 沪深300系列
  '000300': { name: '沪深300指数', market: 'sh' },
  '399300': { name: '沪深300指数', market: 'sz' },
  '510300': { name: '沪深300ETF', market: 'sh', type: 'etf' },
  '159919': { name: '沪深300ETF', market: 'sz', type: 'etf' },
  
  // 中证系列
  '000905': { name: '中证500指数', market: 'sh' },
  '510500': { name: '中证500ETF', market: 'sh', type: 'etf' },
  '159922': { name: '中证500ETF', market: 'sz', type: 'etf' },
  
  // 创业板
  '399006': { name: '创业板指', market: 'sz' },
  '159915': { name: '创业板ETF', market: 'sz', type: 'etf' },
  '159901': { name: '深证100ETF', market: 'sz', type: 'etf' },
  
  // 科创板
  '000688': { name: '科创50指数', market: 'sh' },
  '588000': { name: '科创50ETF', market: 'sh', type: 'etf' },
  
  // 上证系列
  '000001': { name: '上证指数', market: 'sh' },
  '510050': { name: '上证50ETF', market: 'sh', type: 'etf' },
  
  // 券商/银行ETF（用于策略验证）
  '512880': { name: '证券ETF', market: 'sh', type: 'etf' },
  '512800': { name: '银行ETF', market: 'sh', type: 'etf' },
};

/**
 * 获取A股指数/ETF历史K线
 * @param {string} symbol - 代码，如 '159915'（创业板ETF）或 '000300'（沪深300）
 * @param {Object} options - { period: 'daily', count: 1000 }
 */
async function getAStockCandles(symbol, options = {}) {
  const info = INDEX_MAP[symbol];
  if (!info) {
    // 尝试直接使用
    return fetcher.getHistory(symbol, options);
  }
  
  return fetcher.getHistory(symbol, options);
}

/**
 * 搜索可用的A股指数代码
 */
function listAvailableIndices() {
  return Object.entries(INDEX_MAP).map(([code, info]) => ({
    code,
    name: info.name,
    type: info.type || 'index'
  }));
}

module.exports = {
  getAStockCandles,
  listAvailableIndices,
  INDEX_MAP
};
