/**
 * 研究报告生成模块
 * 生成Markdown格式的分析报告
 */

const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor(outputDir = './reports') {
    this.outputDir = path.resolve(outputDir);
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 生成股票分析报告
   * @param {Object} stockData - 股票数据
   * @param {Object} indicators - 技术指标
   * @param {Object} signals - 交易信号
   * @returns {string} 报告文件路径
   */
  generateStockReport(stockData, indicators, signals) {
    const now = new Date().toISOString().split('T')[0];
    const filename = `${stockData.code}_${stockData.name}_${now}.md`;
    const filepath = path.join(this.outputDir, filename);

    let content = `# ${stockData.name} (${stockData.code}) 分析报告\n\n`;
    content += `**生成时间：** ${new Date().toLocaleString('zh-CN')}\n\n`;
    content += `---\n\n`;

    // 基本信息
    content += `## 📊 基本信息\n\n`;
    content += `| 项目 | 数值 |\n`;
    content += `|------|------|\n`;
    content += `| 名称 | ${stockData.name} |\n`;
    content += `| 代码 | ${stockData.code} |\n`;
    if (stockData.price) content += `| 现价 | ¥${stockData.price.toFixed(2)} |\n`;
    if (stockData.change) content += `| 涨跌 | ${stockData.change >= 0 ? '+' : ''}${stockData.change.toFixed(2)} (${stockData.changePercent?.toFixed(2)}%) |\n`;
    if (stockData.high) content += `| 最高 | ¥${stockData.high.toFixed(2)} |\n`;
    if (stockData.low) content += `| 最低 | ¥${stockData.low.toFixed(2)} |\n`;
    content += `\n`;

    // 技术指标
    content += `## 📈 技术指标\n\n`;

    // MA
    if (indicators.ma) {
      content += `### 移动平均线 (MA)\n\n`;
      const periods = Object.keys(indicators.ma);
      content += `| 周期 | 数值 | 信号 |\n`;
      content += `|------|------|------|\n`;
      periods.forEach(p => {
        const lastValue = indicators.ma[p][indicators.ma[p].length - 1];
        const prevValue = indicators.ma[p][indicators.ma[p].length - 2];
        const signal = lastValue > prevValue ? '📈 上' : '📉 下';
        content += `| MA${p} | ${lastValue?.toFixed(2) || '-'} | ${signal} |\n`;
      });
      content += `\n`;
    }

    // RSI
    if (indicators.rsi) {
      const lastRsi = indicators.rsi[indicators.rsi.length - 1];
      content += `### RSI (14日)\n\n`;
      content += `| 数值 | 状态 |\n`;
      content += `|------|------|\n`;
      let status = '中性';
      if (lastRsi > 70) status = '⚠️ 超买';
      else if (lastRsi < 30) status = '⚠️ 超卖';
      content += `| ${lastRsi?.toFixed(2)} | ${status} |\n\n`;
    }

    // MACD
    if (indicators.macd) {
      const lastMacd = indicators.macd.macd[indicators.macd.macd.length - 1];
      const lastSignal = indicators.macd.signal[indicators.macd.signal.length - 1];
      const lastHist = indicators.macd.histogram[indicators.macd.histogram.length - 1];
      content += `### MACD (12,26,9)\n\n`;
      content += `| 指标 | 数值 |\n`;
      content += `|------|------|\n`;
      content += `| DIF | ${lastMacd?.toFixed(4) || '-'} |\n`;
      content += `| DEA | ${lastSignal?.toFixed(4) || '-'} |\n`;
      content += `| MACD柱 | ${lastHist?.toFixed(4) || '-'} |\n\n`;
    }

    // KD
    if (indicators.kd) {
      const { k, d } = indicators.kd;
      const lastK = k[k.length - 1];
      const lastD = d[d.length - 1];
      content += `### KD (9日)\n\n`;
      content += `| 指标 | 数值 |\n`;
      content += `|------|------|\n`;
      content += `| K值 | ${lastK?.toFixed(2) || '-'} |\n`;
      content += `| D值 | ${lastD?.toFixed(2) || '-'} |\n\n`;
    }

    // 布林带
    if (indicators.bb) {
      const { upper, middle, lower } = indicators.bb;
      const lastUpper = upper[upper.length - 1];
      const lastMiddle = middle[middle.length - 1];
      const lastLower = lower[lower.length - 1];
      content += `### 布林带 (20,2)\n\n`;
      content += `| 轨道 | 数值 |\n`;
      content += `|------|------|\n`;
      content += `| 上轨 | ${lastUpper?.toFixed(2) || '-'} |\n`;
      content += `| 中轨 | ${lastMiddle?.toFixed(2) || '-'} |\n`;
      content += `| 下轨 | ${lastLower?.toFixed(2) || '-'} |\n\n`;
    }

    // 综合信号
    content += `## 🎯 综合信号\n\n`;
    content += `### 趋势信号\n`;
    if (signals.trend && signals.trend.length > 0) {
      signals.trend.forEach(s => content += `- ${s}\n`);
    } else {
      content += `- 无明确信号\n`;
    }
    content += `\n`;

    content += `### 动量信号\n`;
    if (signals.momentum && signals.momentum.length > 0) {
      signals.momentum.forEach(s => content += `- ${s}\n`);
    } else {
      content += `- 无明确信号\n`;
    }
    content += `\n`;

    // 操作建议
    content += `## 💡 操作建议\n\n`;
    content += this.generateAdvice(stockData, indicators, signals);

    // 风险提示
    content += `\n---\n\n`;
    content += `⚠️ **风险提示：** 本报告仅供参考，不构成投资建议。炒股有风险，入市需谨慎。\n`;

    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ 报告已生成: ${filepath}`);
    return filepath;
  }

  /**
   * 生成操作建议
   */
  generateAdvice(stockData, indicators, signals) {
    let advice = '';

    // 综合判断
    const bullishSignals = (signals.trend?.filter(s => s.includes('多头') || s.includes('金叉')).length || 0);
    const bearishSignals = (signals.trend?.filter(s => s.includes('空头') || s.includes('死叉')).length || 0);

    if (bullishSignals > bearishSignals + 1) {
      advice = `- **建议**：可以考虑逢低买入\n`;
      advice += `- **仓位**：轻仓试探，不宜重仓\n`;
      advice += `- **止损**：设置在关键支撑位下方\n`;
    } else if (bearishSignals > bullishSignals + 1) {
      advice = `- **建议**：建议观望或减仓\n`;
      advice += `- **仓位**：保持低仓位\n`;
      advice += `- **止损**：跌破关键支撑考虑出局\n`;
    } else {
      advice = `- **建议**：方向不明，保持观望\n`;
      advice += `- **仓位**：轻仓或空仓\n`;
      advice += `- **等待**：等待明确信号\n`;
    }

    return advice;
  }

  /**
   * 生成板块分析报告
   * @param {string[]} codes - 股票代码数组
   * @param {Object[]} stocksData - 股票数据数组
   */
  generateSectorReport(sectorName, stocksData) {
    const now = new Date().toISOString().split('T')[0];
    const filename = `${sectorName}_板块_${now}.md`;
    const filepath = path.join(this.outputDir, filename);

    let content = `# ${sectorName} 板块分析报告\n\n`;
    content += `**生成时间：** ${new Date().toLocaleString('zh-CN')}\n\n`;
    content += `---\n\n`;
    content += `## 📊 板块概况\n\n`;
    content += `| 代码 | 名称 | 现价 | 涨跌幅 | 量价配合 |\n`;
    content += `|------|------|------|--------|----------|\n`;

    stocksData.forEach(stock => {
      const change = stock.changePercent || 0;
      const volumeSignal = stock.volume > 1000000 ? '放量' : '缩量';
      content += `| ${stock.code} | ${stock.name} | ¥${stock.price?.toFixed(2) || '-'} | ${change >= 0 ? '+' : ''}${change?.toFixed(2)}% | ${volumeSignal} |\n`;
    });

    content += `\n---\n\n`;
    content += `⚠️ **风险提示：** 本报告仅供参考，不构成投资建议。\n`;

    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ 板块报告已生成: ${filepath}`);
    return filepath;
  }
}

module.exports = ReportGenerator;
