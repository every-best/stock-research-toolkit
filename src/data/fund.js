/**
 * 基金数据 - 基于东方财富 API
 * 
 * 覆盖：A股开放式公募基金（股票型、混合型、债券型、指数型）
 * 数据：每日单位净值(DWJZ)、复权净值、累计净值
 * 
 * 基金代码（东方财富格式）：
 * - secid前缀: 0. = 基金
 * 
 * 常用基金示例：
 * 指数基金:
 *   000001 华夏成长混合(沪深300基准)
 *   110003 易方达上证50指数
 *   000961 天弘沪深300ETF联接
 * 主动管理:
 *   110022 易方达消费行业
 *   001714 工银文体产业
 *   006228 中欧医疗健康
 *   001875 平安策略先锋
 *   162201 泰达宏利成长
 *   519068 汇添富成长
 *   320006 诺安灵活配置
 * 债券基金:
 *   000143 广发聚鑫债券
 *   040040 华安纯债债券
 */

const https = require('https');

/**
 * 基金代码映射（东方财富 secid 格式）
 */
const FUND_MAP = {
  // 指数/大盘
  '000001': { name: '华夏成长混合', type: 'index', risk: 'high' },
  '110003': { name: '易方达上证50指数', type: 'index', risk: 'high' },
  '000961': { name: '天弘沪深300ETF联', type: 'index', risk: 'high' },
  // 主动管理
  '110022': { name: '易方达消费行业', type: 'active', risk: 'high' },
  '001714': { name: '工银文体产业', type: 'active', risk: 'high' },
  '006228': { name: '中欧医疗健康', type: 'active', risk: 'high' },
  '001875': { name: '平安策略先锋', type: 'active', risk: 'high' },
  '162201': { name: '泰达宏利成长', type: 'active', risk: 'high' },
  '519068': { name: '汇添富成长', type: 'active', risk: 'high' },
  '320006': { name: '诺安灵活配置', type: 'active', risk: 'medium' },
  // 债券
  '000143': { name: '广发聚鑫债券', type: 'bond', risk: 'low' },
  '040040': { name: '华安纯债债券', type: 'bond', risk: 'low' },
};

/**
 * 获取基金历史净值
 * @param {string} fundCode - 6位基金代码，如 '000001'
 * @param {Object} options - { startDate, endDate }
 */
async function getFundCandles(fundCode, options = {}) {
  const startDate = options.startDate || '2023-01-01';  // 默认近2年，缩短获取时间
  const endDate = options.endDate || '2026-03-29';
  
  const allData = [];
  let pageIndex = 1;
  const pageSize = 20;

  while (true) {
    const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${fundCode}&pageIndex=${pageIndex}&pageSize=${pageSize}&startDate=${startDate}&endDate=${endDate}`;
    
    const data = await new Promise((resolve, reject) => {
      https.get(url, { 
        headers: { 
          'Referer': 'https://fund.eastmoney.com',
          'User-Agent': 'Mozilla/5.0'
        }
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(d));
      }).on('error', reject);
    });

    const json = JSON.parse(data);
    const list = json.Data?.LSJZList || [];
    
    if (list.length === 0) break;
    
    allData.push(...list);
    
    if (list.length < pageSize) break;
    pageIndex++;
    
    // 100ms间隔
    await new Promise(r => setTimeout(r, 100));
  }

  const candles = allData
    .filter(r => r.DWJZ && parseFloat(r.DWJZ) > 0)
    .map(r => ({
      date: r.FSRQ,
      open: parseFloat(r.DWJZ),
      close: parseFloat(r.DWJZ),
      high: parseFloat(r.DWJZ),
      low: parseFloat(r.DWJZ),
      volume: 0,
      nav: parseFloat(r.DWJZ),
      accNav: parseFloat(r.FHDJJ) || parseFloat(r.DWJZ),
      dailyReturn: parseFloat(r.JZZZL) || 0
    }))
    .reverse();

  return candles;
}

/**
 * 列出可用基金
 */
function listAvailableFunds() {
  return Object.entries(FUND_MAP).map(([code, info]) => ({
    code,
    name: info.name,
    type: info.type,
    risk: info.risk
  }));
}

module.exports = { getFundCandles, listAvailableFunds, FUND_MAP };
