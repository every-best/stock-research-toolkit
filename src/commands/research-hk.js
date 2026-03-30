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
      }
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
 * 港股候选标的
 */
const HK_STOCKS = [
  '0700.HK',  // 腾讯控股
  '9988.HK',  // 阿里巴巴
  '3690.HK',  // 美团
  '9618.HK',  // 京东集团
  '1810.HK',  // 小米集团
  '1024.HK',  // 快手
  '2382.HK',  // 舜宇光学
  '9899.HK',  // 网易云音乐
  '09626.HK', // 哔哩哔哩
  '01357.HK', // 美图公司
  '01698.HK', // 腾讯音乐
  '01384.HK', // 滴普科技
  '00100.HK', // MiniMax
  '02228.HK', // 晶泰控股
  '03696.HK', // 英矽智能
  '02513.HK', // 智谱
  '02556.HK', // 迈富朝
  '00020.HK', // 商汤
  '09868.HK', // 小鹏汽车
  '02015.HK', // 理想汽车
];

async function runResearch() {
  console.log(`\n📈 港股策略研究`);
  console.log('='.repeat(50));
  
  const startDate = '2020-01-01';
  const endDate = '2026-03-01';
  const outputSize = 1500;
  
  console.log(`\n📋 当前研究方向:\n`);
  console.log(`   数据: 港股日线 ${startDate} ~ ${endDate}`);
  console.log(`   标的: ${HK_STOCKS.length} 只港股`);
  
  // 获取所有标的的数据
  console.log('\n📡 从东方财富获取港股数据...');
  
  const allResults = [];
  
  for (const symbol of HK_STOCKS) {
    console.log(`\n   正在研究: ${symbol}`);
    
    const candles = await getEMHKCandles(symbol, { outputSize });
    if (!candles || candles.length < 100) {
      console.log(`   ❌ 数据不足: ${candles?.length || 0} 根`);
      continue;
    }
    
    // 过滤日期范围
    const filteredCandles = candles.filter(c => c.date >= startDate && c.date <= endDate);
    if (filteredCandles.length < 100) {
      console.log(`   ❌ 日期范围内数据不足`);
      continue;
    }
    
    console.log(`   ✅ 获取 ${filteredCandles.length} 根K线`);
    
    // 使用组合策略
    const StrategyClass = CombinedStrategy;
    const ranges = {
      maFast: [5, 10, 15],
      maSlow: [20, 30, 50],
      rsiPeriod: [7, 14, 21],
      rsiOversold: [25, 30, 35],
      rsiOverbought: [65, 70, 75]
    };
    
    console.log(`   🔬 批量实验...`);
    const result = runBatch(filteredCandles, StrategyClass, {}, ranges, {
      minTrades: 5,
      totalTrades: 200
    });
    
    if (result.validCount > 0) {
      const best = result.results[0];
      allResults.push({
        symbol,
        ...best,
        candles: filteredCandles
      });
      console.log(`   🏆 最佳: Sharpe=${best.sharpe?.toFixed(2)}, 年化=${(best.annualReturn * 100).toFixed(1)}%, 回撤=${(best.maxDrawdown * 100).toFixed(1)}%`);
    }
  }
  
  // 按Sharpe排序
  allResults.sort((a, b) => (b.sharpe || 0) - (a.sharpe || 0));
  
  console.log('\n' + '='.repeat(70));
  console.log('🏆 港股策略研究结果汇总');
  console.log('='.repeat(70));
  console.log('代码       名称              Sharpe  年化%   最大回撤%  胜率    交易次数');
  console.log('-'.repeat(80));
  
  const nameMap = {
    '0700.HK': '腾讯控股', '9988.HK': '阿里巴巴', '3690.HK': '美团',
    '9618.HK': '京东集团', '1810.HK': '小米集团', '1024.HK': '快手',
    '2382.HK': '舜宇光学', '9899.HK': '网易云音乐', '09626.HK': '哔哩哔哩',
    '01357.HK': '美图公司', '01698.HK': '腾讯音乐', '01384.HK': '滴普科技',
    '00100.HK': 'MiniMax', '02228.HK': '晶泰控股', '03696.HK': '英矽智能',
    '02513.HK': '智谱', '02556.HK': '迈富朝', '00020.HK': '商汤',
    '09868.HK': '小鹏汽车', '02015.HK': '理想汽车'
  };
  
  for (const r of allResults.slice(0, 20)) {
    const name = nameMap[r.symbol] || r.symbol;
    console.log(
      `${r.symbol.padEnd(11)} ${name.padEnd(14).slice(0, 14)} ` +
      `${(r.sharpe || 0).toFixed(2).padEnd(8)} ${((r.annualReturn || 0) * 100).toFixed(1).padEnd(9)} ` +
      `${((r.maxDrawdown || 0) * 100).toFixed(1).padEnd(12)} ${((r.winRate || 0) * 100).toFixed(0).padEnd(8)} ` +
      `${r.totalTrades || 0}`
    );
  }
  
  // 保存结果
  const reportPath = path.join(__dirname, '..', '..', 'reports', `research_hk_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`\n💾 报告已保存: ${reportPath}`);
  
  return allResults;
}

// 运行
runResearch().catch(console.error);
