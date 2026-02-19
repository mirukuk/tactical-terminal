# 股票分析應用程式架構說明

## 專案概述
這是一個戰術終端股票分析應用程式，提供市場情報、股票篩選、深度分析和期權策略功能。

## 目錄結構

```
app/
├── api/
│   └── trading_api.py          # Flask 後端 API
├── src/
│   ├── sections/               # 頁面組件
│   │   ├── MarketAnalysis.tsx  # 市場情報頁面
│   │   ├── Screener.tsx        # 股票篩選頁面
│   │   ├── Analysis.tsx        # 深度分析頁面
│   │   └── OptionsTrading.tsx  # 期權策略頁面
│   ├── context/
│   │   └── StockContext.tsx    # React Context 狀態管理
│   ├── hooks/
│   │   ├── useApi.ts           # 格式化工具函數 (formatDollarVolume, formatPercentage, formatNumber)
│   │   └── use-mobile.ts       # 移動端檢測
│   ├── components/ui/          # UI 組件庫
│   ├── lib/
│   │   └── utils.ts            # 工具函數
│   ├── Navigation.tsx          # 導航組件
│   ├── App.tsx                 # 主應用組件
│   ├── main.tsx                # 入口文件
│   └── index.css               # 全局樣式
└── start.py                    # 啟動腳本
```

---

## API 文件 (trading_api.py)

### 概述
Flask 後端服務，提供股票數據、市場指標和技術分析數據。

### 主要功能模塊

#### 1. 市場情緒指標
- **get_cnn_fear_greed()**: 獲取 CNN 恐懼貪婪指數
  - 包含 7 個子指標: SP500動能、SP125動能、價格強度、價格廣度、垃圾債需求、VIX、看跌/看漲比率、避險需求
  - 返回歷史數據: 前收盤、1週前、1月前、1年前
  
- **get_market_breadth()**: 市場廣度指標
  - NYSE 新高/新低股票數量
  - 漲跌家數統計
  - A/D 線數據
  
- **get_stocks_above_ma()**: 高於移動平均線的股票比例
  - 高於 50 日 MA 的股票百分比
  - 高於 200 日 MA 的股票百分比

#### 2. 技術指標計算
**calculate_indicators(hist)**: 計算多種技術指標
- **RSI**: 相對強弱指標 (14日)
- **MACD**: 移動平均收斂發散指標
- **SMA**: 簡單移動平均線 (50日、200日)
- **Volatility**: 年化波動率
- **Sharpe Ratio**: 夏普比率
- **Max Drawdown**: 最大回撤
- **Bollinger Band Width**: 布林帶寬度

#### 3. 股票數據獲取
**get_stock_data(ticker, smh_perf_20d, smh_perf_60d, smh_perf_180d)**
- 獲取單一股票的完整數據
- 計算相對於 SMH (半導體ETF) 的表現
- 綜合評分算法 (0-100分):
  - SMH 相對表現 (最多+20分)
  - 價格表現 (最多+15分)
  - 技術指標 (最多+15分)
  - 成交量和流動性 (最多+10分)
  - 風險指標 (最多+15分)
  - 分析師推薦 (最多+5分)
- 評級系統: S (85+), A (75-84), B (60-74), C (45-59), D (<45)

#### 4. 股票篩選
**get_finviz_stocks()**: 從 Finviz 篩選器獲取熱門股票
- 篩選條件: 價格 > $10, 正變化, 13週和26週表現優異
- 按成交量排序
- 返回前 50 檔股票
- 備用: 返回預設熱門股票列表

#### 5. 市場環境過濾 (Market Regime Filter)
**calculate_market_regime(spy_data, vix_value)**: 計算市場環境狀態
- **5種市場環境**:
  - **牛市 (bullish)**: SPY > 200MA, VIX < 20 → 積極做多
  - **謹慎牛市 (cautious_bull)**: SPY > 200MA, VIX 20-25 → 選股做多
  - **波動牛市 (volatile_bull)**: SPY > 200MA, VIX >= 25 → 減少倉位
  - **回調市場 (correction)**: SPY < 200MA, VIX < 25 → 觀望為主
  - **熊市 (bearish)**: SPY < 200MA, VIX >= 25 → 防守為主
- **倉位調整建議**:
  - VIX < 20: 100% 標準倉位
  - VIX 20-25: 75% 倉位
  - VIX 25-30: 50% 倉位
  - VIX >= 30: 25% 倉位
