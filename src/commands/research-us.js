/**
 * research-us.js - 美股策略研究
 * 
 * 使用 Twelve Data 数据源
 * 包含：AI相关股票 + 价值投资美股池
 * 
 * 使用方法:
 *   node src/commands/research-us.js
 */

import { getTDailyCandles } from '../data/twelvedata.js';
import { runBatch } from '../backtester/optimizer.js';
import { CombinedStrategy } from '../backtester/strategies.js';
import fs from 'fs';
import path from 'path';

// Twelve Data API Key
const TD_API_KEY = process.env.TWELVE_DATA_API_KEY || 'your_api_key_here';

/**
 * 美股候选标的 - 完整列表
 */
const US_STOCKS = [
  // 科技价值股
  { symbol: 'ORCL', name: 'Oracle', sector: 'Technology' },
  { symbol: 'INTC', name: 'Intel', sector: 'Technology' },
  { symbol: 'AMD', name: 'AMD', sector: 'Technology' },
  { symbol: 'CSCO', name: 'Cisco', sector: 'Technology' },
  
  // AI + 广告/营销
  { symbol: 'APP', name: 'AppLovin', sector: 'AI/AdTech' },
  { symbol: 'META', name: 'Meta', sector: 'AI/AdTech' },
  { symbol: 'GOOGL', name: 'Google', sector: 'AI/AdTech' },
  { symbol: 'TWLO', name: 'Twilio', sector: 'AI/AdTech' },
  { symbol: 'TTD', name: 'The Trade Desk', sector: 'AI/AdTech' },
  { symbol: 'APPS', name: 'Digital Turbine', sector: 'AI/AdTech' },
  { symbol: 'KVYO', name: 'Klaviyo', sector: 'AI/AdTech' },
  
  // AI + 大数据
  { symbol: 'SNOW', name: 'Snowflake', sector: 'AI/Data' },
  { symbol: 'MDB', name: 'MongoDB', sector: 'AI/Data' },
  { symbol: 'CFLT', name: 'Confluent', sector: 'AI/Data' },
  
  // AI + 安全
  { symbol: 'PANW', name: 'Palo Alto Networks', sector: 'AI/Security' },
  { symbol: 'CRWD', name: 'CrowdStrike', sector: 'AI/Security' },
  { symbol: 'FTNT', name: 'Fortinet', sector: 'AI/Security' },
  { symbol: 'DDOG', name: 'Datadog', sector: 'AI/Security' },
  { symbol: 'NET', name: 'Cloudflare', sector: 'AI/Security' },
  { symbol: 'RBRK', name: 'Rubrik', sector: 'AI/Security' },
  
  // AI + 企业服务
  { symbol: 'ZM', name: 'Zoom', sector: 'AI/Enterprise' },
  { symbol: 'PATH', name: 'UiPath', sector: 'AI/Enterprise' },
  { symbol: 'WDAY', name: 'Workday', sector: 'AI/Enterprise' },
  { symbol: 'CRM', name: 'Salesforce', sector: 'AI/Enterprise' },
  { symbol: 'MNDY', name: 'monday.com', sector: 'AI/Enterprise' },
  { symbol: 'SAP', name: 'SAP', sector: 'AI/Enterprise' },
  { symbol: 'AI', name: 'C3.ai', sector: 'AI/Enterprise' },
  { symbol: 'HUBS', name: 'HubSpot', sector: 'AI/Enterprise' },
  { symbol: 'GTLB', name: 'GitLab', sector: 'AI/Enterprise' },
  { symbol: 'TEAM', name: 'Atlassian', sector: 'AI/Enterprise' },
  
  // AI + 设计
  { symbol: 'ADBE', name: 'Adobe', sector: 'AI/Design' },
  
  // AI + 国防
  { symbol: 'PLTR', name: 'Palantir', sector: 'AI/Defense' },
  { symbol: 'BBAI', name: 'BigBear.ai', sector: 'AI/Defense' },
  
  // AI + 车队管理
  { symbol: 'IOT', name: 'Samsara', sector: 'AI/IOT' },
  
  // AI + 搜索
  { symbol: 'ESTC', name: 'Elastic', sector: 'AI/Search' },
  
  // AI + 办公
  { symbol: 'FRSH', name: 'Freshworks', sector: 'AI/Office' },
  
  // AI + 教育
  { symbol: 'DUOL', name: 'Duolingo', sector: 'AI/Education' },
  
  // AI + 医疗
  { symbol: 'VEEV', name: 'Veeva Systems', sector: 'AI/Healthcare' },
  { symbol: 'DOCU', name: 'DocuSign', sector: 'AI/Healthcare' },
  { symbol: 'SMAR', name: 'Smartsheet', sector: 'AI/Healthcare' },
  
  // 互联网
  { symbol: 'AMZN', name: 'Amazon', sector: 'Internet' },
  { symbol: 'NFLX', name: 'Netflix', sector: 'Internet' },
  { symbol: 'PYPL', name: 'PayPal', sector: 'Internet' },
  { symbol: 'SQ', name: 'Block', sector: 'Internet' },
  { symbol: 'SHOP', name: 'Shopify', sector: 'Internet' },
  
  // 芯片/硬件
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'Chips' },
  { symbol: 'AVGO', name: 'Broadcom', sector: 'Chips' },
  { symbol: 'TSM', name: 'Taiwan Semi', sector: 'Chips' },
  { symbol: 'QCOM', name: 'Qualcomm', sector: 'Chips' },
  { symbol: 'MRVL', name: 'Marvell', sector: 'Chips' },
  
  // 新能源
  { symbol: 'TSLA', name: 'Tesla', sector: 'EV' },
  { symbol: 'RIVN', name: 'Rivian', sector: 'EV' },
  { symbol: 'LCID', name: 'Lucid', sector: 'EV' },
  
  // 其他AI
  { symbol: 'U', name: 'Unity Software', sector: 'AI/Gaming' },
  { symbol: 'DKNG', name: 'DraftKings', sector: 'AI/Gaming' },
  { symbol: 'APP', name: 'AppLovin', sector: 'AI/Gaming' },
];

