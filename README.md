# Tactical Terminal Trading

專業股票分析交易系統 - 戰術終端風格界面

## 專案概述

Tactical Terminal 是一個專業級的股票分析與交易系統，採用現代化的戰術終端風格界面設計。系統整合了多種市場數據來源，提供全面的市場情報、股票篩選、深度分析和期權策略功能。

## 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ 市場情報 │ │ 股票篩選 │ │ 深度分析 │ │ 期權策略 │          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
│       │           │           │           │                 │
│       └───────────┴─────┬─────┴───────────┘                 │
│                         │                                    │
│                   StockContext                               │
│                   (State Management)                         │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/API
┌─────────────────────────┴───────────────────────────────────┐
│                    Backend (Flask + Python)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ yfinance API │  │ CNN F&G API  │  │ Finviz API   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 技術棧

### Frontend
- **React 19** - UI 框架
- **TypeScript** - 類型安全
- **Vite 7** - 構建工具
- **Tailwind CSS** - 樣式框架
- **Radix UI** - 無障礙 UI 組件
- **Recharts** - 圖表庫
- **Lucide React** - 圖標庫

### Backend
- **Python 3.x** - 後端語言
- **Flask** - Web 框架
- **Flask-CORS** - 跨域支持
- **yfinance** - Yahoo Finance 數據
- **pandas/numpy** - 數據處理
- **requests** - HTTP 請求

## 功能模組

### 1. 市場情報 (Market Analysis)

提供全面的市場概況，包括：

- **整體市場評分** (0-100)
  - 綜合 VIX、恐懼貪婪指數、市場廣度、SPY 趨勢等因素

- **市場指數**
  - SPY (S&P 500 ETF)
  - QQQ (NASDAQ 100 ETF)
  - IWM (Russell 2000 ETF)
  - SMH (半導體 ETF)

- **CNN 恐懼貪婪指數**
  - 主指數及歷史數據
  - 7 大子指標：
    - SP500 動量
    - 價格強度
    - 價格廣度
    - 垃圾債需求
    - VIX 波動率
    - Put/Call 比率
    - 避險需求

- **市場廣度指標**
  - NYSE 新高/新低
  - 漲跌家數
  - 高於 50/200 日移動平均線比例

- **SPY 趨勢分析**
  - 10 個月移動平均線位置
  - RSI 指標
  - 趨勢信號

### 2. 股票篩選 (Screener)

多維度股票評分系統：

| 排序選項 | 說明 |
|---------|------|
| 美元成交 | 按資金流動性排序 |
| 評分 | 按 0-100 綜合評分排序 |
| 20日/60日/180日 | 按期間表現排序 |
| vs SMH | 按相對半導體板塊表現排序 |
| 風險 | 按風險評分排序 |

**評級系統**：
- **S 級** (85-100): 極佳
- **A 級** (75-84): 優秀
- **B 級** (60-74): 良好
- **C 級** (45-59): 一般
- **D 級** (0-44): 較差

### 3. 深度分析 (Deep Analysis)

針對單一股票的詳細分析：

- **交易建議**
  - 強烈買入 / 買入 / 持有 / 賣出 / 強烈賣出 / 謹慎

- **與 SMH 比較**
  - 20日/60日相對強弱

- **技術指標**
  - RSI (相對強弱指數)
  - MACD
  - 波動率
  - Sharpe 比率
  - 最大回撤

- **移動平均線分析**
  - SMA50 / SMA200 位置判斷

- **3 個月表現圖表**

### 4. 期權策略 (Options Trading)

開發中的功能，將提供：
- 策略分析
- Greeks 計算
- 風險評估

## 評分系統詳解

### 總評分計算 (0-100)

```
基礎分數: 50

+ SMH 相對表現 (最高 +25)
  | vs SMH 20日 > 10%: +15
  | vs SMH 20日 > 5%:  +12
  | vs SMH 20日 > 0%:  +8
  | vs SMH 60日 > 15%: +10
  | vs SMH 60日 > 5%:  +5

+ 價格表現 (最高 +15)
  | 20日 > 15%: +10
  | 20日 > 5%:  +5
  | 60日 > 30%: +5

+ 技術指標 (最高 +15)
  | RSI 在 55-70 區間: +5
  | 價格 > SMA50:      +5
  | 價格 > SMA200:     +5

+ 成交量流動性 (最高 +10)
  | 日美元成交 > $500M: +5
  | 日美元成交 > $100M: +3

+ 風險指標 (最高 +15)
  | Sharpe > 1.5:      +8
  | Sharpe > 1.0:      +5
  | 波動率 < 30%:      +5
  | 波動率 < 40%:      +3
  | 最大回撤 > -15%:   +2

+ 分析師建議 (最高 +5)
  | Strong Buy: +5
  | Buy:        +3

- 扣分項
  | 波動率 > 60%:      -5
  | 最大回撤 < -40%:   -3
  | Sell/Strong Sell:  -3
```

### 風險評分計算 (0-100)

```
風險分數累計:
| 波動率 > 50%:     +30
| 波動率 > 35%:     +15
| RSI > 75:         +20
| RSI < 25:         +15
| 最大回撤 < -30%:  +20
| 最大回撤 < -20%:  +10
| Sharpe < 0.5:     +15

風險等級:
| ≥60: 高風險
| 40-59: 中等風險
| <40: 低風險
```