- **交易規則**:
  - 僅當 SPY > 200MA 且 VIX < 25 時允許建立新多頭倉位
  - 高 VIX 環境自動降低買入建議為「觀望」

**adjust_score_for_regime(score, regime_data)**: 根據市場環境調整股票評分
- 熊市環境自動降低評分
- 高波動環境應用倉位乘數

#### 6. 數據更新
**update_all_data()**: 更新所有市場和股票數據
- 獲取 SMH 數據作為基準
- 獲取市場指數 (SPY, QQQ, IWM)
- 獲取 VIX 恐慌指數
- 計算市場廣度指標
- 獲取 CNN 恐懼貪婪指數
- **計算市場環境 (Market Regime)**
- 計算整體市場評分和信號

### API 端點

| 端點 | 方法 | 描述 |
|------|------|------|
| `/api/all-data` | GET | 獲取所有股票和市場數據 |
| `/api/stock/<ticker>` | GET | 獲取單一股票數據 |
| `/api/refresh` | POST | 強制刷新所有數據 |
| `/health` | GET | 健康檢查端點 |

### 數據緩存
- 使用 `_data_cache` 字典緩存數據
- 緩存鍵: `stocks`, `market`, `smh`, `last_update`
- 首次請求時自動更新數據

---

## 頁面說明

### 1. 市場情報 (MarketAnalysis)

**文件**: `src/sections/MarketAnalysis.tsx`

#### 功能概述
顯示整體市場狀態和關鍵指標的儀表板頁面。

#### 主要組件
- **MarketScoreCard**: 市場評分卡片組件
- **MarketIndexCard**: 市場指數卡片 (SPY, QQQ, IWM, SMH)

#### 顯示內容
1. **整體市場評分**
   - 綜合評分 (0-100)
   - 交易信號: 進攻 (70+)、防守 (<50)、平衡
   - 最後更新時間

2. **市場指數**
   - SPY、QQQ、IWM 價格和漲跌幅
   - SMH 基準價格和表現

3. **市場指標評分卡片**
   - 整體評分
   - VIX 恐慌指數評分
   - 恐懼貪婪指數評分
   - 市場廣度評分
   - SPY 趨勢評分

4. **CNN 恐懼貪婪指數**
   - 主指數進度條 (極度恐懼到極度貪婪)
   - 歷史數據對比
   - 7 個子指標詳情

5. **市場廣度指標**
   - NYSE 新高/新低
   - 漲跌家數
   - 高於 50日/200日 MA 的股票比例

6. **SPY 趨勢分析**
   - 10個月移動平均線
   - RSI (14)
   - 趨勢信號

7. **熱門股票 (按美元成交量)**
   - 前 10 檔成交量最高的股票
   - 與 SMH 的相對表現

8. **市場環境過濾器 (Market Regime Filter)**
   - **當前環境狀態**: 牛市/謹慎牛市/波動牛市/回調/熊市
   - **SPY 200MA 狀態**: 當前價格與 200日均線的關係
   - **VIX 級別**: 低(<20)/正常(20-25)/謹慎(25-30)/高風險(>30)
   - **新倉位建議**: 是否允許建立新多頭倉位
   - **倉位調整**: 建議倉位百分比 (100%/75%/50%/25%)
   - **交易規則**: 4條實時交易規則檢查
     - SPY 是否在 200MA 上方
     - VIX 是否正常
     - 是否允許做多
     - 倉位調整建議

---

### 2. 股票篩選 (Screener)

**文件**: `src/sections/Screener.tsx`

#### 功能概述
多維度股票篩選器，支持多種篩選條件和排序。

#### 主要組件
- **Screener**: 核心篩選邏輯

#### 篩選條件
- **Performance**: 20日、60日、180日表現
- **vs SMH**: 相對於半導體 ETF 的表現
- **Dollar Volume**: 美元成交量
- **Rating**: 評級 (S, A, B, C, D)
- **Total Score**: 綜合評分

#### 市場環境整合
- **環境警告橫幅**: 頁面頂部顯示當前市場環境狀態
  - 綠色: 允許建立新倉位 (SPY > 200MA, VIX < 25)
  - 紅色: 暫停新倉位 (SPY < 200MA 或 VIX >= 25)
- **交易建議調整**: 根據市場環境自動調整買入/賣出建議
  - 牛市環境: 正常顯示「買入」「強烈買入」建議
  - 非牛市環境: 買入建議自動降級為「觀望」
