/**
 * stock_profiles.js - 美股公司分析数据
 * 
 * 包含TOP股票的简介、利好、利空信息
 */

export const STOCK_PROFILES = {
  'APP': {
    name: 'AppLovin',
    sector: 'AI/AdTech',
    summary: '移动广告技术平台，核心产品AXON广告引擎，AI驱动用户获取',
    bullCase: [
      'AI广告技术领先，增长迅猛',
      '现金流强劲',
      '电商广告市场扩张'
    ],
    bearCase: [
      '苹果ATT隐私政策影响',
      '广告行业周期性',
      '估值极高（从低点涨了10倍+）'
    ]
  },
  'PANW': {
    name: 'Palo Alto Networks',
    sector: 'AI/Security',
    summary: '网络安全龙头，核心产品防火墙，云安全，AI安全',
    bullCase: [
      'AI安全需求爆发',
      '行业龙头，护城河深',
      '订阅模式稳定'
    ],
    bearCase: [
      '估值偏贵',
      '竞争激烈（CrowdStrike等）',
      '技术变化快'
    ]
  },
  'PLTR': {
    name: 'Palantir',
    sector: 'AI/Defense',
    summary: '数据分析/AI平台，核心产品Gotham（政府）、Foundry（企业），客户包括美军、CIA，保时捷、奔驰',
    bullCase: [
      '政府合同粘性极高，续约率超90%',
      'AI平台能力领先',
      '盈利稳定，现金流为正',
      'Foundry企业业务快速增长'
    ],
    bearCase: [
      '政府收入占比50%+，依赖过高',
      '民用商业化困难',
      '估值仍偏贵（PE 50-60倍）',
      '创始人Peter Thiel离开风险'
    ]
  },
  'META': {
    name: 'Meta',
    sector: 'AI/AdTech',
    summary: '社交广告巨头，核心产品Facebook、Instagram、AI大模型',
    bullCase: [
      'AI赋能广告精准度',
      '短视频Reels增长',
      '成本控制改善'
    ],
    bearCase: [
      '监管压力（欧盟）',
      'TikTok竞争',
      '广告主预算波动'
    ]
  },
  'NFLX': {
    name: 'Netflix',
    sector: 'Internet',
    summary: '流媒体订阅，核心产品Netflix影视内容',
    bullCase: [
      '付费订阅模式',
      '广告套餐增长',
      '内容质量提升'
    ],
    bearCase: [
      '竞争加剧（Disney+、HBO等）',
      '内容成本高',
      '用户增速放缓'
    ]
  },
  'MRVL': {
    name: 'Marvell',
    sector: 'Chips',
    summary: '半导体设计（无晶圆厂），核心产品AI芯片、数据中心芯片、5G芯片，主要客户谷歌、微软、亚马逊、Meta',
    bullCase: [
      'AI定制芯片需求爆发，大厂定制ASIC设计龙头',
      '谷歌深度合作，产能扩张（5nm、3nm）',
      '估值相对NVDA便宜'
    ],
    bearCase: [
      '客户集中风险（前5大客户占收入60%+）',
      '竞争激烈（英伟达GPU仍是主流）',
      '行业周期性强',
      '主要代工在台湾（地缘政治风险）',
      '中国业务受限（实体清单）'
    ]
  },
  'AVGO': {
    name: 'Broadcom',
    sector: 'Chips',
    summary: '半导体+企业软件，核心产品AI芯片、VMware',
    bullCase: [
      'AI网络芯片需求强',
      'VMware整合效应',
      '现金流充沛'
    ],
    bearCase: [
      '监管审查（收购VMware）',
      'AI芯片竞争加剧',
      '估值偏贵'
    ]
  },
  'CRWD': {
    name: 'CrowdStrike',
    sector: 'AI/Security',
    summary: '云安全龙头，核心产品Falcon安全平台',
    bullCase: [
      '云安全龙头',
      '订阅模式稳定',
      'AI安全新品'
    ],
    bearCase: [
      '去年宕机事件影响声誉',
      '竞争激烈（Palo Alto）',
      '估值偏贵'
    ]
  },
  'FTNT': {
    name: 'Fortinet',
    sector: 'AI/Security',
    summary: '网络安全，核心产品防火墙，安全SD-WAN',
    bullCase: [
      '产品整合好',
      '中小企业市场强',
      'AI安全整合'
    ],
    bearCase: [
      '大企业份额被PANW蚕食',
      '增长放缓',
      '估值合理但无惊喜'
    ]
  },
  'TSM': {
    name: 'Taiwan Semiconductor',
    sector: 'Chips',
    summary: '芯片代工，核心客户苹果、英伟达、AMD',
    bullCase: [
      '全球最先进的芯片制程',
      'AI芯片需求爆发',
      '定价能力强'
    ],
    bearCase: [
      '地缘政治风险（台湾）',
      '行业周期性',
      '估值已反映乐观预期'
    ]
  },
  'NVDA': {
    name: 'NVIDIA',
    sector: 'Chips',
    summary: 'GPU龙头，AI芯片领导者，核心产品A100/H100/Blackwell GPU',
    bullCase: [
      'AI芯片垄断优势',
      '数据中心收入爆发',
      '游戏+汽车+AI多轮驱动'
    ],
    bearCase: [
      '估值极其昂贵',
      '中国出口限制影响',
      '客户自研芯片风险'
    ]
  },
  'GOOGL': {
    name: 'Google',
    sector: 'AI/AdTech',
    summary: '搜索广告+云服务+AI，核心产品Google搜索、YouTube、Google Cloud',
    bullCase: [
      'AI搜索货币化加速',
      '云业务增长提速',
      'Waymo自动驾驶'
    ],
    bearCase: [
      '搜索份额被侵蚀',
      'AI竞争加剧（ChatGPT）',
      '监管压力'
    ]
  },
  'MSFT': {
    name: 'Microsoft',
    sector: 'AI/Enterprise',
    summary: '软件+云+AI，核心产品Azure、Office 365、Copilot',
    bullCase: [
      'Azure AI增长迅猛',
      'Office 365 Copilot货币化',
      '游戏业务复苏'
    ],
    bearCase: [
      '估值偏贵',
      'AI投入巨大',
      '竞争加剧'
    ]
  },
  'AMZN': {
    name: 'Amazon',
    sector: 'Internet',
    summary: '电商+云服务+AI，核心产品AWS、Prime、零售',
    bullCase: [
      'AWS AI需求爆发',
      '电商利润率改善',
      'AI助手Alexa增长'
    ],
    bearCase: [
      '电商竞争加剧',
      'AWS增速放缓',
      '监管压力'
    ]
  },
  'HUBS': {
    name: 'HubSpot',
    sector: 'AI/Enterprise',
    summary: 'CRM/营销软件，AI驱动的Inbound Marketing平台',
    bullCase: [
      '中小企业CRM龙头',
      'AI产品创新',
      '国际市场扩张'
    ],
    bearCase: [
      '估值偏贵',
      '与大厂竞争',
      '经济衰退影响SMB'
    ]
  },
  'TEAM': {
    name: 'Atlassian',
    sector: 'AI/Enterprise',
    summary: '企业协作软件，核心产品Jira、Confluence',
    bullCase: [
      '企业协作需求稳定',
      'AI功能整合',
      '国际市场扩张'
    ],
    bearCase: [
      '大厂竞争（Microsoft Teams）',
      '增长放缓',
      '估值合理'
    ]
  },
  'TWLO': {
    name: 'Twilio',
    sector: 'AI/AdTech',
    summary: '云通讯平台，CPaaS（通信即服务）',
    bullCase: [
      'AI客服需求增长',
      '客户基础庞大',
      'AI营销整合'
    ],
    bearCase: [
      '竞争加剧（Vonage等）',
      '宏观经济影响',
      '客户流失'
    ]
  },
  'TTD': {
    name: 'The Trade Desk',
    sector: 'AI/AdTech',
    summary: '程序化广告平台，AI驱动的广告购买',
    bullCase: [
      'CTV电视广告增长',
      'AI定位技术领先',
      '数据隐私优势'
    ],
    bearCase: [
      'Apple ATT影响',
      '大厂自建广告平台',
      '宏观经济压力'
    ]
  },
  'SNOW': {
    name: 'Snowflake',
    sector: 'AI/Data',
    summary: '云数据仓库，AI/ML数据平台',
    bullCase: [
      '数据是企业核心资产',
      'AI/ML需求爆发',
      '全球扩张'
    ],
    bearCase: [
      '竞争加剧（Databricks）',
      '亏损扩大',
      '估值极贵'
    ]
  },
  'BBAI': {
    name: 'BigBear.ai',
    sector: 'AI/Defense',
    summary: 'AI决策智能，核心产品Curiosity AI、尊户分析，服务国防、情报、商业客户',
    bullCase: [
      '国防AI需求增长',
      'AI决策市场扩张',
      '小市值高弹性'
    ],
    bearCase: [
      '规模小，竞争力弱',
      '收入不稳定',
      '可能被大厂收购或淘汰'
    ]
  }
};

