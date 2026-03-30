/**
 * autosearch_value.js — 长线价值投资系统
 * 
 * 每日 9:00 运行
 * 专注：港股（科技/军工/医疗/蓝筹）+ 美股价值股
 * 
 * 策略：
 * 1. 低估值：价格接近52周低点或历史低点
 * 2. 高股息：股息率 > 3%
 * 3. 趋势确认：价格在均线上方（排除下跌趋势）
 * 4. 基本面：ROE > 15%（需要有基本面数据）
 */

import { getValueUniverse } from './value_investment_universe.js';
import { getBatchCandles, calcValueMetrics } from './value_data_fetcher.js';
import { pushValueReport } from './openclaw_hooks.js';
import { formatDate } from './utils.js';

/**
 * 长线价值投资评分
 * 
 * 指标：
 * - priceVsHigh252: 距离52周高点越远分越高（跌得越多分越高）
 * - position52w: 52周位置越低分越高
 * - priceVsMa252: 价格低于均线越多分越高（均值回归）
 * - dividendYield: 越高分越高（需要外部数据，暂用波动率替代）
 * - vol20: 波动率适中给分（太高太低都不好）
 */
function scoreAsValueStock(metrics) {
  if (!metrics) return { score: 0, reasons: [] };
  
  const {
    currentPrice, high252, low252, ma252,
    priceVsHigh252, priceVsMa252, position52w, vol20
  } = metrics;
  
  let score = 0;
  const reasons = [];
  
  // 1. 距离高点跌幅（越大越被低估）最高40分
  const drawdownPct = Math.abs(priceVsHigh252) * 100;
  if (drawdownPct > 40) {
    score += 40;
    reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`);
  } else if (drawdownPct > 30) {
    score += 30;
    reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`);
  } else if (drawdownPct > 20) {
    score += 20;
    reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`);
  } else if (drawdownPct > 10) {
    score += 10;
    reasons.push(`从高点跌${drawdownPct.toFixed(0)}%`);
  }
  
  // 2. 52周位置越低越好 最高30分
  if (position52w < 0.2) {
    score += 30;
    reasons.push('52周低位');
  } else if (position52w < 0.3) {
    score += 20;
    reasons.push('52周偏低');
  } else if (position52w < 0.4) {
    score += 10;
    reasons.push('52周中部');
  }
  
  // 3. 价格vs均线（低于均线=低估）最高20分
  if (priceVsMa252 < -0.3) {
    score += 20;
    reasons.push('大幅低于均线');
  } else if (priceVsMa252 < -0.15) {
    score += 12;
    reasons.push('低于均线');
  } else if (priceVsMa252 < -0.05) {
    score += 6;
    reasons.push('略低于均线');
  }
  
  // 4. 波动率适中（不太高不太低）最高10分
  if (vol20 > 0.15 && vol20 < 0.35) {
    score += 10;
    reasons.push('波动率适中');
  } else if (vol20 > 0.1 && vol20 < 0.45) {
    score += 5;
    reasons.push('波动率正常');
  }
  
  return { score, reasons };
}

/**
 * 主分析函数
 */
async function runValueAnalysis() {
  const today = formatDate(new Date());
  console.log('═'.repeat(70));
  console.log(`📊 AutoSearch 长线价值投资 — ${today}`);
  console.log('═'.repeat(70));
  
  const universe = getValueUniverse();
  const allStocks = universe.all;
  
  console.log(`\n📋 候选股票: ${allStocks.length} 只`);
  console.log(`   港股: ${universe.hk.length} 只`);
  console.log(`   美股: ${universe.us.length} 只`);
  
  // 批量获取数据
  const priceData = await getBatchCandles(allStocks, { outputSize: 252 });
  
  // 计算各股票价值指标
  console.log('\n📈 计算价值投资指标...');
  
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
  
  // 按评分排序
  results.sort((a, b) => b.valueScore - a.valueScore);
  
  // 分类输出
  console.log('\n' + '='.repeat(70));
  console.log('🏆 价值投资评分 TOP 20');
  console.log('='.repeat(70));
  console.log('代码       名称            行业      评分  现价      从高点   52W位置  原因');
  console.log('-'.repeat(90));
  
  for (let i = 0; i < Math.min(20, results.length); i++) {
    const s = results[i];
    const market = s.symbol.endsWith('.HK') ? '港股' : '美股';
    console.log(
      `${s.symbol.padEnd(11)} ${s.name.padEnd(14).slice(0, 14)} ${market.padEnd(6)} ${String(s.valueScore).padEnd(5)} ` +
      `$${s.currentPrice.toFixed(2).padEnd(10)} ${(s.priceVsHigh252 * 100).toFixed(1).padEnd(8)}% ` +
      `${(s.position52w * 100).toFixed(0)}%      ${s.valueReasons.join(', ')}`
    );
  }
  
  // 按市场分组
  const hkStocks = results.filter(s => s.symbol.endsWith('.HK'));
  const usStocks = results.filter(s => !s.symbol.endsWith('.HK'));
  
  console.log('\n' + '='.repeat(70));
  console.log('🇭🇰 港股价值投资 TOP 10');
  console.log('='.repeat(70));
  for (let i = 0; i < Math.min(10, hkStocks.length); i++) {
    const s = hkStocks[i];
    console.log(
      `${s.symbol.padEnd(11)} ${s.name.padEnd(14).slice(0, 14)} ` +
      `评分${String(s.valueScore).padEnd(4)} ` +
      `现价$${s.currentPrice.toFixed(2).padEnd(10)} ` +
      `从高点${(s.priceVsHigh252 * 100).toFixed(1)}% ` +
      `52W:${(s.position52w * 100).toFixed(0)}%`
    );
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🇺🇸 美股价值投资 TOP 10');
  console.log('='.repeat(70));
  for (let i = 0; i < Math.min(10, usStocks.length); i++) {
    const s = usStocks[i];
    console.log(
      `${s.symbol.padEnd(8)} ${s.name.padEnd(18).slice(0, 18)} ` +
      `评分${String(s.valueScore).padEnd(4)} ` +
      `现价$${s.currentPrice.toFixed(2).padEnd(10)} ` +
      `从高点${(s.priceVsHigh252 * 100).toFixed(1)}% ` +
      `52W:${(s.position52w * 100).toFixed(0)}%`
    );
  }
  
  // 按行业分组
  console.log('\n' + '='.repeat(70));
  console.log('📊 行业分布（评分 ≥ 50）');
  console.log('='.repeat(70));
  
  const highValue = results.filter(s => s.valueScore >= 50);
  const bySector = {};
  for (const s of highValue) {
    bySector[s.sector] = bySector[s.sector] || [];
    bySector[s.sector].push(s);
  }
  
  for (const [sector, stocks] of Object.entries(bySector)) {
    console.log(`\n${sector} (${stocks.length}只):`);
    for (const s of stocks.slice(0, 5)) {
      console.log(`  ${s.symbol} ${s.name} 评分${s.valueScore} 从高点${(s.priceVsHigh252 * 100).toFixed(1)}%`);
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('⚠️  注意：价值投资需耐心持有，建议结合基本面分析决策');
  console.log('═'.repeat(70));
  
  return results;
}

// 命令行入口
const args = process.argv.slice(2);

async function main() {
  const results = await runValueAnalysis();
  
  if (args.includes('--push') && results.length > 0) {
    await pushValueReport(results);
  }
  
  return results;
}

// 仅在直接运行时执行
const isMain = import.meta.url === 'file://' + process.argv[1]?.replace(/\\/g, '/');
if (isMain) {
  main();
}

export { runValueAnalysis, scoreAsValueStock };
export default { runValueAnalysis, scoreAsValueStock };
