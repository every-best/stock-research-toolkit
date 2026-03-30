/**
 * autosearch.js — AutoSearch 美股个股交易系统
 * 
 * 主入口：整合所有模块
 * 
 * 使用方法：
 * node src/autosearch/autosearch.js [command]
 * 
 * Commands:
 *   run          - 运行研究循环
 *   quick        - 使用快速候选池运行
 *   full         - 使用FMP API筛选完整候选池
 *   report       - 生成当前持仓报告
 */

import { runResearch } from './research_loop.js';
import { runRegressionAnalysis } from './regression_analysis.js';
import { loadHoldings, saveHoldings } from './storage.js';
import { getBatchRealTimePrices } from './data_fetcher.js';
import { checkStopLoss, generateHoldingsReport } from './stop_loss.js';
import { pushWeeklyReport, pushStopLossAlert } from './openclaw_hooks.js';
import { formatDate, getLastTradingDay } from './utils.js';

const args = process.argv.slice(2);
const command = args[0] || 'run';

/**
 * 主函数
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('🎯 AutoSearch 美股个股交易系统');
  console.log('═'.repeat(60));

  switch (command) {
    case 'run':
    case 'quick':
      {
        console.log('\n⚡ 运行快速研究循环（使用硬编码候选池）...\n');
        const report = await runResearch({
          useQuickUniverse: true,
          dryRun: true
        });
        
        // 推送到飞书
        if (args.includes('--push')) {
          await pushWeeklyReport(report);
        }
        
        // 价值投资回归分析
        if (args.includes('--value')) {
          console.log('\n' + '='.repeat(60));
          const predictions = runRegressionAnalysis();
          if (args.includes('--push') && predictions.length > 0) {
            await pushValueReport(predictions);
          }
        }
      }
      break;

    case 'full':
      {
        console.log('\n🔍 运行完整研究循环（使用FMP API筛选）...\n');
        console.log('⚠️ 注意：这需要 FMP API Key，会花费较长时间\n');
        
        const report = await runResearch({
          useQuickUniverse: false,
          dryRun: true
        });
        
        if (args.includes('--push')) {
          await pushWeeklyReport(report);
        }
      }
      break;

    case 'report':
      {
        console.log('\n📊 生成持仓报告...\n');
        
        const holdings = loadHoldings();
        const symbols = Object.keys(holdings);
        
        if (symbols.length === 0) {
          console.log('📭 当前无持仓');
          break;
        }
        
        const prices = await getBatchRealTimePrices(symbols);
        generateHoldingsReport(holdings, prices);
        
        // 止损检查
        const toStopLoss = checkStopLoss(holdings, prices);
        
        if (toStopLoss.length > 0 && args.includes('--push')) {
          for (const stop of toStopLoss) {
            await pushStopLossAlert(stop);
          }
        }
      }
      break;

    case 'value':
      {
        console.log('\n📈 价值投资回归分析...\n');
        const predictions = runRegressionAnalysis();
        
        if (args.includes('--push') && predictions.length > 0) {
          await pushValueReport(predictions);
        }
      }
      break;

    case 'stopcheck':
      {
        console.log('\n🔴 止损检查...\n');
        
        const holdings = loadHoldings();
        const symbols = Object.keys(holdings);
        
        if (symbols.length === 0) {
          console.log('📭 当前无持仓');
          break;
        }
        
        const prices = await getBatchRealTimePrices(symbols);
        const toStopLoss = checkStopLoss(holdings, prices);
        
        if (toStopLoss.length > 0) {
          console.log(`\n⚠️ 发现 ${toStopLoss.length} 只需要止损`);
          
          if (args.includes('--execute')) {
            console.log('\n⚡ 执行止损...');
            const updatedHoldings = { ...holdings };
            for (const stop of toStopLoss) {
              delete updatedHoldings[stop.symbol];
            }
            saveHoldings(updatedHoldings);
            console.log('✅ 止损执行完成');
          }
          
          if (args.includes('--push')) {
            for (const stop of toStopLoss) {
              await pushStopLossAlert(stop);
            }
          }
        } else {
          console.log('✅ 无需止损');
        }
      }
      break;

    case 'help':
      {
        console.log(`
📖 AutoSearch 美股个股系统 - 使用说明

命令:
  node src/autosearch/autosearch.js run       运行快速研究（推荐）
  node src/autosearch/autosearch.js full      使用API筛选完整候选池
  node src/autosearch/autosearch.js report     生成持仓报告
  node src/autosearch/autosearch.js stopcheck  执行止损检查
  node src/autosearch/autosearch.js value     运行价值投资回归分析

参数:
  --push  推送结果到飞书
  --execute  执行止损（默认仅模拟）

示例:
  node src/autosearch/autosearch.js run --push
  node src/autosearch/autosearch.js stopcheck --execute --push
  node src/autosearch/autosearch.js value --push
`);
      }
      break;

    default:
      console.log(`❌ 未知命令: ${command}`);
      console.log('   运行 "node src/autosearch/autosearch.js help" 查看帮助');
  }
}

main().catch(console.error);
