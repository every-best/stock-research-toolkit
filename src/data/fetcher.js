/**
 * 股票数据获取模块
 * 数据来源：东方财富、新浪财经（免费接口）
 */

const axios = require('axios');

class StockFetcher {
  constructor() {
    this.cache = new Map();
  }

  /**
   * 获取单个股票实时行情
   * @param {string} code - 股票代码 (e.g., '600519', '000001')
   * @returns {Promise<Object>} 股票数据
   */
  async getRealTime(code) {
    // 东方财富 secid格式: 1.上证股票, 0.深证股票
    const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f169,f170`;

    try {
      const res = await axios.get(url, {
        headers: {
          'Referer': 'https://finance.eastmoney.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const data = res.data.data;
      if (!data) return null;

      return {
        code,
        name: data.f58,
        price: data.f43 / 100,        // 当前价
        change: data.f43 / 100 - data.f60 / 100,  // 涨跌额
        changePercent: data.f170 / 100,  // 涨跌幅(%)
        high: data.f44 / 100,          // 最高价
        low: data.f45 / 100,           // 最低价
        open: data.f46 / 100,          // 开盘价
        prevClose: data.f60 / 100,     // 昨收
        volume: data.f47,              // 成交量(手)
        amount: data.f48,              // 成交额(元)
        time: new Date().toISOString()
      };
    } catch (err) {
      console.error(`获取股票 ${code} 失败:`, err.message);
      return null;
    }
  }

  /**
   * 批量获取实时行情
   * @param {string[]} codes - 股票代码数组
   * @returns {Promise<Object[]>} 股票数据数组
   */
  async getBatchRealTime(codes) {
    const results = await Promise.all(codes.map(code => this.getRealTime(code)));
    return results.filter(r => r !== null);
  }

  /**
   * 获取历史K线数据
   * @param {string} code - 股票代码
   * @param {Object} options - 配置参数
   * @param {string} options.period - K线周期 (daily/weekly/monthly)
   * @param {number} options.count - 数据数量 (默认100)
   * @returns {Promise<Object[]>} K线数据数组
   */
  async getHistory(code, options = {}) {
    const { period = 'daily', count = 100 } = options;
    const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;

    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${period === 'weekly' ? 102 : period === 'monthly' ? 103 : 101}&fqt=1&end=20500101&lmt=${count}`;

    try {
      const res = await axios.get(url, {
        headers: {
          'Referer': 'https://finance.eastmoney.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const data = res.data.data;
      if (!data || !data.klines) return [];

      return data.klines.map(kline => {
        const [date, open, close, high, low, volume, amount, amplitude] = kline.split(',');
        return {
          date,
          open: parseFloat(open),
          close: parseFloat(close),
          high: parseFloat(high),
          low: parseFloat(low),
          volume: parseInt(volume),
          amount: parseFloat(amount),
          amplitude: parseFloat(amplitude)  // 振幅(%)
        };
      });
    } catch (err) {
      console.error(`获取股票 ${code} 历史数据失败:`, err.message);
      return [];
    }
  }

  /**
   * 获取股票基本面数据（简化版）
   * @param {string} code - 股票代码
   * @returns {Promise<Object>} 基本面数据
   */
  async getFundamental(code) {
    const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f10,f9,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115`;

    try {
      const res = await axios.get(url, {
        headers: {
          'Referer': 'https://finance.eastmoney.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const data = res.data.data;
      if (!data) return null;

      return {
        code: code,
        name: data.f14,                    // 股票名称
        industry: data.f100,               // 所属行业
        totalShares: data.f10 / 10000,     // 总股本(万股)
        floatShares: data.f9 / 10000,      // 流通股本(万股)
        pe: data.f162,                    // 市盈率(动)
        pb: data.f167,                    // 市净率
        marketCap: data.f116 / 100000000, // 总市值(亿元)
        price: data.f43 / 100,            // 现价
      };
    } catch (err) {
      console.error(`获取股票 ${code} 基本面失败:`, err.message);
      return null;
    }
  }

  /**
   * 搜索股票
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Object[]>} 搜索结果
   */
  async search(keyword) {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&markettype=&mktnum=&jys=&classify=&sectype=&count=10`;

    try {
      const res = await axios.get(url, {
        headers: {
          'Referer': 'https://finance.eastmoney.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const data = res.data.QuotationCodeTable;
      if (!data) return [];

      return data.Data.map(item => ({
        code: item.Code,
        name: item.Name,
        type: item.Market,
      }));
    } catch (err) {
      console.error(`搜索失败:`, err.message);
      return [];
    }
  }
}

module.exports = new StockFetcher();
