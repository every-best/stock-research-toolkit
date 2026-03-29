/**
 * 数据存储模块
 * 支持：JSON、CSV格式存储
 */

const fs = require('fs');
const path = require('path');

class DataSaver {
  constructor(dataDir = './data') {
    this.dataDir = path.resolve(dataDir);
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 保存为JSON文件
   * @param {string} filename - 文件名（不含扩展名）
   * @param {Object|Array} data - 数据
   */
  saveJSON(filename, data) {
    const filepath = path.join(this.dataDir, `${filename}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ 已保存: ${filepath}`);
    return filepath;
  }

  /**
   * 读取JSON文件
   * @param {string} filename - 文件名
   * @returns {Object|Array} 数据
   */
  readJSON(filename) {
    const filepath = path.join(this.dataDir, `${filename}.json`);
    if (!fs.existsSync(filepath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }

  /**
   * 保存数组数据为CSV
   * @param {string} filename - 文件名（不含扩展名）
   * @param {Array<Object>} data - 数据数组
   */
  saveCSV(filename, data) {
    if (!data || data.length === 0) return;

    const filepath = path.join(this.dataDir, `${filename}.csv`);
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(','))
    ].join('\n');

    fs.writeFileSync(filepath, '\ufeff' + csvContent, 'utf8'); // BOM for Excel
    console.log(`✅ 已保存: ${filepath}`);
    return filepath;
  }

  /**
   * 追加数据到CSV
   * @param {string} filename - 文件名
   * @param {Object} newRow - 新行数据
   */
  appendCSV(filename, newRow) {
    const filepath = path.join(this.dataDir, `${filename}.csv`);
    const headers = Object.values(newRow).map((v, i) => Object.keys(newRow)[i]);

    if (!fs.existsSync(filepath)) {
      // 新建文件
      return this.saveCSV(filename, [newRow]);
    }

    // 追加行
    const newLine = headers.map((h, i) => {
      const val = newRow[headers[i]];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');

    fs.appendFileSync(filepath, '\n' + newLine, 'utf8');
    console.log(`✅ 已追加: ${filepath}`);
  }

  /**
   * 获取文件夹中的所有文件
   * @returns {string[]} 文件列表
   */
  listFiles() {
    return fs.readdirSync(this.dataDir);
  }

  /**
   * 删除文件
   * @param {string} filename - 文件名
   */
  delete(filename) {
    const filepath = path.join(this.dataDir, `${filename}.json`);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`🗑️ 已删除: ${filepath}`);
    }
  }
}

module.exports = DataSaver;
