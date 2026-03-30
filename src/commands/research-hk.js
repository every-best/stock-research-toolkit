/**
 * research-hk.js - 港股策略研究
 * 
 * 使用东方财富数据源，支持港股
 * 使用方法:
 *   node src/commands/research-hk.js
 */

const axios = require('axios');
const Backtester = require('../backtester/engine');
const { runBatch } = require('../backtester/optimizer');
const { MAStrategy, RSIStrategy, MomentumStrategy, BollingerStrategy, CombinedStrategy } = require('../backtester/strategies');
const fs = require('fs');
const path = require('path');

const EM_BASE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';

/**
 * 东方财富获取港股K线
 */
async function getEMHKCandles(symbol, options = {}) {
  const { outputSize = 500 } = options;
  
  // 东方财富格式: secid = 116.XXXXX (港股)
  let code = symbol.replace('.HK', '');
  code = code.padStart(5, '0');
  const secid = `116.${code}`;
  
  const url = `${EM_BASE_URL}?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&end=20500101&lmt=${outputSize}`;
  
  try {
    const res = await axios.get(url, {
      headers: {
        'Referer': 'https://finance.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 10000
    });
    
    const data = res.data.data;
    if (!data || !data.klines) return [];
    
    return data.klines.map(kline => {
      const [date, open, close, high, low, volume] = kline.split(',');
      return {
        date,
        open: parseFloat(open),
        close: parseFloat(close),
        high: parseFloat(high),
        low: parseFloat(low),
        volume: parseInt(volume)
      };
    });
  } catch (err) {
    console.error(`获取港股 ${symbol} 失败:`, err.message);
    return [];
  }
}

/**
 * 港股候选标的 - 完整列表
 */
const HK_STOCKS = [
  // AI / 大模型
  { symbol: '02228.HK', name: '晶泰控股', sector: 'AI/大模型' },
  { symbol: '03696.HK', name: '英矽智能', sector: 'AI/大模型' },
  { symbol: '00100.HK', name: 'MiniMax', sector: 'AI/大模型' },
  { symbol: '02513.HK', name: '智谱', sector: 'AI/大模型' },
  { symbol: '02556.HK', name: '迈富时', sector: 'AI/大模型' },
  { symbol: '01384.HK', name: '滴普科技', sector: 'AI/大模型' },
  
  // 内容创作与娱乐
  { symbol: '01698.HK', name: '腾讯音乐-SW', sector: '内容娱乐' },
  { symbol: '09899.HK', name: '网易云音乐', sector: '内容娱乐' },
  { symbol: '00772.HK', name: '阅文集团', sector: '内容娱乐' },
  { symbol: '01060.HK', name: '大麦娱乐', sector: '内容娱乐' },
  { symbol: '00136.HK', name: '中国儒意', sector: '内容娱乐' },
  { symbol: '09911.HK', name: '赤子城科技', sector: '内容娱乐' },
  { symbol: '01357.HK', name: '美图公司', sector: '内容娱乐' },
  { symbol: '03738.HK', name: '阜博集团', sector: '内容娱乐' },
  
  // 营销与电商
  { symbol: '01860.HK', name: '汇量科技', sector: '营销电商' },
  
  // AI游戏
  { symbol: '02400.HK', name: '心动公司', sector: 'AI游戏' },
  
  // AI视觉
  { symbol: '00020.HK', name: '商汤-W', sector: 'AI视觉' },
  
  // 智驾与机器人
  { symbol: '09880.HK', name: '优必选', sector: '智驾机器人' },
  { symbol: '02432.HK', name: '越疆', sector: '智驾机器人' },
  { symbol: '09660.HK', name: '地平线机器人-W', sector: '智驾机器人' },
  { symbol: '09868.HK', name: '小鹏汽车-W', sector: '智驾机器人' },
  { symbol: '02015.HK', name: '理想汽车-W', sector: '智驾机器人' },
  { symbol: '02252.HK', name: '微创机器人-B', sector: '智驾机器人' },
  { symbol: '02590.HK', name: '极智嘉-W', sector: '智驾机器人' },
  
  // Physical AI
  { symbol: '06651.HK', name: '五一视界', sector: 'Physical AI' },
  
  // AI+解决方案
  { symbol: '03896.HK', name: '金山云', sector: 'AI+解决方案' },
  
  // AI+SaaS
  { symbol: '00268.HK', name: '金蝶国际', sector: 'AI+SaaS' },
  { symbol: '03888.HK', name: '金山软件', sector: 'AI+SaaS' },
  { symbol: '06682.HK', name: '范式智能', sector: 'AI+SaaS' },
  
  // AI+医疗
  { symbol: '06618.HK', name: '京东健康', sector: 'AI+医疗' },
  { symbol: '00853.HK', name: '微创医疗', sector: 'AI+医疗' },
  { symbol: '00241.HK', name: '阿里健康', sector: 'AI+医疗' },
  { symbol: '01833.HK', name: '平安好医生', sector: 'AI+医疗' },
  { symbol: '02506.HK', name: '讯飞医疗科技', sector: 'AI+医疗' },
  
  // 互联网巨头
  { symbol: '0700.HK', name: '腾讯控股', sector: '互联网' },
  { symbol: '9988.HK', name: '阿里巴巴', sector: '互联网' },
  { symbol: '3690.HK', name: '美团', sector: '互联网' },
  { symbol: '9618.HK', name: '京东集团', sector: '互联网' },
  { symbol: '1810.HK', name: '小米集团', sector: '互联网' },
  { symbol: '1024.HK', name: '快手-W', sector: '互联网' },
  { symbol: '2382.HK', name: '舜宇光学', sector: '互联网' },
  { symbol: '09626.HK', name: '哔哩哔哩', sector: '互联网' },
];

async function runResearch() {
  console.log(`\n📈 港股策略研究`);
  console.log('='.repeat(50));
  
  const startDate = '2020-01-01';
  const endDate = '2026-03-01';
  const outputSize = 1500;
  
  console.log(`\n📋 当前研究方向:`);
  console.log(`   数据: 港股日线 ${startDate} ~ ${endDate}`);
  console.log(`   标的: ${HK_STOCKS.length} 只港股`);
  
  // 获取所有标的的数据
  console.log('\n📡 从东方财富获取港股数据...');
  
  const allResults = [];
  const failedStocks = [];
  
  for (const stock of HK_STOCKS) {
    process.stdout.write(`   ${stock.symbol}... `);
    
    const candles = await getEMHKCandles(stock.symbol, { outputSize });
    if (!candles || candles.length < 100) {
      console.log(`❌ 数据不足`);
      failedStocks.push(stock);
      continue;
    }
    
    // 过滤日期范围
    const filteredCandles = candles.filter(c => c.date >= startDate && c.date <= endDate);
    if (filteredCandles.length < 100) {
      console.log(`❌ 日期范围内数据不足`);
      failedStocks.push(stock);
      continue;
    }
    
    console.log(`✅ ${filteredCandles.length}根`);
    
    // 使用组合策略
    const StrategyClass = CombinedStrategy;
    const ranges = {
      maFast: [5, 10, 15],
      maSlow: [20, 30, 50],
      rsiPeriod: [7, 14, 21],
      rsiOversold: [25, 30, 35],
      rsiOverbought: [65, 70, 75]
    };
    
    const result = runBatch(filteredCandles, StrategyClass, {}, ranges, {
      minTrades: 5,
      totalTrades: 200
    });
    
    if (result.validCount > 0) {
      const best = result.results[0];
      allResults.push({
        ...stock,
        ...best,
        candles: filteredCandles
      });
      process.stdout.write(`   Sharpe=${best.sharpe?.toFixed(2)}\n`);
    }
  }
  
  // 按Sharpe排序
  allResults.sort((a, b) => (b.sharpe || 0) - (a.sharpe || 0));
  
  console.log('\n' + '='.repeat(70));
  console.log('🏆 港股策略研究结果汇总');
  console.log('='.repeat(70));
  console.log('代码       名称              行业            Sharpe  年化%   最大回撤%  胜率');
  console.log('-'.repeat(90));
  
  for (const r of allResults.slice(0, 30)) {
    console.log(
      `${r.symbol.padEnd(11)} ${r.name.padEnd(14).slice(0, 14)} ${r.sector.padEnd(12).slice(0, 12)} ` +
      `${(r.sharpe || 0).toFixed(2).padEnd(8)} ${((r.annualReturn || 0) * 100).toFixed(1).padEnd(8)} ` +
      `${((r.maxDrawdown || 0) * 100).toFixed(1).padEnd(12)} ${((r.winRate || 0) * 100).toFixed(0)}%`
    );
  }
  
  console.log(`\n📊 共分析 ${HK_STOCKS.length} 只，成功 ${allResults.length} 只，失败 ${failedStocks.length} 只`);
  
  if (failedStocks.length > 0) {
    console.log('\n❌ 数据获取失败:');
    failedStocks.forEach(s => console.log(`   ${s.symbol} ${s.name}`));
  }
  
  // 保存结果
  const report = {
    date: new Date().toISOString().split('T')[0],
    total: HK_STOCKS.length,
    success: allResults.length,
    failed: failedStocks.length,
    results: allResults,
    failedStocks: failedStocks
  };
  
  const reportPath = path.join(__dirname, '..', '..', 'reports', `research_hk_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 报告已保存: ${reportPath}`);
  
  return report;
}

// 运行
runResearch().catch(console.error);
