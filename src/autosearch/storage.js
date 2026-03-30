/**
 * storage.js — 数据持久化
 * 
 * AutoSearch 美股个股交易系统
 * 持仓记录和历史数据存储
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = './data/autosearch';

/**
 * 确保目录存在
 */
function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * 加载持仓记录
 */
export function loadHoldings() {
  ensureDir();
  const file = path.join(DATA_DIR, 'holdings.json');
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  return {};
}

/**
 * 保存持仓记录
 */
export function saveHoldings(holdings) {
  ensureDir();
  const file = path.join(DATA_DIR, 'holdings.json');
  fs.writeFileSync(file, JSON.stringify(holdings, null, 2));
}

/**
 * 加载历史记录
 */
export function loadHistory() {
  ensureDir();
  const file = path.join(DATA_DIR, 'history.json');
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  return { trades: [], signals: [] };
}

/**
 * 保存历史记录
 */
export function saveHistory(history) {
  ensureDir();
  const file = path.join(DATA_DIR, 'history.json');
  fs.writeFileSync(file, JSON.stringify(history, null, 2));
}

export default { loadHoldings, saveHoldings, loadHistory, saveHistory };
