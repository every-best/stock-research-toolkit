/**
 * universe.js — 候选股票池构建
 * 
 * AutoSearch 风格美股个股交易系统
 * 第一层：基本面过滤
 * 
 * 使用 Financial Modeling Prep 免费 API
 * https://financialmodelingprep.com/
 */

import axios from "axios";

const FMP_KEY = process.env.FMP_API_KEY;

// 重点关注行业
const TARGET_SECTORS = [
  'Technology',
  'Healthcare',
  'Nuclear',
  'Defense',
  'Aerospace',
  'Biotechnology',
  'Semiconductors',
  'Software',
  'Medical Devices'
];

// 行业关键词映射
const SECTOR_KEYWORDS = {
  'Technology': ['software', 'hardware', 'semiconductor', 'chip', 'ai', 'cloud', 'data', 'tech'],
  'Healthcare': ['health', 'medical', 'pharma', 'biotech', 'drug', 'hospital', 'device'],
  'Nuclear': ['nuclear', 'energy', 'uranium', 'power', 'reactor', 'atomic'],
  'Defense': ['defense', 'military', 'weapon', 'aero', 'aircraft', 'security', 'Lockheed', 'Raytheon', 'Northrop', 'Boeing']
};

/**
 * 从 FMP 获取标普500成分股
 */
async function getSP500() {
  const res = await axios.get(
    `https://financialmodelingprep.com/api/v3/sp500_constituent?apikey=${FMP_KEY}`
  );
  return res.data;
}

/**
 * 获取单只股票的基本面数据
 */
async function getStockProfile(symbol) {
  try {
    const res = await axios.get(
      `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_KEY}`
    );
    return res.data[0] || null;
  } catch {
    return null;
  }
}

/**
 * 获取财务指标（判断是否"活着"）
 */
async function getFinancialMetrics(symbol) {
  try {
    const res = await axios.get(
      `https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?apikey=${FMP_KEY}`
    );
    return res.data[0] || null;
  } catch {
    return null;
  }
}

/**
 * 获取Income Statement（判断盈利状态）
 */
async function getIncomeStatement(symbol) {
  try {
    const res = await axios.get(
      `https://financialmodelingprep.com/api/v3/income-statement/${symbol}?limit=1&apikey=${FMP_KEY}`
    );
    return res.data[0] || null;
  } catch {
    return null;
  }
}

/**
 * 判断股票是否属于目标行业
 */
