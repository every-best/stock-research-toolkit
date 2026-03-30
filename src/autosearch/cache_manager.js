/**
 * cache_manager.js — 数据缓存
 * 
 * 避免每次运行都从 Twelve Data 获取数据
 * 缓存有效期：交易日当天内有效
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '../data/autosearch/cache');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * 获取缓存文件名
 */
function getCacheFile(symbol) {
  return path.join(CACHE_DIR, `${symbol}.json`);
}

/**
 * 检查缓存是否有效（当天）
 */
function isCacheValid(symbol) {
  const cacheFile = getCacheFile(symbol);
  if (!fs.existsSync(cacheFile)) return false;

  try {
    const stat = fs.statSync(cacheFile);
    const cacheDate = stat.mtime.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return cacheDate === today;
  } catch {
    return false;
  }
}

/**
 * 读取单只股票缓存
 */
export function readCache(symbol) {
  if (!isCacheValid(symbol)) return null;

  try {
    const data = fs.readFileSync(getCacheFile(symbol), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * 批量读取缓存
 */
export function readBatchCache(symbols) {
  const results = {};
  for (const sym of symbols) {
    const data = readCache(sym);
    if (data) results[sym] = data;
  }
  return results;
}

/**
 * 写入单只股票缓存
 */
export function writeCache(symbol, candles) {
  ensureCacheDir();
  try {
    fs.writeFileSync(getCacheFile(symbol), JSON.stringify(candles, null, 2));
  } catch (err) {
    console.error(`写入缓存失败 ${symbol}:`, err.message);
  }
}

/**
 * 批量写入缓存
 */
export function writeBatchCache(data) {
  for (const [symbol, candles] of Object.entries(data)) {
    writeCache(symbol, candles);
  }
}

/**
 * 获取缺失数据的股票列表
 */
export function getMissingSymbols(symbols) {
  return symbols.filter(sym => !isCacheValid(sym));
}

export default { readCache, readBatchCache, writeCache, writeBatchCache, getMissingSymbols };
