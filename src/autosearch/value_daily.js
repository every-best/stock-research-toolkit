/**
 * value_daily.js - 价值投资日报定时任务
 * 
 * 定时运行，每天早上10点
 * node value_daily.js
 */

import { getValueUniverse } from './value_investment_universe.js';
import { getBatchCandles, calcValueMetrics } from './value_data_fetcher.js';
import { formatDate } from './utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lark Wiki Doc ID
const LARK_DOC_ID = 'SomJwcbKKiFy3VkxXrDcLUWSnNh';

/**
 * 长线价值投资评分
 */
function scoreAsValueStock(metrics) {
  if (!metrics) return { score: 0, reasons: [] };
  
  const { priceVsHigh252, priceVsMa252, position52w, vol20 } = metrics;
  
  let score = 0;
  const reasons = [];
  
  const drawdownPct = Math.abs(priceVsHigh252) * 100;
  if (drawdownPct > 40) { score += 40; reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`); }
  else if (drawdownPct > 30) { score += 30; reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`); }
  else if (drawdownPct > 20) { score += 20; reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`); }
  else if (drawdownPct > 10) { score += 10; reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`); }
  
  if (position52w < 0.2) { score += 30; reasons.push('52周最低'); }
  else if (position52w < 0.3) { score += 20; reasons.push('52周偏低'); }
  else if (position52w < 0.4) { score += 10; reasons.push('52周中性'); }
  
  if (priceVsMa252 < -0.3) { score += 20; reasons.push('大幅低于均线'); }
  else if (priceVsMa252 < -0.15) { score += 12; reasons.push('低于均线'); }
  else if (priceVsMa252 < -0.05) { score += 6; reasons.push('略低于均线'); }
  
  if (vol20 > 0.15 && vol20 < 0.35) { score += 10; reasons.push('波动率适中'); }
  else if (vol20 > 0.1 && vol20 < 0.45) { score += 5; reasons.push('波动率正常'); }
  
  return { score, reasons };
}

/**
 * 生成Markdown报告
 */
function generateMarkdown(results, hkResults, usResults) {
  const today = new Date().toISOString().split('T')[0];
  
  let md = `# 价值投资日报 - ${today}\n\n`;
  md += `> 自动生成 | 候选池 ${results.length} 只\n\n`;
  
  md += `## 🏆 综合评分 TOP 20\n\n`;
  md += `| 排名 | 代码 | 名称 | 市场 | 评分 | 现价 | 从高点 | 52W位置 | 原因 |\n`;
  md += `|------|------|------|------|------|------|--------|---------|------|\n`;
  
  for (let i = 0; i < Math.min(20, results.length); i++) {
    const s = results[i];
    const market = s.symbol.endsWith('.HK') ? '🇭🇰港股' : '🇺🇸美股';
    md += `| ${i+1} | ${s.symbol} | ${s.name} | ${market} | **${s.valueScore}** | $${s.currentPrice?.toFixed(2) || '-'} | ${(s.priceVsHigh252 * 100).toFixed(1)}% | ${(s.position52w * 100).toFixed(0)}% | ${s.valueReasons.join(', ')} |\n`;
  }
  
  md += `\n## 🇭🇰 港股价值 TOP 10\n\n`;
  md += `| 排名 | 代码 | 名称 | 评分 | 现价 | 从高点 | 52W位置 | 原因 |\n`;
  md += `|------|------|------|------|------|--------|---------|------|\n`;
  
  for (let i = 0; i < Math.min(10, hkResults.length); i++) {
    const s = hkResults[i];
    md += `| ${i+1} | ${s.symbol} | ${s.name} | **${s.valueScore}** | $${s.currentPrice?.toFixed(2) || '-'} | ${(s.priceVsHigh252 * 100).toFixed(1)}% | ${(s.position52w * 100).toFixed(0)}% | ${s.valueReasons.join(', ')} |\n`;
  }
  
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
 * 更新飞书文档
 */
async function updateLarkDoc(markdown) {
  const { execSync } = require('child_process');
  const escaped = markdown.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const cmd = `lark-cli docs +update --doc "${LARK_DOC_ID}" --mode overwrite --markdown "${escaped}"`;
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log('✅ 飞书文档更新成功');
    return true;
  } catch (e) {
    console.error('❌ 飞书文档更新失败:', e.message);
    return false;
  }
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
  
  // 保存本地
  const reportsDir = path.join(__dirname, '..', '..', 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const outputPath = path.join(reportsDir, `value_investment_${Date.now()}.md`);
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`💾 本地报告: ${outputPath}`);
  
  // 更新飞书
  await updateLarkDoc(markdown);
  
  console.log('✅ 价值投资日报完成');
  return { results, hkResults, usResults };
}

main().catch(console.error);
