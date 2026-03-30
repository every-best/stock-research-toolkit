# AutoSearch 美股个股交易系统

基于价格信号的美股个股交易系统，每周自动研究 + 推送飞书报告。

## 架构

```
autosearch.js          # 主入口
research_loop.js       # 研究循环主逻辑
strategy_stock.js      # 交易信号生成（MA + RSI + 动量）
position_sizer.js      # 仓位分配（波动率倒数加权）
stop_loss.js           # 止损监控
data_fetcher.js        # 数据获取（Twelve Data）
cache_manager.js       # 数据缓存（当日有效）
storage.js             # 持仓和历史记录
universe.js            # 候选股票池
utils.js               # 工具函数
scheduler.js           # 定时任务
```

## 核心策略

**信号生成（每日收盘后检查）：**
- 价格 > 150日均线（趋势确认）
- 90日动量 > 5%（排除横盘）
- RSI 处于 50-75 区间（适中）
- 三者同时满足 → 买入信号

**仓位分配：**
- 波动率越高 → 仓位越小
- 单股上限 20%，最多同时持仓 8 只
- 目标总仓位 80%

**止损：**
- 固定止损：亏损 8% 出场
- 移动止损：从峰值回撤 10% 出场
- 时间止损：持有 45 天强制 review

## 使用方法

### 手动运行

```bash
cd C:\Users\A\stock-research-toolkit\src\autosearch
node autosearch.js run           # 运行研究循环
node autosearch.js run --value  # 研究循环 + 价值回归分析
node autosearch.js value        # 单独运行价值回归分析
node autosearch.js report       # 查看持仓报告
node autosearch.js stopcheck    # 止损检查
```

### 定时任务（Windows）

创建每日定时任务，每个工作日 20:00 自动运行：

```powershell
schtasks /create /tn "AutoSearch Daily" `
  /tr "C:\Users\A\stock-research-toolkit\src\autosearch\autosearch.bat" `
  /sc daily /st 20:00
```

或使用 Node 定时器：

```bash
node scheduler.js
```

## 数据源

- **Twelve Data**（免费层 8次/分钟，500次/天）
- 候选池 35 只股票（科技/医疗/国防/核能/能源）
- 每个 symbol 252 条日K线（约1年）

## 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| momentumWindow | 90 | 动量窗口（天）|
| maFilter | 150 | 均线周期（天）|
| rsiPeriod | 14 | RSI 周期 |
| minMomentum | 0.05 | 最小动量阈值 |
| maxPosition | 0.20 | 单股最大仓位 |
| minScore | 20 | 建仓最小评分 |
| maxPositions | 8 | 最大持仓数 |
| stopLoss | 0.08 | 固定止损线 |

## 费率限制说明

Twelve Data 免费层限制：
- 8 次 API 调用/分钟
- 500 次/天

35 只股票全量获取约需 4-5 分钟（每只间隔 7.5s）。

获取后数据自动缓存，**当天重复运行不再消耗配额**。

## 飞书推送

每次运行后自动输出飞书格式报告，包含：
- 🆕 新增买入信号
- 📌 继续持有
- 🔴 止损出场
- 💰 仓位概览

## 注意事项

⚠️ 当前为**模拟交易**，不执行真实下单
⚠️ API Key 硬编码在代码中，仅供演示
⚠️ 策略参数已针对风险偏好保守型投资者优化
