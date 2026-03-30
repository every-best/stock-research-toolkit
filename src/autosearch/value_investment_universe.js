/**
 * value_investment_universe.js — 长线价值投资候选池
 * 
 * 港股（科技/军工/医疗/蓝筹）+ 美股价值股
 */

/**
 * value_investment_universe.js — 长线价值投资候选池
 * 
 * 港股（科技/军工/医疗/蓝筹）+ 美股价值股
 * 包含：AI/LLM、内容娱乐、智能驾驶、机器人、医疗等
 */

export const HK_STOCKS = [
  // 科技 - AI/LLM 大模型
  { symbol: '0700.HK', name: '腾讯控股', sector: 'Technology', mktCap: 3500000000000 },
  { symbol: '9988.HK', name: '阿里巴巴', sector: 'Technology', mktCap: 1800000000000 },
  { symbol: '3690.HK', name: '美团', sector: 'Technology', mktCap: 800000000000 },
  { symbol: '9618.HK', name: '京东集团', sector: 'Technology', mktCap: 400000000000 },
  { symbol: '09626.HK', name: '哔哩哔哩', sector: 'Technology', mktCap: 150000000000 },
  { symbol: '9899.HK', name: '网易云音乐', sector: 'Technology', mktCap: 50000000000 },
  { symbol: '1024.HK', name: '快手', sector: 'Technology', mktCap: 250000000000 },
  { symbol: '2382.HK', name: '舜宇光学', sector: 'Technology', mktCap: 120000000000 },
  { symbol: '1810.HK', name: '小米集团', sector: 'Technology', mktCap: 700000000000 },
  
  // AI / 大模型
  { symbol: '02228.HK', name: '晶泰控股', sector: 'AI', mktCap: 50000000000 },
  { symbol: '03696.HK', name: '英矽智能', sector: 'AI', mktCap: 20000000000 },
  { symbol: '00100.HK', name: 'MiniMax', sector: 'AI', mktCap: 30000000000 },
  { symbol: '02513.HK', name: '智谱', sector: 'AI', mktCap: 30000000000 },
  { symbol: '02556.HK', name: '迈富时', sector: 'AI', mktCap: 10000000000 },
  { symbol: '01384.HK', name: '滴普科技', sector: 'AI', mktCap: 5000000000 },
  
  // 内容创作与娱乐
  { symbol: '01698.HK', name: '腾讯音乐', sector: 'Content', mktCap: 100000000000 },
  { symbol: '00772.HK', name: '阅文集团', sector: 'Content', mktCap: 40000000000 },
  { symbol: '01060.HK', name: '大麦娱乐', sector: 'Content', mktCap: 20000000000 },
  { symbol: '00136.HK', name: '中国儒意', sector: 'Content', mktCap: 30000000000 },
  { symbol: '09911.HK', name: '赤子城科技', sector: 'Content', mktCap: 10000000000 },
  { symbol: '01357.HK', name: '美图公司', sector: 'Content', mktCap: 30000000000 },
  { symbol: '03738.HK', name: '阜博集团', sector: 'Content', mktCap: 5000000000 },
  
  // AI 营销/电商
  { symbol: '01860.HK', name: '汇量科技', sector: 'AI', mktCap: 20000000000 },
  
  // AI 游戏
  { symbol: '02400.HK', name: '心动公司', sector: 'AI', mktCap: 20000000000 },
  
  // AI 视觉
  { symbol: '00020.HK', name: '商汤', sector: 'AI', mktCap: 60000000000 },
  
  // 智能驾驶/机器人
  { symbol: '09880.HK', name: '优必选', sector: 'Robotics', mktCap: 30000000000 },
  { symbol: '02432.HK', name: '越疆', sector: 'Robotics', mktCap: 10000000000 },
  { symbol: '09660.HK', name: '地平线机器人', sector: 'Robotics', mktCap: 50000000000 },
  { symbol: '09868.HK', name: '小鹏汽车', sector: 'Robotics', mktCap: 80000000000 },
  { symbol: '02015.HK', name: '理想汽车', sector: 'Robotics', mktCap: 150000000000 },
  { symbol: '02252.HK', name: '微创机器人', sector: 'Robotics', mktCap: 20000000000 },
  { symbol: '02590.HK', name: '极智嘉', sector: 'Robotics', mktCap: 10000000000 },
  { symbol: '06651.HK', name: '五一视界', sector: 'Robotics', mktCap: 10000000000 },
  
  // AI + 解决方案
  { symbol: '03896.HK', name: '金山云', sector: 'AI', mktCap: 40000000000 },
  
  // AI + SaaS
  { symbol: '00268.HK', name: '金蝶国际', sector: 'AI', mktCap: 30000000000 },
  { symbol: '03888.HK', name: '金山软件', sector: 'AI', mktCap: 60000000000 },
  { symbol: '06682.HK', name: '范式智能', sector: 'AI', mktCap: 20000000000 },
  
  // 医疗/生物
  { symbol: '03320.HK', name: '华润医药', sector: 'Healthcare', mktCap: 180000000000 },
  { symbol: '6618.HK', name: '京东健康', sector: 'Healthcare', mktCap: 120000000000 },
  { symbol: '2340.HK', name: '海吉亚医疗', sector: 'Healthcare', mktCap: 80000000000 },
  { symbol: '1177.HK', name: '中国生物制药', sector: 'Healthcare', mktCap: 200000000000 },
  { symbol: '3759.HK', name: '康方生物', sector: 'Healthcare', mktCap: 60000000000 },
  { symbol: '00853.HK', name: '微创医疗', sector: 'Healthcare', mktCap: 60000000000 },
  { symbol: '00241.HK', name: '阿里健康', sector: 'Healthcare', mktCap: 80000000000 },
  { symbol: '01833.HK', name: '平安好医生', sector: 'Healthcare', mktCap: 30000000000 },
  { symbol: '02506.HK', name: '讯飞医疗科技', sector: 'Healthcare', mktCap: 20000000000 },
  
  // 军工/制造
  { symbol: '6969.HK', name: '微创医疗', sector: 'Defense', mktCap: 60000000000 },
  { symbol: '1919.HK', name: '中远海运', sector: 'Defense', mktCap: 120000000000 },
  { symbol: '0017.HK', name: '新世界发展', sector: 'Defense', mktCap: 80000000000 },
  
  // 金融/蓝筹
  { symbol: '0005.HK', name: '汇丰控股', sector: 'Finance', mktCap: 1500000000000 },
  { symbol: '0388.HK', name: '香港交易所', sector: 'Finance', mktCap: 380000000000 },
  { symbol: '1299.HK', name: '友邦保险', sector: 'Finance', mktCap: 800000000000 },
  { symbol: '0939.HK', name: '建设银行', sector: 'Finance', mktCap: 1600000000000 },
  { symbol: '3988.HK', name: '中国银行', sector: 'Finance', mktCap: 1800000000000 },
  { symbol: '3968.HK', name: '招商银行', sector: 'Finance', mktCap: 900000000000 },
  { symbol: '0002.HK', name: '中电控股', sector: 'Utilities', mktCap: 200000000000 },
  { symbol: '1038.HK', name: '长江基建', sector: 'Utilities', mktCap: 150000000000 },
  { symbol: '1036.HK', name: '电能实业', sector: 'Utilities', mktCap: 120000000000 },
];