/**
 * 去重
 */
const uniqueStocks = US_STOCKS.filter((v, i, a) => a.findIndex(t => t.symbol === v.symbol) === i);

// 请求间隔（毫秒）
const REQUEST_INTERVAL = 1500;  // Twelve Data 免费版 8秒8次，所以间隔1.5秒

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runResearch() {
  console.log(`\n📈 美股策略研究`);
  console.log('='.repeat(50));
  
  console.log(`\n📋 候选股票: ${uniqueStocks.length} 只`);
  
  const startDate = '2020-01-01';
  const endDate = '2025-01-01';
  
  const allResults = [];
  const failedStocks = [];
  
  for (let i = 0; i < uniqueStocks.length; i++) {
    const stock = uniqueStocks[i];
    process.stdout.write(`[${i+1}/${uniqueStocks.length}] ${stock.symbol}... `);
    
    try {
      const candles = await getTDailyCandles(stock.symbol, startDate, endDate);
      
      if (!candles || candles.length < 100) {
        console.log(`❌ 数据不足 (${candles?.length || 0}根)`);
        failedStocks.push({ ...stock, reason: '数据不足' });
        continue;
      }
      
      // 过滤日期
      const filtered = candles.filter(c => c.date >= startDate && c.date <= endDate);
      if (filtered.length < 100) {
        console.log(`❌ 日期范围数据不足`);
        failedStocks.push({ ...stock, reason: '日期范围数据不足' });
        continue;
      }
      
      console.log(`✅ ${filtered.length}根`);
      
      // 策略优化
      const ranges = {
        maFast: [5, 10, 15],
        maSlow: [20, 30, 50],
        rsiPeriod: [7, 14, 21],
        rsiOversold: [25, 30, 35],
        rsiOverbought: [65, 70, 75]
      };
      
      const result = runBatch(filtered, CombinedStrategy, {}, ranges, {
        minTrades: 5,
        totalTrades: 100  // 减少到100加快速度
      });
      
      if (result.validCount > 0) {
        const best = result.results[0];
        allResults.push({
          ...stock,
          ...best,
          candles: filtered
        });
        console.log(`   Sharpe=${best.sharpe?.toFixed(2)}, 年化=${((best.annualReturn || 0) * 100).toFixed(1)}%`);
      } else {
        console.log(`   ❌ 策略无效`);
      }
      
    } catch (e) {
      console.log(`❌ ${e.message}`);
      failedStocks.push({ ...stock, reason: e.message });
    }
    
    // 间隔请求，避免限流
    await sleep(REQUEST_INTERVAL);
  }
  
  // 按Sharpe排序
  allResults.sort((a, b) => (b.sharpe || 0) - (a.sharpe || 0));
  
  // 输出结果
  console.log('\n' + '='.repeat(90));
  console.log('🏆 美股策略研究结果 TOP 30');
  console.log('='.repeat(90));
  
  for (let i = 0; i < Math.min(30, allResults.length); i++) {
    const r = allResults[i];
    console.log(
      `${(i+1).toString().padStart(2)}. ${r.symbol.padEnd(8)} ${r.name.padEnd(16)} ${r.sector.padEnd(14)} ` +
      `Sharpe:${(r.sharpe || 0).toFixed(2).padEnd(6)} 年化:${((r.annualReturn || 0) * 100).toFixed(1).padEnd(8)}% ` +
      `回撤:${((r.maxDrawdown || 0) * 100).toFixed(1).padEnd(7)}% 胜率:${((r.winRate || 0) * 100).toFixed(0)}%`
    );
  }
  
  console.log(`\n📊 总计: ${allResults.length}/${uniqueStocks.length} 只成功`);
  
  if (failedStocks.length > 0) {
    console.log(`\n❌ 失败 (${failedStocks.length} 只):`);
    failedStocks.slice(0, 10).forEach(s => console.log(`   ${s.symbol} - ${s.reason}`));
  }
  
  // 保存报告
  const report = {
    date: new Date().toISOString().split('T')[0],
    total: uniqueStocks.length,
    success: allResults.length,
    failed: failedStocks.length,
    results: allResults.slice(0, 30),
    failedStocks: failedStocks.slice(0, 20)
  };
  
  const reportPath = path.join(__dirname, '..', '..', 'reports', `research_us_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 报告已保存: ${reportPath}`);
  
  return report;
}

runResearch().catch(console.error);
