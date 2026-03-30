/**
 * openclaw_hooks.js — OpenClaw 推送钩子
 * 
 * AutoSearch 风格美股个股交易系统
 * 第五层：OpenClaw/飞书 信号推送
 * 
 * 支持两种推送方式：
 * 1. OpenClaw 内置飞书推送（通过 sessions_send）
 * 2. 直接 HTTP POST 到飞书 Webhook
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import "dotenv/config";

// 飞书 Webhook 配置
const FEISHU_WEBHOOK_URL = process.env.FEISHU_WEBHOOK_URL;
const FEISHU_BOT_NAME = 'AutoSearch 美股信号';

/**
 * 发送消息到飞书
 */
async function sendToFeishu(message) {
  if (!FEISHU_WEBHOOK_URL) {
    console.log('⚠️ 未配置 FEISHU_WEBHOOK_URL，跳过推送');
    return false;
  }

  try {
    const payload = {
      msg_type: 'text',
      content: {
        text: message
      }
    };

    await axios.post(FEISHU_WEBHOOK_URL, payload);
    console.log('✅ 飞书推送成功');
    return true;
  } catch (err) {
    console.error('❌ 飞书推送失败:', err.message);
    return false;
  }
}

/**
 * 发送富文本消息到飞书
 */
async function sendRichTextToFeishu(segments) {
  if (!FEISHU_WEBHOOK_URL) {
    console.log('⚠️ 未配置 FEISHU_WEBHOOK_URL，跳过推送');
    return false;
  }

  try {
    const payload = {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: '📊 AutoSearch 美股个股信号',
            content: segments
          }
        }
      }
    };

    await axios.post(FEISHU_WEBHOOK_URL, payload);
    console.log('✅ 飞书富文本推送成功');
    return true;
  } catch (err) {
    console.error('❌ 飞书推送失败:', err.message);
    return false;
  }
}

/**
 * 生成信号报告的飞书富文本格式
 */
export function formatFeishuRichReport(report) {
  const content = [];

  // 日期
  content.push([
    {
      tag: 'text',
      text: `📊 AutoSearch 美股个股信号 ${report.date}\n`
    },
    {
      tag: 'text',
      text: '─'.repeat(40) + '\n'
    }
  ]);

  // 新增买入
  const buyText = report.newBuys.length > 0
    ? report.newBuys.map(b => `• ${b.symbol} ${b.name} 仓位${(b.weight * 100).toFixed(1)}% [${b.reason}]`).join('\n')
    : '（无新信号）';
  
  content.push([
    { tag: 'text', text: '🆕 新增买入 (' + report.newBuys.length + ' 只):\n', style: { bold: true } },
    { tag: 'text', text: buyText + '\n' }
  ]);

  // 继续持有
  const holdText = report.continueHold.length > 0
    ? report.continueHold.map(h => `• ${h.symbol} ${h.name} ${(h.weight * 100).toFixed(1)}%`).join('\n')
    : '（无持仓）';
  
  content.push([
    { tag: 'text', text: '\n📌 继续持有 (' + report.continueHold.length + ' 只):\n', style: { bold: true } },
    { tag: 'text', text: holdText + '\n' }
  ]);

  // 止损出场
  const stopText = report.stopLoss.length > 0
    ? report.stopLoss.map(s => `• ${s.symbol} ${s.name} — ${s.reason}`).join('\n')
    : '（无触发）';
  
  content.push([
    { tag: 'text', text: '\n🔴 止损出场 (' + report.stopLoss.length + ' 只):\n', style: { bold: true } },
    { tag: 'text', text: stopText + '\n' }
  ]);

  // 仓位
  content.push([
    { tag: 'text', text: '\n' + '─'.repeat(40) + '\n' },
    { tag: 'text', text: `💰 仓位: ${(report.totalWeight * 100).toFixed(1)}% 持仓 / ${(report.cashWeight * 100).toFixed(1)}% 现金`, style: { bold: true } }
  ]);

  return content;
}

/**
 * 推送周报信号
 */
export async function pushWeeklyReport(report) {
  console.log('\n📱 推送飞书信号...');
  
  // 使用富文本格式
  const richContent = formatFeishuRichReport(report);
  await sendRichTextToFeishu(richContent);
}

/**
 * 推送紧急止损通知
 */
export async function pushStopLossAlert(stopLossInfo) {
  const message = `🚨 **止损警报**
${'─'.repeat(40)}
股票: ${stopLossInfo.symbol} ${stopLossInfo.name}
原因: ${stopLossInfo.reason}
当前价: $${stopLossInfo.currentPrice?.toFixed(2)}
亏损: ${stopLossInfo.drawdown?.toFixed(1)}%
预计出场价值: $${stopLossInfo.exitValue?.toFixed(0)}
${'─'.repeat(40)}
请确认是否执行止损`;

  if (FEISHU_WEBHOOK_URL) {
    await sendToFeishu(message);
  }
}

/**
 * 推送价值投资回归分析报告
 */
export async function pushValueReport(predictions) {
  if (!FEISHU_WEBHOOK_URL || !predictions || predictions.length === 0) return;

  // 按预测收益排序
  const sorted = [...predictions].sort((a, b) => b.predictedReturn - a.predictedReturn);

  const content = [[
    { tag: 'text', text: `📊 价值投资回归分析\n`, style: { bold: true } },
    { tag: 'text', text: `${new Date().toISOString().split('T')[0]}\n`, style: { bold: false } },
    { tag: 'text', text: '─'.repeat(40) + '\n' },
    { tag: 'text', text: '预测收益排序（20日）\n\n', style: { bold: true } }
  ]];

  for (const p of sorted) {
    const emoji = p.predictedReturn > 0 ? '📈' : '📉';
    content.push([{
      tag: 'text',
      text: `${emoji} ${p.symbol.padEnd(8)} ${(p.predictedReturn * 100 >= 0 ? '+' : '')}${(p.predictedReturn * 100).toFixed(2)}%  ${p.name}\n`
    }]);
  }

  content.push([
    { tag: 'text', text: '\n⚠️ 仅供参考，市场有风险', style: { bold: false } }
  ]);

  await sendRichTextToFeishu(content);
}

/**
 * 生成飞书可识别的交易卡片
 */
export function generateTradeCard(trades) {
  const lines = ['📈 **交易执行单**', '─'.repeat(40)];
  
  if (trades.buy && trades.buy.length > 0) {
    lines.push('\n🟢 买入:');
    for (const t of trades.buy) {
      lines.push(`  ${t.symbol} ${t.name}`);
      lines.push(`  数量: ${t.shares}股 @ $${t.price.toFixed(2)}`);
      lines.push(`  金额: $${(t.shares * t.price).toFixed(0)}`);
    }
  }
  
  if (trades.sell && trades.sell.length > 0) {
    lines.push('\n🔴 卖出:');
    for (const t of trades.sell) {
      lines.push(`  ${t.symbol}`);
      lines.push(`  数量: ${t.shares}股 @ $${t.price.toFixed(2)}`);
      lines.push(`  金额: $${(t.shares * t.price).toFixed(0)}`);
    }
  }
  
  return lines.join('\n');
}

export default {
  sendToFeishu,
  sendRichTextToFeishu,
  pushWeeklyReport,
  pushStopLossAlert,
  formatFeishuRichReport,
  generateTradeCard
};