export const US_VALUE_STOCKS = [
  // 科技价值股
  { symbol: 'ORCL', name: 'Oracle', sector: 'Technology', mktCap: 400000000000 },
  { symbol: 'INTC', name: 'Intel', sector: 'Technology', mktCap: 100000000000 },
  { symbol: 'AMD', name: 'AMD', sector: 'Technology', mktCap: 250000000000 },
  { symbol: 'CSCO', name: 'Cisco', sector: 'Technology', mktCap: 200000000000 },
  
  // AI + 广告
  { symbol: 'APP', name: 'AppLovin', sector: 'AI', mktCap: 100000000000 },
  { symbol: 'META', name: 'Meta', sector: 'AI', mktCap: 1400000000000 },
  { symbol: 'GOOGL', name: 'Google', sector: 'AI', mktCap: 2100000000000 },
  { symbol: 'TWLO', name: 'Twilio', sector: 'AI', mktCap: 15000000000 },
  { symbol: 'TTD', name: 'The Trade Desk', sector: 'AI', mktCap: 50000000000 },
  { symbol: 'APPS', name: 'Digital Turbine', sector: 'AI', mktCap: 5000000000 },
  { symbol: 'KVYO', name: 'Klaviyo', sector: 'AI', mktCap: 8000000000 },
  
  // AI + 大数据
  { symbol: 'SNOW', name: 'Snowflake', sector: 'AI', mktCap: 45000000000 },
  { symbol: 'MDB', name: 'MongoDB', sector: 'AI', mktCap: 30000000000 },
  { symbol: 'CFLT', name: 'Confluent', sector: 'AI', mktCap: 10000000000 },
  
  // AI + 安全
  { symbol: 'PANW', name: 'Palo Alto Networks', sector: 'AI', mktCap: 120000000000 },
  { symbol: 'CRWD', name: 'CrowdStrike', sector: 'AI', mktCap: 80000000000 },
  { symbol: 'FTNT', name: 'Fortinet', sector: 'AI', mktCap: 50000000000 },
  { symbol: 'DDOG', name: 'Datadog', sector: 'AI', mktCap: 45000000000 },
  { symbol: 'NET', name: 'Cloudflare', sector: 'AI', mktCap: 35000000000 },
  { symbol: 'RBRK', name: 'Rubrik', sector: 'AI', mktCap: 8000000000 },
  
  // AI + 企业服务
  { symbol: 'ZM', name: 'Zoom', sector: 'AI', mktCap: 25000000000 },
  { symbol: 'PATH', name: 'UiPath', sector: 'AI', mktCap: 30000000000 },
  { symbol: 'WDAY', name: 'Workday', sector: 'AI', mktCap: 70000000000 },
  { symbol: 'CRM', name: 'Salesforce', sector: 'AI', mktCap: 280000000000 },
  { symbol: 'MNDY', name: 'monday.com', sector: 'AI', mktCap: 15000000000 },
  { symbol: 'SAP', name: 'SAP', sector: 'AI', mktCap: 300000000000 },
  { symbol: 'AI', name: 'C3.ai', sector: 'AI', mktCap: 5000000000 },
  { symbol: 'HUBS', name: 'HubSpot', sector: 'AI', mktCap: 35000000000 },
  { symbol: 'GTLB', name: 'GitLab', sector: 'AI', mktCap: 8000000000 },
  { symbol: 'TEAM', name: 'Atlassian', sector: 'AI', mktCap: 50000000000 },
  
  // AI + 设计
  { symbol: 'ADBE', name: 'Adobe', sector: 'AI', mktCap: 200000000000 },
  
  // AI + 国防
  { symbol: 'PLTR', name: 'Palantir', sector: 'AI', mktCap: 80000000000 },
  { symbol: 'BBAI', name: 'BigBear.ai', sector: 'AI', mktCap: 2000000000 },
  
  // AI + 车队管理
  { symbol: 'IOT', name: 'Samsara', sector: 'AI', mktCap: 25000000000 },
  
  // AI + 搜索
  { symbol: 'ESTC', name: 'Elastic', sector: 'AI', mktCap: 15000000000 },
  
  // AI + 办公
  { symbol: 'FRSH', name: 'Freshworks', sector: 'AI', mktCap: 8000000000 },
  
  // AI + 教育
  { symbol: 'DUOL', name: 'Duolingo', sector: 'AI', mktCap: 15000000000 },
  
  // AI + 电商
  { symbol: 'SHOP', name: 'Shopify', sector: 'AI', mktCap: 150000000000 },
  { symbol: 'AMZN', name: 'Amazon', sector: 'AI', mktCap: 2500000000000 },
  
  // AI + 金融
  { symbol: 'INTU', name: 'Intuit', sector: 'AI', mktCap: 180000000000 },
  { symbol: 'INTA', name: 'Intapp', sector: 'AI', mktCap: 10000000000 },
  
  // AI + 数据工程
  { symbol: 'INOD', name: 'Innodata', sector: 'AI', mktCap: 3000000000 },
  
  // AI + 语音
  { symbol: 'SOUN', name: 'SoundHound AI', sector: 'AI', mktCap: 5000000000 },
  
  // AI + 医疗
  { symbol: 'TEM', name: 'Tempus AI', sector: 'AI', mktCap: 10000000000 },
  { symbol: 'DOCS', name: 'Doximity', sector: 'AI', mktCap: 5000000000 },
  
  // AI + 社交
  { symbol: 'RDDT', name: 'Reddit', sector: 'AI', mktCap: 30000000000 },
  { symbol: 'LIF', name: 'Life360', sector: 'AI', mktCap: 15000000000 },
  
  // AI + 网站
  { symbol: 'GDDY', name: 'GoDaddy', sector: 'AI', mktCap: 25000000000 },
  
  // AI + 游戏
  { symbol: 'U', name: 'Unity Software', sector: 'AI', mktCap: 25000000000 },
  
  // AI + 营销
  { symbol: 'ZETA', name: 'Zeta Global', sector: 'AI', mktCap: 5000000000 },
  
  // AI + 保险
  { symbol: 'LMND', name: 'Lemonade', sector: 'AI', mktCap: 5000000000 },
  
  // 医疗价值股
  { symbol: 'PFE', name: 'Pfizer', sector: 'Healthcare', mktCap: 160000000000 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', mktCap: 450000000000 },
  { symbol: 'UNH', name: 'UnitedHealth', sector: 'Healthcare', mktCap: 520000000000 },
  { symbol: 'MRK', name: 'Merck', sector: 'Healthcare', mktCap: 320000000000 },
  { symbol: 'BMY', name: 'Bristol-Myers', sector: 'Healthcare', mktCap: 110000000000 },
  { symbol: 'ABBV', name: 'AbbVie', sector: 'Healthcare', mktCap: 300000000000 },
  
  // 金融
  { symbol: 'JPM', name: 'JPMorgan', sector: 'Finance', mktCap: 550000000000 },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Finance', mktCap: 280000000000 },
  { symbol: 'WFC', name: 'Wells Fargo', sector: 'Finance', mktCap: 180000000000 },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance', mktCap: 150000000000 },
  
  // 国防军工
  { symbol: 'BA', name: 'Boeing', sector: 'Defense', mktCap: 150000000000 },
  { symbol: 'GD', name: 'General Dynamics', sector: 'Defense', mktCap: 80000000000 },
  { symbol: 'LMT', name: 'Lockheed Martin', sector: 'Defense', mktCap: 120000000000 },
  { symbol: 'RTX', name: 'Raytheon', sector: 'Defense', mktCap: 150000000000 },
  
  // 消费/蓝筹
  { symbol: 'KO', name: 'Coca-Cola', sector: 'Consumer', mktCap: 260000000000 },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer', mktCap: 350000000000 },
  { symbol: 'XOM', name: 'ExxonMobil', sector: 'Energy', mktCap: 450000000000 },
  { symbol: 'CVX', name: 'Chevron', sector: 'Energy', mktCap: 280000000000 },
];

/**
 * 获取完整候选池
 */
export function getValueUniverse() {
  return {
    hk: HK_STOCKS,
    us: US_VALUE_STOCKS,
    all: [...HK_STOCKS, ...US_VALUE_STOCKS]
  };
}

/**
 * 按行业筛选
 */
export function filterBySector(universe, sector) {
  return universe.filter(s => s.sector === sector);
}

export default { HK_STOCKS, US_VALUE_STOCKS, getValueUniverse, filterBySector };
