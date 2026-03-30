/**
 * push_value_wiki.js - 价值投资日报写入飞书Wiki
 * 
 * 使用方式:
 * node push_value_wiki.js
 */

import { getValueUniverse } from './value_investment_universe.js';
import { getBatchCandles, calcValueMetrics } from './value_data_fetcher.js';
import { formatDate } from './utils.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Lark Wiki API配置
const LARK_DOC_ID = 'SomJwcbKKiFy3VkxXrDcLUWSnNh';
const LARK_API_BASE = 'https://open.feishu.cn/open-apis';

async function getAccessToken() {
  // 从环境变量或配置文件获取
  return process.env.LARK_ACCESS_TOKEN;
}

/**
 * 长线价值投资评分
 */
function scoreAsValueStock(metrics) {
  if (!metrics) return { score: 0, reasons: [] };
  
  const { currentPrice, high252, low252, ma252, priceVsHigh252, priceVsMa252, position52w, vol20 } = metrics;
  
  let score = 0;
  const reasons = [];
  
  // 1. 距离高点跌幅
  const drawdownPct = Math.abs(priceVsHigh252) * 100;
  if (drawdownPct > 40) { score += 40; reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`); }
  else if (drawdownPct > 30) { score += 30; reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`); }
  else if (drawdownPct > 20) { score += 20; reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`); }
  else if (drawdownPct > 10) { score += 10; reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`); }
  
  // 2. 52周位置
  if (position52w < 0.2) { score += 30; reasons.push('52周最低'); }
  else if (position52w < 0.3) { score += 20; reasons.push('52周偏低'); }
  else if (position52w < 0.4) { score += 10; reasons.push('52周中性'); }
  
  // 3. 价格vs均线
  if (priceVsMa252 < -0.3) { score += 20; reasons.push('大幅低于均线'); }
  else if (priceVsMa252 < -0.15) { score += 12; reasons.push('低于均线'); }
  else if (priceVsMa252 < -0.05) { score += 6; reasons.push('略低于均线'); }
  
  // 4. 波动率
  if (vol20 > 0.15 && vol20 < 0.35) { score += 10; reasons.push('波动率适中'); }
  else if (vol20 > 0.1 && vol20 < 0.45) { score += 5; reasons.push('波动率正常'); }
  
  return { score, reasons };
}

/**
 * 更新飞书文档
 */
async function updateLarkDoc(markdown) {
  const token = await getAccessToken();
  if (!token) {
    console.log('⚠️ 未配置 LARK_ACCESS_TOKEN，使用本地输出');
    console.log(markdown);
    return false;
  }
  
  try {
    // 使用 lark-cli docs +update
    const { execSync } = require('child_process');
    const cmd = `lark-cli docs +update --doc "${LARK_DOC_ID}" --mode overwrite --markdown "${markdown.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (e) {
    console.error('更新文档失败:', e.message);
    return false;
  }
}

/**
 * 生成Markdown报告
 */
function generateMarkdown(results, hkResults, usResults) {
  const today = new Date().toISOString().split('T')[0];
  
  let md = `# 价值投资日报 - ${today}\n\n`;
  md += `> 自动生成 | 候选池 ${results.length} 只\n\n`;
  
  // 综合TOP 20
  md += `## 🏆 综合评分 TOP 20\n\n`;
  md += `| 排名 | 代码 | 名称 | 市场 | 评分 | 现价 | 从高点 | 52W位置 | 原因 |\n`;
  md += `|------|------|------|------|------|------|--------|---------|------|\n`;
  
  for (let i = 0; i < Math.min(20, results.length); i++) {
    const s = results[i];
    const market = s.symbol.endsWith('.HK') ? '🇭🇰港股' : '🇺🇸美股';
    md += `| ${i+1} | ${s.symbol} | ${s.name} | ${market} | **${s.valueScore}** | $${s.currentPrice?.toFixed(2) || '-'} | ${(s.priceVsHigh252 * 100).toFixed(1)}% | ${(s.position52w * 100).toFixed(0)}% | ${s.valueReasons.join(', ')} |\n`;
  }
  
  // 港股TOP 10
  md += `\n## 🇭🇰 港股价值 TOP 10\n\n`;
  md += `| 排名 | 代码 | 名称 | 评分 | 现价 | 从高点 | 52W位置 | 原因 |\n`;
  md += `|------|------|------|------|------|--------|---------|------|\n`;
  
  for (let i = 0; i < Math.min(10, hkResults.length); i++) {
    const s = hkResults[i];
    md += `| ${i+1} | ${s.symbol} | ${s.name} | **${s.valueScore}** | $${s.currentPrice?.toFixed(2) || '-'} | ${(s.priceVsHigh252 * 100).toFixed(1)}% | ${(s.position52w * 100).toFixed(0)}% | ${s.valueReasons.join(', ')} |\n`;
  }
  
  // 美股TOP 10
  md += `\n## 🇺🇸 美股价值 TOP 10\n\n`;
  md += `| 排名 | 代码 | 名称 | 评分 | 现价 | 从高点 | 52W位置 | 原因 |\n`;
  md += `|------|------|------|------|------|--------|---------|------|\n`;
  
  for (let i = 0; i < Math.min(10, usResults.length); i++) {
    const s = usResults[i];
    md += `| ${i+1} | ${s.symbol} | ${s.name} | **${s.valueScore}** | $${s.currentPrice?.toFixed(2) || '-'} | ${(s.priceVsHigh252 * 100).toFixed(1)}% | ${(s.position52w * 100).toFixed(0)}% | ${s.valueReasons.join(', ')} |\n`;
  }
  
  md += `\n---\n*本报告由 AutoSearch 价值投资系统自动生成*\n`;
  
  return md;
}

/**
 * 主流程
 */
async function main() {
  console.log('📊 价值投资日报生成中...');
  
  const universe = getValueUniverse();
  const allStocks = universe.all;
  
  console.log(`📋 候选股票: ${allStocks.length} 只`);
  
  // 获取数据
  const priceData = await getBatchCandles(allStocks, { outputSize: 252 });
  
  // 计算评分
  const results = [];
  for (const stock of allStocks) {
    const candles = priceData[stock.symbol];
    if (!candles || candles.length < 100) continue;
    
    const metrics = calcValueMetrics(candles);
    if (!metrics) continue;
    
    const { score, reasons } = scoreAsValueStock(metrics);
    
    results.push({
      ...stock,
      ...metrics,
      valueScore: score,
      valueReasons: reasons
    });
  }
  
  // 排序
  results.sort((a, b) => b.valueScore - a.valueScore);
  const hkResults = results.filter(s => s.symbol.endsWith('.HK'));
  const usResults = results.filter(s => !s.symbol.endsWith('.HK'));
  
  // 生成Markdown
  const markdown = generateMarkdown(results, hkResults, usResults);
  
  // 输出到控制台
  console.log('\n' + markdown);
  
  // 保存到文件
  const outputPath = path.join(__dirname, '..', '..', 'reports', `value_investment_${Date.now()}.md`);
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`\n💾 报告已保存: ${outputPath}`);
  
  return { results, hkResults, usResults, markdown };
}

main().catch(console.error);
