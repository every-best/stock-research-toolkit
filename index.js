/**
 * 股票研究分析工具 - 主入口
 * 
 * 使用方法：
 * node index.js <command> [options]
 * 
 * Commands:
 *   stock <code>     - 分析单只股票
 *   batch <codes>    - 批量分析多只股票
 *   search <keyword> - 搜索股票
 *   screener         - 条件筛选
 */

const fetcher = require('./src/data/fetcher');
const Indicators = require('./src/analysis/indicators');
const DataSaver = require('./src/storage/saver');
const ReportGenerator = require('./src/report/generator');

// 命令行参数
const args = process.argv.slice(2);
const command = args[0];

// 初始化模块
const saver = new DataSaver('./data');
const reportGen = new ReportGenerator('./reports');

/**
 * 分析单只股票
 */
async function analyzeStock(code) {
  console.log(`\n🔍 正在分析股票: ${code}\n`);

  // 1. 获取实时数据
  const realTime = await fetcher.getRealTime(code);
  if (!realTime) {
    console.log(`❌ 获取股票 ${code} 失败`);
    return;
  }
  console.log(`📊 ${realTime.name} (${realTime.code})`);
  console.log(`   价格: ¥${realTime.price.toFixed(2)}`);
  console.log(`   涨跌: ${realTime.change >= 0 ? '+' : ''}${realTime.change.toFixed(2)} (${realTime.changePercent.toFixed(2)}%)`);

  // 2. 获取历史K线
  console.log('\n📈 获取历史数据...');
  const klines = await fetcher.getHistory(code, { period: 'daily', count: 100 });
  if (klines.length === 0) {
    console.log(`❌ 获取历史数据失败`);
    return;
  }
  console.log(`   K线数量: ${klines.length} 条`);

  // 3. 计算技术指标
  console.log('\n🔧 计算技术指标...');
  const closes = klines.map(k => k.close);
  
  const indicators = {
    ma5: Indicators.MA(closes, 5),
    ma10: Indicators.MA(closes, 10),
    ma20: Indicators.MA(closes, 20),
    ma60: Indicators.MA(closes, 60),
    rsi: Indicators.RSI(closes, 14),
    macd: Indicators.MACD(closes, 12, 26, 9),
    kd: Indicators.KD(klines, 9),
    bb: Indicators.BollingerBands(closes, 20, 2)
  };

  // 4. 生成信号
  const signals = Indicators.generateSignals(indicators);

  // 5. 显示结果
  console.log('\n📊 技术指标:');
  console.log(`   MA5:  ${indicators.ma5[indicators.ma5.length - 1]?.toFixed(2)}`);
  console.log(`   MA20: ${indicators.ma20[indicators.ma20.length - 1]?.toFixed(2)}`);
  console.log(`   RSI:  ${indicators.rsi[indicators.rsi.length - 1]?.toFixed(2)}`);
  console.log(`   MACD: ${indicators.macd.histogram[indicators.macd.histogram.length - 1]?.toFixed(4)}`);

  console.log('\n🎯 信号:');
  console.log(`   趋势: ${signals.trend.join(', ') || '无'}`);
  console.log(`   动量: ${signals.momentum.join(', ') || '无'}`);

  // 6. 保存数据
  saver.saveJSON(`${code}_${realTime.name}_realtime`, realTime);
  saver.saveJSON(`${code}_${realTime.name}_klines`, klines);
  saver.saveJSON(`${code}_${realTime.name}_indicators`, indicators);

  // 7. 生成报告
  reportGen.generateStockReport(realTime, indicators, signals);

  console.log('\n✅ 分析完成!\n');
}

/**
 * 批量分析
 */
async function batchAnalyze(codes) {
  console.log(`\n🔍 批量分析 ${codes.length} 只股票...\n`);

  const results = await Promise.all(
    codes.map(async code => {
      const data = await fetcher.getRealTime(code);
      return data;
    })
  );

  // 显示结果
  console.log('📊 分析结果:\n');
  results.forEach(stock => {
    if (stock) {
      console.log(`${stock.name} (${stock.code}): ¥${stock.price.toFixed(2)} ${stock.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(stock.changePercent).toFixed(2)}%`);
    } else {
      console.log(`${code}: 获取失败`);
    }
  });

  // 保存
  saver.saveJSON('batch_analysis', results.filter(r => r !== null));

  console.log('\n✅ 批量分析完成!\n');
}

/**
 * 搜索股票
 */
async function searchStocks(keyword) {
  console.log(`\n🔍 搜索: ${keyword}\n`);

  const results = await fetcher.search(keyword);

  if (results.length === 0) {
    console.log('未找到相关股票');
    return;
  }

  console.log('📋 搜索结果:\n');
  results.forEach(stock => {
    console.log(`${stock.name} (${stock.code}) - ${stock.type}`);
  });

  return results;
}

/**
 * 主函数
 */
async function main() {
  console.log('═'.repeat(50));
  console.log('📈 股票研究分析工具 v1.0');
  console.log('═'.repeat(50));

  if (!command) {
    console.log('\n📖 使用方法:');
    console.log('  node index.js stock <code>     - 分析单只股票');
    console.log('  node index.js batch <codes>    - 批量分析');
    console.log('  node index.js search <keyword> - 搜索股票');
    console.log('\n示例:');
    console.log('  node index.js stock 600519    - 分析贵州茅台');
    console.log('  node index.js stock 000001    - 分析平安银行');
    console.log('  node index.js search 茅台      - 搜索茅台');
    console.log('');
    return;
  }

  switch (command) {
    case 'stock':
      if (!args[1]) {
        console.log('❌ 请提供股票代码');
        console.log('示例: node index.js stock 600519');
        return;
      }
      await analyzeStock(args[1]);
      break;

    case 'batch':
      if (!args[1]) {
        console.log('❌ 请提供股票代码（逗号分隔）');
        console.log('示例: node index.js batch 600519,000001,000002');
        return;
      }
      const codes = args[1].split(',');
      await batchAnalyze(codes);
      break;

    case 'search':
      if (!args[1]) {
        console.log('❌ 请提供搜索关键词');
        console.log('示例: node index.js search 茅台');
        return;
      }
      await searchStocks(args[1]);
      break;

    default:
      console.log(`❌ 未知命令: ${command}`);
  }
}

main().catch(console.error);
