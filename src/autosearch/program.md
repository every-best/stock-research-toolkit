# AutoSearch 美股个股交易系统 - 研究指南

## 项目概述

基于 Karpathy AutoSearch 思想构建的**美股个股趋势跟踪系统**。每周运行一次，自动筛选候选股、生成信号、计算仓位、监控止损。

## 核心策略

### 四层过滤架构

```
┌─────────────────────────────────────────────────────────┐
│  第一层：候选股票池（基本面过滤）                           │
│  Technology / Healthcare / Nuclear / Defense           │
│  市值>50亿 | 成交量>50万 | Beta<2.5                      │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  第二层：价格信号（趋势 + 动量 + RSI）                     │
│  MA150多头 | 90天动量>5% | RSI 在50-75区间                │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  第三层：仓位分配（波动率分散）                            │
│  波动率越高 → 仓位越小 | 单股上限8%                       │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  第四层：止损监控（每日检查）                              │
│  固定止损-8% | 移动止损-10% | 时间止损45天                │
└─────────────────────────────────────────────────────────┘
```

## 重点行业

| 行业 | 代表股票 |
|------|----------|
| Technology | NVDA, MSFT, AAPL, GOOGL, META, AMD |
| Healthcare | LLY, UNH, JNJ, ABBV, MRK, PFE |
| Defense | BA, RTX, LMT, NOC, GD, HON |
| Nuclear/Energy | CCJ, DNN, LEU, NNE, OKLO, VST |

## 快速启动

```bash
# 快速研究（使用硬编码候选池，无需API）
node src/autosearch/autosearch.js run

# 完整研究（FMP API筛选，需要API Key）
node src/autosearch/autosearch.js full

# 生成持仓报告
node src/autosearch/autosearch.js report

# 止损检查
node src/autosearch/autosearch.js stopcheck --execute
```

## 文件结构

```
src/autosearch/
├── autosearch.js        # 主入口
├── universe.js          # 候选股票池
├── strategy_stock.js    # 价格信号
├── position_sizer.js    # 仓位分配
├── stop_loss.js         # 止损监控
├── data_fetcher.js      # 数据获取
├── openclaw_hooks.js    # 飞书推送
├── research_loop.js     # 研究主循环
├── utils.js             # 工具函数
└── program.md           # 本文件
```

## 研究流程

### 1. 候选池构建 (universe.js)

**快速池**：硬编码约35只行业龙头，无API调用

**完整池**：调用 FMP API 筛选 SP500
- 市值 > 50亿美元
- 日均成交量 > 50万股
- Beta < 2.5
- 排除 ETF
- 目标行业过滤

### 2. 信号生成 (strategy_stock.js)

**买入条件**（三者同时满足）：
- 价格 > MA150（趋势向上）
- 90天动量 > 5%（动量为正）
- RSI 在 50-75 区间（健康上涨）

**卖出条件**：
- 价格 < MA150
- RSI > 75（超买）

### 3. 仓位分配 (position_sizer.js)

按波动率倒数分配：
- 波动率 20% → 理论仓位 5%
- 波动率 40% → 理论仓位 2.5%
- 单股仓位上限 8%

### 4. 止损规则 (stop_loss.js)

| 类型 | 阈值 | 说明 |
|------|------|------|
| 固定止损 | -8% | 从买入价回撤8% |
| 移动止损 | -10% | 从峰值回撤10% |
| 时间止损 | 45天 | 超45天强制Review |

## 调参指南

修改 `src/autosearch/strategy_stock.js` 中的 CONFIG：

```javascript
export const CONFIG = {
  momentumWindow: 90,   // 动量窗口（天）
  maFilter: 150,        // 均线周期（天）
  rsiPeriod: 14,        // RSI周期
  rsiLow: 50,          // RSI买入区间下限
  rsiHigh: 75,          // RSI区间上限
  stopLoss: 0.08,       // 止损线（8%）
  maxPosition: 0.08,   // 单股最大仓位（8%）
  minMomentum: 0.05,   // 最小动量阈值
};
```

## 实验方向

### 当前实验（参考 program.md）

1. **参数空间搜索**：MA窗口 100-200，RSI区间，动量窗口 60-120
2. **止损优化**：测试 6%/10%/12% 不同止损线
3. **仓位优化**：测试 5%/8%/10% 不同上限
4. **行业轮动**：不同市场环境下行业配置

### 建议实验

- [ ] 加入财报日回避（财报前后3天不开新仓）
- [ ] 加入市场宽度过滤器（QQQ市场伴侣）
- [ ] 测试核领域个股的特殊参数
- [ ] A股版本：改用A股数据源（东方财富/akshare）

## Cron 自动化

```bash
# 每周一早上 7:30 运行研究
30 7 * * 1 cd /path/to/stock-research-toolkit && node src/autosearch/autosearch.js run --push

# 每天早上 7:30 检查止损
30 7 * * 2-5 cd /path/to/stock-research-toolkit && node src/autosearch/autosearch.js stopcheck --push
```

## 数据来源

- **价格数据**：Twelve Data API（现有配置）
- **基本面数据**：Financial Modeling Prep API（免费注册）
- **实时价格**：Twelve Data

## 注意事项

1. **这是一套趋势跟踪系统**，目标是捕捉中长期趋势，不适合短线
2. **会错过很多机会**，趋势系统都是这样，要有心理准备
3. **止损会出错**，有时候刚止损就反弹，但长期来看止损保护更重要
4. **仓位不要太重**，单股不超过8%，总持仓不超过50%

## 修改日志

- 2026-03-29：初始构建，完整四层架构