/**
 * 获取股票分析
 */
export function getStockProfile(symbol) {
  return STOCK_PROFILES[symbol] || null;
}

/**
 * 生成深度分析Markdown
 */
export function generateProfileMarkdown(results, topN = 10) {
  let md = '\n---\n\n# 📊 TOP ' + topN + ' 深度分析\n\n---\n\n';
  
  for (let i = 0; i < Math.min(topN, results.length); i++) {
    const r = results[i];
    const profile = getStockProfile(r.symbol);
    
    md += `## ${i+1}. ${r.symbol} (${r.name}) - Sharpe ${(r.sharpe || 0).toFixed(2)}\n\n`;
    
    if (profile) {
      md += `**公司简介：** ${profile.summary}\n\n`;
      
      md += '**利好因素：**\n';
      profile.bullCase.forEach(b => md += `- ${b}\n`);
      md += '\n';
      
      md += '**利空因素：**\n';
      profile.bearCase.forEach(b => md += `- ${b}\n`);
      md += '\n';
    } else {
      md += `**简介：** ${r.sector}\n\n`;
      md += `**策略表现：** Sharpe ${(r.sharpe || 0).toFixed(2)}，年化 ${((r.annualReturn || 0) * 100).toFixed(1)}%，最大回撤 ${((r.maxDrawdown || 0) * 100).toFixed(1)}%\n\n`;
    }
  }
  
  return md;
}
