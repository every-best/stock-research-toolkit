/**
 * 每日研究自动化脚本
 * 由 OpenClaw cron 每日调用，推送报告到飞书
 * 
 * 使用方法:
 *   node scripts/daily_research.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 工作目录
const WORK_DIR = path.join(__dirname, '..');
const REPORTS_DIR = path.join(WORK_DIR, 'reports');

// 收集最近的研究报告
function getLatestReports() {
  if (!fs.existsSync(REPORTS_DIR)) return [];
  
  const files = fs.readdirSync(REPORTS_DIR)
    .filter(f => f.startsWith('research_') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(REPORTS_DIR, f),
      time: fs.statSync(path.join(REPORTS_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  
  return files.slice(0, 4); // 最近4个
}

// 解析报告内容
function parseReport(filePath) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!content.bestStrategy) return null;
    
    const bs = content.bestStrategy;
    return {
      symbol: filePath.includes('SPY') ? 'SPY' : 'QQQ',
      strategy: filePath.includes('MA') ? 'MA' : filePath.includes('RSI') ? 'RSI' : 'Momentum',
      sharpe: bs.metrics.sharpe,
      totalReturn: bs.metrics.totalReturn,
      annualizedReturn: bs.metrics.annualizedReturn,
      maxDrawdown: bs.metrics.maxDrawdown,
      winRate: bs.metrics.winRate,
      totalTrades: bs.metrics.totalTrades,
      params: bs.params
    };
  } catch (e) {
    return null;
  }
}

// 生成飞书消息
function buildFeishuMessage(reports) {
  if (reports.length === 0) {
    return { content: '📈 今日策略研究：无新报告' };
  }
  
  let lines = ['📊 **今日策略研究快报**\n'];
  lines.push(`生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`);
  lines.push('─'.repeat(40));
  
  for (const r of reports) {
    if (!r) continue;
    lines.push(`\n**${r.symbol} - ${r.strategy}策略**`);
    lines.push(`  Sharpe: ${r.sharpe}`);
    lines.push(`  年化收益: ${r.annualizedReturn}%`);
    lines.push(`  最大回撤: ${r.maxDrawdown}%`);
    lines.push(`  胜率: ${r.winRate}%`);
    lines.push(`  交易次数: ${r.totalTrades}`);
    lines.push(`  参数: ${JSON.stringify(r.params)}`);
    lines.push('');
  }
  
  lines.push('─'.repeat(40));
  lines.push('\n💡 回复"继续研究"可追加实验方向');
  
  return { content: lines.join('\n') };
}

async function main() {
  console.log('🔬 开始每日策略研究...\n');
  
  // 获取最新报告
  const latestReports = getLatestReports();
  console.log('📁 最新报告:', latestReports.map(r => r.name));
  
  // 解析
  const parsed = latestReports.map(r => parseReport(r.path)).filter(Boolean);
  
  // 生成消息
  const msg = buildFeishuMessage(parsed);
  console.log('\n📤 推送内容:\n', msg.content);
  
  // TODO: 推送飞书（需要 lark-cli 配置好后启用）
  // await sendToFeishu(msg);
  
  return msg;
}

main().catch(console.error);

module.exports = { main, buildFeishuMessage, parseReport };
