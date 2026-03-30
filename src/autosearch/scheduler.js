/**
 * scheduler.js — AutoSearch 定时任务
 * 
 * 使用方式（Windows 任务计划程序）：
 * schtasks /create /tn "AutoSearch Daily" /tr "path\to\autosearch.bat" /sc daily /st 20:00
 * 
 * 或直接运行：
 * node scheduler.js
 */

import { runResearch } from './research_loop.js';
import { loadHoldings, saveHoldings, loadHistory } from './storage.js';
import { formatDate } from './utils.js';

const CONFIG = {
  dryRun: true,        // true=模拟, false=实盘
  totalCapital: 100000,
  useQuickUniverse: true,
  maxPositions: 8
};

async function main() {
  const today = formatDate(new Date());
  console.log('═'.repeat(70));
  console.log(`🤖 AutoSearch 定时研究任务 - ${today}`);
  console.log('═'.repeat(70));

  try {
    const report = await runResearch({
      useQuickUniverse: CONFIG.useQuickUniverse,
      maxPositions: CONFIG.maxPositions,
      totalCapital: CONFIG.totalCapital,
      dryRun: CONFIG.dryRun
    });

    console.log('\n✅ 定时任务完成');
    return report;
  } catch (err) {
    console.error('❌ 定时任务失败:', err);
    process.exit(1);
  }
}

// 直接运行时执行
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}

export { main as runScheduledTask };