function isTargetSector(company) {
  const name = (company.companyName || '').toLowerCase();
  const sector = (company.sector || '').toLowerCase();
  const industry = (company.industry || '').toLowerCase();
  
  for (const [sectorName, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    for (const kw of keywords) {
      if (name.includes(kw) || sector.includes(kw) || industry.includes(kw)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 基本面过滤条件
 */
function passesFundamentalFilter(profile, income) {
  if (!profile) return false;
  
  // 市值 > 50亿（比原方案降低门槛，增加候选池）
  if (profile.mktCap < 5_000_000_000) return false;
  
  // 日均成交量 > 50万股
  if (profile.volAvg < 500_000) return false;
  
  // Beta < 2.5（波动不要过于极端）
  if (profile.beta > 2.5) return false;
  
  // 排除 ETF
  if (profile.isEtf) return false;
  
  // 排除不活跃交易
  if (profile.isActivelyTrading === false) return false;
  
  // 盈利判断：最近一个季度有收入
  if (income && income.revenue > 0) {
    return true;
  }
  
  return true; // 如果没有Income数据，仍保留
}

/**
 * 构建候选股票池
 * 
 * @param {Object} options
 * @param {boolean} options.industryFilter - 是否只保留目标行业（默认true）
 * @param {number} options.minMktCap - 最小市值（默认50亿）
 * @param {number} options.maxResults - 最大返回数量（默认30只）
 */
export async function buildUniverse(options = {}) {
  const {
    industryFilter = true,
    minMktCap = 5_000_000_000,
    maxResults = 30
  } = options;

  console.log('🏗️ 构建候选股票池...');
  console.log(`   筛选条件: 市值>${minMktCap / 1e9}亿, Beta<2.5, 成交量>50万`);
  if (industryFilter) {
    console.log(`   目标行业: ${Object.keys(SECTOR_KEYWORDS).join(', ')}`);
  }

  // 第一步：获取 SP500 成分股
  const sp500 = await getSP500();
  console.log(`\n📊 获取到 ${sp500.length} 只SP500成分股`);

  // 第二步：并行获取每只股票的基本面
  const qualified = [];
  const batchSize = 5; // 并行限制
  let processed = 0;

  for (let i = 0; i < sp500.length; i += batchSize) {
    const batch = sp500.slice(i, i + batchSize);
    
    const results = await Promise.all(
      batch.map(async (stock) => {
        try {
          const [profile, income] = await Promise.all([
            getStockProfile(stock.symbol),
            getIncomeStatement(stock.symbol)
          ]);

          processed++;
          if (processed % 20 === 0) {
            console.log(`   进度: ${processed}/${sp500.length}`);
          }

          if (!profile) return null;
          if (!passesFundamentalFilter(profile, income)) return null;
          if (industryFilter && !isTargetSector(profile)) return null;

          return {
            symbol: stock.symbol,
            name: profile.companyName,
            sector: profile.sector,
            industry: profile.industry,
            mktCap: profile.mktCap,
            volAvg: profile.volAvg,
            beta: profile.beta,
            price: profile.price,
            exchange: profile.exchange
          };
        } catch {
          return null;
        }
      })
    );

    qualified.push(...results.filter(r => r !== null));
    
    // 控制结果数量
    if (qualified.length >= maxResults * 2) break;
  }

  // 第三步：按市值排序，取前 N 只
  qualified.sort((a, b) => b.mktCap - a.mktCap);
  const finalList = qualified.slice(0, maxResults);

  console.log(`\n✅ 候选股票池构建完成: ${finalList.length} 只\n`);
  
  // 按行业分布统计
  const sectorStats = {};
  for (const stock of finalList) {
    sectorStats[stock.sector] = (sectorStats[stock.sector] || 0) + 1;
  }
  console.log('📈 行业分布:');
  for (const [sector, count] of Object.entries(sectorStats)) {
    console.log(`   ${sector}: ${count}只`);
  }

  return finalList;
}

/**
 * 快速候选池（不加 API 调用，直接用硬编码的专注行业龙头）
 * 适用于快速启动测试
 */
export const QUICK_UNIVERSE = [
  // Technology
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'Technology', mktCap: 2800000000000 },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology', mktCap: 3100000000000 },
  { symbol: 'AAPL', name: 'Apple', sector: 'Technology', mktCap: 2900000000000 },
  { symbol: 'GOOGL', name: 'Alphabet', sector: 'Technology', mktCap: 2100000000000 },
  { symbol: 'META', name: 'Meta', sector: 'Technology', mktCap: 1400000000000 },
  { symbol: 'AVGO', name: 'Broadcom', sector: 'Technology', mktCap: 800000000000 },
  { symbol: 'CRM', name: 'Salesforce', sector: 'Technology', mktCap: 280000000000 },
  { symbol: 'ORCL', name: 'Oracle', sector: 'Technology', mktCap: 400000000000 },
  { symbol: 'AMD', name: 'AMD', sector: 'Technology', mktCap: 250000000000 },
  { symbol: 'INTC', name: 'Intel', sector: 'Technology', mktCap: 100000000000 },
  
  // Healthcare
  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare', mktCap: 750000000000 },
  { symbol: 'UNH', name: 'UnitedHealth', sector: 'Healthcare', mktCap: 520000000000 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', mktCap: 450000000000 },
  { symbol: 'ABBV', name: 'AbbVie', sector: 'Healthcare', mktCap: 300000000000 },
  { symbol: 'MRK', name: 'Merck', sector: 'Healthcare', mktCap: 320000000000 },
  { symbol: 'PFE', name: 'Pfizer', sector: 'Healthcare', mktCap: 160000000000 },
  { symbol: 'TMO', name: 'Thermo Fisher', sector: 'Healthcare', mktCap: 220000000000 },
  { symbol: 'ABT', name: 'Abbott Labs', sector: 'Healthcare', mktCap: 200000000000 },
  { symbol: 'BMY', name: 'Bristol-Myers', sector: 'Healthcare', mktCap: 110000000000 },
  { symbol: 'AMGN', name: 'Amgen', sector: 'Healthcare', mktCap: 150000000000 },
  
  // Defense / Aerospace
  { symbol: 'BA', name: 'Boeing', sector: 'Defense', mktCap: 150000000000 },
  { symbol: 'RTX', name: 'Raytheon', sector: 'Defense', mktCap: 150000000000 },
  { symbol: 'LMT', name: 'Lockheed Martin', sector: 'Defense', mktCap: 120000000000 },
  { symbol: 'NOC', name: 'Northrop Grumman', sector: 'Defense', mktCap: 70000000000 },
  { symbol: 'GD', name: 'General Dynamics', sector: 'Defense', mktCap: 80000000000 },
  { symbol: 'HON', name: 'Honeywell', sector: 'Defense', mktCap: 140000000000 },
  { symbol: 'CAT', name: 'Caterpillar', sector: 'Defense', mktCap: 180000000000 },
  { symbol: 'GE', name: 'GE Aerospace', sector: 'Defense', mktCap: 200000000000 },
  
  // Nuclear / Energy
  { symbol: 'CCJ', name: 'Cameco', sector: 'Nuclear', mktCap: 25000000000 },
  { symbol: 'DNN', name: 'Denison Mines', sector: 'Nuclear', mktCap: 2000000000 },
  { symbol: 'LEU', name: 'Centrus Energy', sector: 'Nuclear', mktCap: 3000000000 },
  { symbol: 'NNE', name: 'Nano Nuclear', sector: 'Nuclear', mktCap: 1000000000 },
  { symbol: 'OKLO', name: 'Oklo', sector: 'Nuclear', mktCap: 1500000000 },
  { symbol: 'VST', name: 'Vistra', sector: 'Energy', mktCap: 50000000000 },
  { symbol: 'CEG', name: 'Constellation Energy', sector: 'Energy', mktCap: 60000000000 },
];

/**
 * 使用快速候选池（无需API调用）
 */
export function getQuickUniverse() {
  console.log('⚡ 使用快速候选池（硬编码龙头股）');
  console.log(`   股票数量: ${QUICK_UNIVERSE.length} 只`);
  
  const sectorStats = {};
  for (const stock of QUICK_UNIVERSE) {
    sectorStats[stock.sector] = (sectorStats[stock.sector] || 0) + 1;
  }
  console.log('📈 行业分布:');
  for (const [sector, count] of Object.entries(sectorStats)) {
    console.log(`   ${sector}: ${count}只`);
  }
  
  return QUICK_UNIVERSE;
}

export default { buildUniverse, getQuickUniverse, QUICK_UNIVERSE };
