"""
fetch_data.py — 使用 yfinance 获取美股数据
AutoSearch 美股个股交易系统数据层

使用方式：
python fetch_data.py NVDA,MSFT,AAPL
python fetch_data.py --all
"""

import yfinance as yf
import json
import sys
import os
from datetime import datetime, timedelta

DATA_DIR = './data/autosearch'

def fetch_history(symbol, days=252):
    """获取单只股票历史数据"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=f"{days}d", auto_adjust=True)
        
        if hist.empty:
            return None
        
        records = []
        for date, row in hist.iterrows():
            records.append({
                'date': date.strftime('%Y-%m-%d'),
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': int(row['Volume'])
            })
        
        return records
    except Exception as e:
        print(f"获取 {symbol} 失败: {e}", file=sys.stderr)
        return None

def batch_fetch(symbols, output_size=252):
    """批量获取多只股票数据"""
    results = {}
    success = 0
    
    for i, sym in enumerate(symbols):
        print(f"[{i+1}/{len(symbols)}] 获取 {sym}...", end=' ', flush=True)
        data = fetch_history(sym, output_size)
        
        if data and len(data) > 100:
            results[sym] = data
            success += 1
            print(f"✅ {len(data)} 条")
        else:
            print("❌")
    
    print(f"\n成功: {success}/{len(symbols)}")
    return results

def save_data(data, filename=None):
    """保存到JSON文件"""
    if filename is None:
        filename = f"prices_{datetime.now().strftime('%Y%m%d')}.json"
    
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"数据已保存: {filepath}")
    return filepath

def load_symbols():
    """从 universe.js 读取 QUICK_UNIVERSE 列表"""
    # 硬编码候选池（与 universe.js 保持一致）
    return [
        'NVDA', 'MSFT', 'AAPL', 'GOOGL', 'META', 'AVGO', 'CRM', 'ORCL', 'AMD', 'INTC',
        'LLY', 'UNH', 'JNJ', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'BMY', 'AMGN',
        'BA', 'RTX', 'LMT', 'NOC', 'GD', 'HON', 'CAT', 'GE',
        'CCJ', 'DNN', 'LEU', 'NNE', 'OKLO', 'VST', 'CEG'
    ]

if __name__ == '__main__':
    if '--all' in sys.argv:
        symbols = load_symbols()
    elif len(sys.argv) > 1:
        symbols = [s.strip().upper() for s in sys.argv[1].split(',')]
    else:
        print("用法: python fetch_data.py NVDA,MSFT,AAPL")
        print("      python fetch_data.py --all")
        sys.exit(1)
    
    print(f"开始获取 {len(symbols)} 只股票数据...\n")
    data = batch_fetch(symbols)
    
    if data:
        save_data(data)
    else:
        print("没有获取到任何数据")
        sys.exit(1)