- **選股詳情警告**: 當選中股票時，如市場環境不利，顯示警告提示

#### 顯示內容
1. **精選推薦**: 評分最高的前 5 檔股票卡片
2. **股票表格**: 可排序的股票列表
3. **排序功能**: 支持多列排序 (升序/降序)

---

### 3. 深度分析 (Analysis)

**文件**: `src/sections/Analysis.tsx`

#### 功能概述
單一股票的深度技術分析和視覺化。

#### 主要組件
- **Analysis**: 核心分析組件
- **ShareCard**: 分享卡片組件
- **AreaChart**: 價格走勢圖 (Recharts)

#### 市場環境整合
- **環境警告橫幅**: 頁面頂部顯示當前市場環境狀態和建議
- **交易建議調整**: 
  - 當市場環境不利時，買入建議自動調整為「觀望」
  - 建議描述包含市場環境原因
- **環境警告卡片**: 當選中股票時，如環境不允許做多，顯示紅色警告框
  - 警告標題: "市場環境警告"
  - 說明: 當前市場狀態和不建議建倉原因
  - 關鍵指標: SPY與200MA關係、VIX數值、建議倉位

#### 顯示內容

1. **股票選擇器**
   - 股票列表網格
   - 搜索添加功能
   - 展開/收起切換

2. **股票概覽**
   - 股票代碼和名稱
   - 當前價格和漲跌幅
   - 評級徽章 (S/A/B/C/D)
   - 綜合評分圓環圖
   - 相對 SMH 表現圓環圖
   - 移動平均線狀態

3. **相對強弱分析 (vs SMH)**
   - 20日、60日、180日相對表現
   - RS 評級和分數
   - 強弱分析提示

4. **價格走勢圖**
   - 3個月歷史價格
   - 歸一化回報率顯示
   - 面積圖視覺化

5. **技術指標**
   - RSI、MACD、波動率、BB Width
   - 移動平均線狀態 (高於/低於 SMA50/200)

6. **回報率**
   - 1日、20日、60日回報

7. **風險指標**
   - Sharpe Ratio
   - 最大回撤
   - 波動率

8. **成交量資訊**
   - 美元成交量
   - 成交量比率

9. **交易信號**
   - 基於評分和相對表現的信號
   - 強力買入、觀察買入、持有觀察、觀望

---

### 4. 期權策略 (OptionsTrading)

**文件**: `src/sections/OptionsTrading.tsx`

#### 功能概述
期權策略中心 (開發中)。

#### 預計功能
- 策略分析
- Greeks 計算
- 風險評估

#### 當前狀態
- 顯示「開發中」提示頁面
- 預覽即將推出的功能

---

## 狀態管理 (StockContext)

### Context 提供
- **watchlist**: 觀察列表股票代碼數組
- **selectedStock**: 當前選中的股票
- **stocksData**: 所有股票數據字典
- **marketData**: 市場數據
- **smhData**: SMH ETF 數據
- **loading**: 數據加載狀態

### 主要方法
- **addToWatchlist(ticker)**: 添加股票到觀察列表
- **removeFromWatchlist(ticker)**: 從觀察列表移除
- **setSelectedStock(ticker)**: 設置選中股票
- **refreshData()**: 刷新所有數據

### 數據持久化
- 觀察列表保存到 localStorage
- 鍵名: `tactical_terminal_watchlist`

---

## 技術棧

### 前端
- **React 18**: UI 框架
- **TypeScript**: 類型安全
- **Vite**: 構建工具
- **Tailwind CSS**: 樣式框架
- **Recharts**: 圖表庫
- **Lucide React**: 圖標庫

### 後端
- **Flask**: Python Web 框架
- **yfinance**: Yahoo Finance 數據獲取
- **pandas**: 數據處理
- **numpy**: 數值計算
- **requests**: HTTP 請求

### 數據源
- Yahoo Finance (股票價格和指標)
- CNN Fear & Greed Index (市場情緒)
- Finviz (股票篩選)

---

## 啟動說明

1. **啟動後端 API**:
   ```bash
   cd app/api
   python trading_api.py
   ```
   API 將在 http://localhost:5000 運行

2. **啟動前端開發服務器**:
   ```bash
   cd app
   npm run dev
   ```
   應用將在 http://localhost:5173 運行

3. **或使用啟動腳本**:
   ```bash
   cd app
   python start.py
   ```
