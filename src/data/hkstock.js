/**
 * 港股 ETF 数据 - 基于腾讯财经
 * 
 * 代码格式：
 * - 指数: hkHSI, hkHSTECH, hkDJI, hkIXIC, hkSPX
 * - ETF: hk02800 (盈富), hk02823 (A50), hk03033 (恒生科技), hk03188 (沪深300), hk09834 (安硕恒生科技)
 * 
 * 注意：腾讯财经仅提供约500个交易日（2024年至今）
 */

const https = require('https');

/**
 * 港股/离岸ETF代码映射
 */
const INDEX_MAP = {
  // 全球指数（腾讯代码）
  'hkHSI':    { name: '恒生指数',           code: 'hkHSI' },
  'hkHSTECH': { name: '恒生科技指数',       code: 'hkHSTECH' },
  'hkDJI':    { name: '道琼斯指数',         code: 'hkDJI' },
  'hkIXIC':   { name: '纳斯达克指数',       code: 'hkIXIC' },
  'hkSPX':    { name: '标普500指数',        code: 'hkSPX' },
  // 港股ETF（腾讯代码: hk + 4位数字）
  'hk02800':  { name: '盈富基金(恒生指数)',  code: 'hk02800' },
  'hk02823':  { name: 'A50中国(FTSE A50)',  code: 'hk02823' },
  'hk03033':  { name: '南方恒生科技ETF',    code: 'hk03033' },
  'hk03188':  { name: '华夏沪深300ETF',     code: 'hk03188' },
  'hk09834':  { name: '安硕恒生科技ETF',     code: 'hk09834' },
};

/**
 * 获取腾讯财经港股/全球指数历史K线
 * @param {string} symbol - 代码
 * @param {number} count - 获取条数（默认500）
 */
function getHKIndexCandles(symbol = 'hkHSI', count = 500) {
  return new Promise((resolve, reject) => {
    const url = `https://web.ifzq.gtimg.cn/appstock/app/kline/kline?_var=kline_day&param=${symbol},day,,,${count}`;
    
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data.replace(/^[^=]+=/, ''));
          const dayData = json.data?.[symbol]?.day;
          
          if (!Array.isArray(dayData) || dayData.length === 0) {
            reject(new Error(`No data for symbol ${symbol}`));
            return;
          }
          
          // 转换格式: [日期,收盘,开盘,高,低,成交量] → [{ date, close, open, high, low, volume }]
          const candles = dayData.map(d => ({
            date: d[0],
            close: parseFloat(d[1]),
            open: parseFloat(d[2]),
            high: parseFloat(d[3]),
            low: parseFloat(d[4]),
            volume: parseFloat(d[5])
          }));
          
          resolve(candles);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function listAvailableIndices() {
  return Object.entries(INDEX_MAP).map(([code, info]) => ({
    code,
    name: info.name
  }));
}

module.exports = { getHKIndexCandles, listAvailableIndices, INDEX_MAP };