### 交易建議條件

| 建議 | 條件 |
|------|------|
| 強烈買入 | 評分≥75、vs SMH>5%、20日>5%、RSI<70 |
| 買入 | 評分≥60、vs SMH>0%、20日>0% |
| 持有 | 中性條件 |
| 賣出 | 評分<50、vs SMH<0%、20日<0% |
| 強烈賣出 | 評分<35、vs SMH<-5%、20日<-5% |
| 謹慎 | RSI>75 或 波動率>50% |

## API 端點

### `GET /api/all-data`
獲取所有市場和股票數據

**回應格式**:
```json
{
  "stocks": {
    "NVDA": { ... },
    "TSLA": { ... }
  },
  "market": {
    "spy_price": 450.25,
    "vix": 18.5,
    "fear_greed_index": 55,
    ...
  },
  "smh": { ... },
  "last_update": "2026-02-18 10:30:00"
}
```

### `GET /api/stock/<ticker>`
獲取單一股票詳細數據

**參數**: `ticker` - 股票代碼 (如 NVDA)

### `POST /api/refresh`
強制刷新所有數據

### `GET /health`
健康檢查端點

## 數據來源

| 數據類型 | 來源 |
|---------|------|
| 股票價格/成交量 | Yahoo Finance (yfinance) |
| 股票篩選列表 | Finviz |
| 恐懼貪婪指數 | CNN Money |
| 市場廣度 | 估算 (基於 SPY) |

## 安裝步驟

### 1. 安裝 Python 依賴

```bash
pip install flask flask-cors yfinance pandas numpy requests
```

### 2. 安裝 Node.js 依賴

```bash
npm install
```

### 3. 啟動 API 服務器

```bash
python api/trading_api.py
```

API 將運行在 http://localhost:5000

### 4. 啟動前端開發服務器

```bash
npm run dev
```

前端將運行在 http://localhost:5173

### 一鍵啟動 (可選)

```bash
python start.py
```

此腳本會自動檢查並安裝依賴，同時啟動前後端服務。

## 項目結構

```
app/
├── api/
│   └── trading_api.py      # Flask 後端 API
├── src/
│   ├── components/
│   │   ├── ui/             # UI 組件庫 (Radix)
│   │   ├── ShareCard.tsx   # 分享卡片
│   │   └── StockEditor.tsx # 股票編輯器
│   ├── context/
│   │   └── StockContext.tsx # 全局狀態管理
│   ├── hooks/
│   │   ├── useApi.ts       # API 鉤子
│   │   └── use-mobile.ts   # 響應式鉤子
│   ├── sections/
│   │   ├── MarketAnalysis.tsx   # 市場情報頁
│   │   ├── Screener.tsx         # 股票篩選頁
│   │   ├── Analysis.tsx         # 深度分析頁
│   │   └── OptionsTrading.tsx   # 期權策略頁
│   ├── App.tsx             # 主應用組件
│   ├── App.css             # 全局樣式
│   ├── Navigation.tsx      # 導航組件
│   ├── main.tsx            # 入口文件
│   └── index.css           # 基礎樣式
├── dist/                   # 構建輸出
├── package.json            # Node 依賴配置
├── vite.config.ts          # Vite 配置
├── tailwind.config.js      # Tailwind 配置
├── tsconfig.json           # TypeScript 配置
├── start.py                # 一鍵啟動腳本
└── README.md               # 說明文檔
```

## 狀態管理

`StockContext` 提供全局狀態：

```typescript
interface StockContextType {
  watchlist: string[];           // 監控列表
  setWatchlist: Function;        // 設置監控列表
  addToWatchlist: Function;      // 添加到監控
  removeFromWatchlist: Function; // 從監控移除
  selectedStock: string;         // 當前選中股票
  setSelectedStock: Function;    // 設置選中股票
  stocksData: Record<string, StockData>; // 所有股票數據
  marketData: MarketData | null; // 市場數據
  loading: boolean;              // 加載狀態
  refreshData: Function;         // 刷新數據
  smhData: StockData | null;     // SMH ETF 數據
}
```

監控列表自動保存至 `localStorage`。

## 樣式系統

採用 Tailwind CSS + 自定義類：

### 主要樣式類

| 類名 | 用途 |
|-----|------|
| `glass-panel` | 玻璃態面板 |
| `glass-card` | 玻璃態卡片 |
| `btn-primary` | 主要按鈕 |
| `btn-secondary` | 次要按鈕 |
| `input-modern` | 現代化輸入框 |
| `table-modern` | 現代化表格 |
| `grid-bg` | 網格背景 |
| `rating-s/a/b/c/d` | 評級徽章樣式 |

### 配色方案

| 用途 | 顏色代碼 |
|-----|---------|
| 主要強調 | #00f0ff (青色) |
| 正面/買入 | #00ff9d (綠色) |
| 負面/賣出 | #ff0040 (紅色) |
| 警告/中性 | #ffd700 (金色) |
| 背景 | #0a0c10 (深黑) |

## 開發命令

```bash
# 開發模式
npm run dev

# 構建生產版本
npm run build

# 預覽生產版本
npm run preview

# 代碼檢查
npm run lint
```

## 免責聲明

本系統提供的所有數據和分析僅供參考，不構成任何投資建議。投資有風險，入市需謹慎。

## 授權

MIT License
