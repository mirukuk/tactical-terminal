import { useState, useMemo } from 'react';
import { 
  BarChart3, 
  RefreshCw,
  Search,
  TrendingUp,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ChevronDown,
  Flame,
  Star,
  TrendingUp as TrendUp,
  CandlestickChart,
  Activity,
  LayoutGrid
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useStockContext, type StockData, type SpyHistoryPoint } from '../context/StockContext';
import { formatDollarVolume } from '../hooks/useApi';
import ShareCard from '../components/ShareCard';
import CandlestickChartComponent from '../components/CandlestickChart';
import RelativeStrengthChart from '../components/RelativeStrengthChart';
import HeatMap from '../components/HeatMap';

// Get trading recommendation - now considers market regime
const getRecommendation = (stock: StockData, marketRegime?: { allow_new_longs: boolean; regime_chinese?: string }): { text: string; color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; description: string } => {
  const score = stock.total_score;
  const vsSmh = stock.vs_smh_20d;
  const perf20d = stock.perf_20d;
  const rsi = stock.rsi;
  const volatility = stock.volatility;
  
  let recommendation: { text: string; color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; description: string };
  
  if (score >= 75 && vsSmh > 5 && perf20d > 5 && rsi < 70) {
    recommendation = { 
      text: '強烈買入', 
      color: '#00ff9d', 
      icon: ThumbsUp,
      description: '高評分、強勢跑贏SMH、動能向上、未超買'
    };
  } else if (score >= 60 && vsSmh > 0 && perf20d > 0) {
    recommendation = { 
      text: '買入', 
      color: '#00d68f', 
      icon: ThumbsUp,
      description: '評分良好、跑贏SMH、正向動能'
    };
  } else if (score < 35 && vsSmh < -5 && perf20d < -5) {
    recommendation = { 
      text: '強烈賣出', 
      color: '#ff0040', 
      icon: ThumbsDown,
      description: '低評分、大幅落後SMH、動能向下'
    };
  } else if (score < 50 && vsSmh < 0 && perf20d < 0) {
    recommendation = { 
      text: '賣出', 
      color: '#ff3355', 
      icon: ThumbsDown,
      description: '評分偏低、落後SMH、負向動能'
    };
  } else if (rsi > 75 && perf20d > 15) {
    recommendation = { 
      text: '謹慎', 
      color: '#ff6b35', 
      icon: AlertTriangle,
      description: 'RSI超買、短期漲幅過大，注意回調風險'
    };
  } else if (volatility > 50) {
    recommendation = { 
      text: '謹慎', 
      color: '#ffd700', 
      icon: AlertTriangle,
      description: '波動率較高，注意風險控制'
    };
  } else {
    recommendation = { 
      text: '持有', 
      color: '#ffd700', 
      icon: Minus,
      description: '條件中性，建議觀望或持有現有倉位'
    };
  }
  
  // Adjust for market regime
  if (marketRegime && !marketRegime.allow_new_longs) {
    if (recommendation.text === '強烈買入' || recommendation.text === '買入') {
      return {
        text: '觀望',
        color: '#ffd700',
        icon: Minus,
        description: `大盤環境不利 (${marketRegime.regime_chinese})，建議觀望，等待更好的進場時機`
      };
    }
  }
  
  return recommendation;
};

// Calculate risk score
const getRiskScore = (stock: StockData): number => {
  let riskScore = 0;
  if (stock.volatility > 50) riskScore += 30;
  else if (stock.volatility > 35) riskScore += 15;
  if (stock.rsi > 75) riskScore += 20;
  else if (stock.rsi < 25) riskScore += 15;
  if (stock.max_drawdown < -30) riskScore += 20;
  else if (stock.max_drawdown < -20) riskScore += 10;
  if (stock.sharpe_ratio < 0.5) riskScore += 15;
  return Math.min(100, riskScore);
};

export default function Analysis() {
  const { 
    addToWatchlist, 
    stocksData,
    smhData,
    marketData,
    loading,
    refreshData,
    selectedStock,
    setSelectedStock
  } = useStockContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'candlestick' | 'rs'>('line');
  const [showHeatMap, setShowHeatMap] = useState(false);

  // Get all stocks sorted by dollar volume
  const allStocks = useMemo(() => {
    return Object.values(stocksData).sort((a, b) => b.dollar_volume - a.dollar_volume);
  }, [stocksData]);

  // Filter stocks by search
  const filteredStocks = useMemo(() => {
    if (!searchQuery) return allStocks.slice(0, 10);
    return allStocks.filter(s => 
      s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allStocks, searchQuery]);

  // Top picks (highest score)
  const topPicks = useMemo(() => {
    return [...allStocks].sort((a, b) => b.total_score - a.total_score).slice(0, 5);
  }, [allStocks]);

  const handleSelectStock = (ticker: string) => {
    setSelectedStock(ticker);
    setSearchQuery(ticker);
    setShowDropdown(false);
  };

  const handleAddCustom = async () => {
    const ticker = searchQuery.trim().toUpperCase();
    if (ticker && !stocksData[ticker]) {
      await addToWatchlist(ticker);
      setSelectedStock(ticker);
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 60) return { level: '高', color: '#ff0040' };
    if (score >= 40) return { level: '中等', color: '#ffd700' };
    return { level: '低', color: '#00ff88' };
  };

  const selectedStockData = selectedStock ? stocksData[selectedStock] : null;
  const recommendation = selectedStockData ? getRecommendation(selectedStockData, marketData ? { allow_new_longs: marketData.allow_new_longs, regime_chinese: marketData.regime_chinese } : undefined) : null;

  // Performance chart data
  const performanceData = selectedStockData?.history?.map((h, _i, arr) => {
    const startPrice = arr[0]?.close || 1;
    return {
      date: h.date.slice(5),
      normalized: ((h.close / startPrice - 1) * 100),
    };
  }) || [];

  return (
    <div className="min-h-screen pb-12 grid-bg">
      {/* Header */}
      <section className="py-6 px-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-white tracking-wider">
              深度分析
            </h1>
            <p className="font-mono text-xs text-gray-500 tracking-widest">
              DEEP ANALYSIS
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {smhData && (
              <div className="glass-card rounded-lg px-4 py-2">
                <div className="font-mono text-sm">
                  <span className="text-gray-500">SMH: </span>
                  <span className={smhData.perf_20d >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {smhData.perf_20d >= 0 ? '+' : ''}{smhData.perf_20d.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
            <button 
              onClick={refreshData}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>
      </section>

      {/* Market Regime Warning Banner */}
      {marketData && (
        <section className="px-6 mb-4">
          <div 
            className="rounded-xl p-4 flex items-center justify-between"
            style={{
              background: marketData.allow_new_longs ? 'rgba(0, 255, 157, 0.1)' : 'rgba(255, 0, 64, 0.1)',
              border: `1px solid ${marketData.allow_new_longs ? 'rgba(0, 255, 157, 0.3)' : 'rgba(255, 0, 64, 0.3)'}`
            }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: marketData.regime_color + '20',
                  border: `1px solid ${marketData.regime_color}40`
                }}
              >
                {marketData.allow_new_longs ? (
                  <TrendUp className="w-5 h-5" style={{ color: marketData.regime_color }} />
                ) : (
                  <AlertTriangle className="w-5 h-5" style={{ color: marketData.regime_color }} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">市場環境: {marketData.regime_chinese}</span>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{ 
                      background: marketData.regime_color + '20', 
                      color: marketData.regime_color,
                      border: `1px solid ${marketData.regime_color}40`
                    }}
                  >
                    {marketData.trading_mode}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-0.5">
                  SPY {marketData.spy_above_200ma ? '>' : '<'} 200MA · VIX: {marketData.vix} · 建議倉位: {Math.round(marketData.position_size_multiplier * 100)}%
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${marketData.allow_new_longs ? 'text-green-400' : 'text-red-400'}`}>
                {marketData.allow_new_longs ? '✓ 可以建立新倉位' : '✗ 暫停新多頭倉位'}
              </p>
              {!marketData.allow_new_longs && (
                <p className="text-xs text-gray-500 mt-0.5">等待市場條件改善</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Stock Selector */}
      <section className="px-6 py-6">
        <div className="glass-panel rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Search Input */}
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-2 block">選擇股票</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value.toUpperCase());
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="輸入股票代碼或名稱..."
                  className="input-modern pl-12 pr-12 w-full"
                />
                <ChevronDown 
                  className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                />
                
                {/* Dropdown */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-xl max-h-64 overflow-y-auto z-50">
                    {filteredStocks.length > 0 ? (
                      filteredStocks.map((stock) => (
                        <div
                          key={stock.ticker}
                          onClick={() => handleSelectStock(stock.ticker)}
                          className="flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-white">{stock.ticker}</span>
                            <span className="text-sm text-gray-500">{stock.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-mono text-sm ${stock.perf_20d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stock.perf_20d >= 0 ? '+' : ''}{stock.perf_20d.toFixed(1)}%
                            </span>
                            <span className="font-mono text-sm text-cyan-400">{stock.total_score}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <p>未找到股票</p>
                        {searchQuery.length >= 1 && (
                          <button
                            onClick={handleAddCustom}
                            className="mt-2 text-cyan-400 hover:underline"
                          >
                            添加 {searchQuery.toUpperCase()}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Top Picks */}
            <div className="lg:w-96">
              <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                精選推薦
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {topPicks.map((stock) => (
                  <button
                    key={stock.ticker}
                    onClick={() => handleSelectStock(stock.ticker)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                      selectedStock === stock.ticker
                        ? 'bg-cyan-400 text-black'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {stock.total_score >= 75 && <Flame className="w-3 h-3 text-orange-400" />}
                      {stock.ticker}
                      <span className="text-xs opacity-70">{stock.total_score}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Selected Stock Analysis */}
      {selectedStockData && recommendation && (
        <section className="px-6">
          {/* Recommendation Banner */}
          <div 
            className="rounded-2xl p-6 mb-6"
            style={{
              background: `linear-gradient(135deg, ${recommendation.color}15 0%, transparent 100%)`,
              border: `2px solid ${recommendation.color}50`,
              boxShadow: `0 0 40px ${recommendation.color}20`
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ background: `${recommendation.color}20`, border: `2px solid ${recommendation.color}40` }}
                >
                  <recommendation.icon className="w-8 h-8" style={{ color: recommendation.color }} />
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">交易建議</p>
                  <p 
                    className="font-display text-3xl font-bold"
                    style={{ color: recommendation.color }}
                  >
                    {recommendation.text}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{recommendation.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400 mb-1">評分</p>
                <p className="font-mono text-4xl font-bold text-cyan-400">{selectedStockData.total_score}</p>
              </div>
            </div>
          </div>

          {/* Market Regime Warning for This Stock */}
          {marketData && !marketData.allow_new_longs && (
            <div 
              className="rounded-xl p-4 mb-6"
              style={{
                background: 'rgba(255, 0, 64, 0.1)',
                border: '1px solid rgba(255, 0, 64, 0.3)'
              }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium mb-1">市場環境警告</p>
                  <p className="text-sm text-gray-400">
                    當前市場處於{marketData.regime_chinese}，不建議建立新多頭倉位。
                    {recommendation.text === '強烈買入' || recommendation.text === '買入' ? (
                      <span className="text-yellow-400 block mt-1">
                        ⚠️ 雖然此股票評分良好，但大盤環境不利，建議等待更好的進場時機。
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs">
                    <span className="text-gray-500">
                      SPY: {marketData.spy_above_200ma ? '>' : '<'} 200MA
                    </span>
                    <span className="text-gray-500">
                      VIX: {marketData.vix} ({marketData.vix < 20 ? '低' : marketData.vix < 25 ? '中' : '高'})
                    </span>
                    <span className="text-gray-500">
                      建議倉位: {Math.round(marketData.position_size_multiplier * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SMH Comparison Banner */}
          {smhData && (
            <div className="glass-panel rounded-2xl p-6 mb-6">
              <h3 className="font-display text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: '#00f0ff' }} />
                與 SMH 比較
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-2">SMH 20日</p>
                  <p className={`font-mono text-2xl font-bold ${smhData.perf_20d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {smhData.perf_20d >= 0 ? '+' : ''}{smhData.perf_20d.toFixed(1)}%
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-2">{selectedStockData.ticker} 20日</p>
                  <p className={`font-mono text-2xl font-bold ${selectedStockData.perf_20d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedStockData.perf_20d >= 0 ? '+' : ''}{selectedStockData.perf_20d.toFixed(1)}%
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-2">相對強弱 (20日)</p>
                  <p className={`font-mono text-2xl font-bold ${selectedStockData.vs_smh_20d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedStockData.vs_smh_20d >= 0 ? '+' : ''}{selectedStockData.vs_smh_20d.toFixed(1)}%
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-2">相對強弱 (60日)</p>
                  <p className={`font-mono text-2xl font-bold ${selectedStockData.vs_smh_60d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedStockData.vs_smh_60d >= 0 ? '+' : ''}{selectedStockData.vs_smh_60d.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stock Header */}
          <div className="glass-panel rounded-2xl p-6 mb-6 tactical-corner">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div 
                  className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black ${
                    selectedStockData.rating === 'S' ? 'rating-s' :
                    selectedStockData.rating === 'A' ? 'rating-a' :
                    selectedStockData.rating === 'B' ? 'rating-b' :
                    selectedStockData.rating === 'C' ? 'rating-c' : 'rating-d'
                  }`}
                >
                  {selectedStockData.rating}
                </div>
                <div>
                  <h2 className="font-display text-2xl text-white">{selectedStockData.ticker}</h2>
                  <p className="text-gray-500">{selectedStockData.name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedStockData.above_sma50 ? '✓ 高於SMA50' : '✗ 低於SMA50'} · 
                    {selectedStockData.above_sma200 ? ' ✓ 高於SMA200' : ' ✗ 低於SMA200'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="font-mono text-3xl font-bold text-white">${selectedStockData.price}</p>
                  <div className={`flex items-center justify-end gap-1 ${selectedStockData.price_change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedStockData.price_change_pct >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span className="font-mono">{selectedStockData.price_change_pct >= 0 ? '+' : ''}{selectedStockData.price_change_pct.toFixed(2)}%</span>
                  </div>
                </div>
                
                <div className="hidden md:block w-px h-16 bg-white/10" />
                
                {/* Score Circle */}
                <div className="text-center">
                  <div className="relative w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="36" fill="none" stroke="#1a1d26" strokeWidth="6" />
                      <circle 
                        cx="40" cy="40" r="36" fill="none" stroke="#00ff9d" strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 36}
                        strokeDashoffset={2 * Math.PI * 36 * (1 - selectedStockData.total_score / 100)}
                        style={{ transition: 'stroke-dashoffset 1s ease-out', filter: 'drop-shadow(0 0 5px #00ff9d)' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold font-mono text-green-400">{selectedStockData.total_score}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">評分</p>
                </div>

                {/* Risk Circle */}
                <div className="text-center">
                  <div className="relative w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="36" fill="none" stroke="#1a1d26" strokeWidth="6" />
                      <circle 
                        cx="40" cy="40" r="36" fill="none" 
                        stroke={getRiskScore(selectedStockData) >= 60 ? '#ff0040' : getRiskScore(selectedStockData) >= 40 ? '#ffd700' : '#00ff9d'} 
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 36}
                        strokeDashoffset={2 * Math.PI * 36 * (1 - getRiskScore(selectedStockData) / 100)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xl font-bold font-mono ${getRiskScore(selectedStockData) >= 60 ? 'text-red-400' : getRiskScore(selectedStockData) >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {getRiskScore(selectedStockData)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">風險</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Type Selector */}
          <div className="px-6 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setChartType('line'); setShowHeatMap(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  chartType === 'line' && !showHeatMap
                    ? 'bg-cyan-400 text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  線圖
                </div>
              </button>
              <button
                onClick={() => { setChartType('candlestick'); setShowHeatMap(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  chartType === 'candlestick' && !showHeatMap
                    ? 'bg-cyan-400 text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CandlestickChart className="w-4 h-4" />
                  K線圖
                </div>
              </button>
              <button
                onClick={() => { setChartType('rs'); setShowHeatMap(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  chartType === 'rs' && !showHeatMap
                    ? 'bg-cyan-400 text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  相對強度
                </div>
              </button>
              <button
                onClick={() => setShowHeatMap(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  showHeatMap
                    ? 'bg-cyan-400 text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  熱力圖
                </div>
              </button>
            </div>
          </div>

          {/* Heat Map View */}
          {showHeatMap && (
            <section className="px-6 mb-8">
              <div className="glass-panel rounded-xl p-6">
                <h3 className="font-display text-white mb-4 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5" style={{ color: '#00ff9d' }} />
                  股票熱力圖
                </h3>
                <div className="h-[500px]">
                  <HeatMap 
                    stocks={allStocks}
                    metric="perf_20d"
                    groupBy="rating"
                    onStockClick={handleSelectStock}
                  />
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left - Chart */}
            <div className="glass-panel rounded-xl p-6">
              {chartType === 'line' && (
                <>
                  <h3 className="font-display text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" style={{ color: '#00ff9d' }} />
                    3個月表現
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={performanceData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00ff9d" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1d26" />
                        <XAxis dataKey="date" stroke="#5a6470" fontSize={11} />
                        <YAxis stroke="#5a6470" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ background: '#0a0c10', border: '1px solid #1a1d26', borderRadius: '8px' }}
                          formatter={(v: number) => [`${v.toFixed(2)}%`, '回報']}
                        />
                        <Area type="monotone" dataKey="normalized" stroke="#00ff9d" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {chartType === 'candlestick' && selectedStockData?.history && (
                <>
                  <h3 className="font-display text-white mb-4 flex items-center gap-2">
                    <CandlestickChart className="w-5 h-5" style={{ color: '#00ff9d' }} />
                    K線圖與形態識別
                  </h3>
                  <div className="h-80">
                    <CandlestickChartComponent 
                      data={selectedStockData.history.map((h) => ({
                        date: h.date,
                        open: h.open || h.close * 0.995,
                        high: h.high || h.close * 1.005,
                        low: h.low || h.close * 0.995,
                        close: h.close,
                        volume: h.volume
                      }))}
                      showPatterns={true}
                    />
                  </div>
                </>
              )}

              {chartType === 'rs' && marketData && selectedStockData?.history && (
                <>
                  <h3 className="font-display text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" style={{ color: '#00ff9d' }} />
                    相對強度 vs SPY
                  </h3>
                  <div className="h-80">
                    <RelativeStrengthChart
                      stockData={selectedStockData.history.map((h) => ({ date: h.date, close: h.close }))}
                      spyData={marketData?.spy_history?.map((h: SpyHistoryPoint) => ({ date: h.date, close: h.close })) || []}
                      stockTicker={selectedStockData.ticker}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Right - Metrics */}
            <div className="space-y-6">
              {/* Performance Grid */}
              <div className="glass-panel rounded-xl p-6">
                <h3 className="font-display text-white mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5" style={{ color: '#bf5af2' }} />
                  表現統計
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-card rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">20日</p>
                    <p className={`text-2xl font-bold font-mono ${selectedStockData.perf_20d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStockData.perf_20d >= 0 ? '+' : ''}{selectedStockData.perf_20d.toFixed(1)}%
                    </p>
                  </div>
                  <div className="glass-card rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">60日</p>
                    <p className={`text-2xl font-bold font-mono ${selectedStockData.perf_60d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStockData.perf_60d >= 0 ? '+' : ''}{selectedStockData.perf_60d.toFixed(1)}%
                    </p>
                  </div>
                  <div className="glass-card rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">180日</p>
                    <p className={`text-2xl font-bold font-mono ${selectedStockData.perf_180d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStockData.perf_180d >= 0 ? '+' : ''}{selectedStockData.perf_180d.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Technical Indicators */}
              <div className="glass-panel rounded-xl p-6">
                <h3 className="font-display text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" style={{ color: '#00f0ff' }} />
                  技術指標
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">RSI</p>
                    <p className={`text-xl font-bold font-mono ${selectedStockData.rsi > 70 ? 'text-red-400' : selectedStockData.rsi < 30 ? 'text-green-400' : 'text-white'}`}>
                      {selectedStockData.rsi.toFixed(1)}
                    </p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">MACD</p>
                    <p className={`text-xl font-bold font-mono ${selectedStockData.macd > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStockData.macd > 0 ? '+' : ''}{selectedStockData.macd.toFixed(2)}
                    </p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">波動率</p>
                    <p className="text-xl font-bold font-mono text-white">{selectedStockData.volatility}%</p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Sharpe</p>
                    <p className="text-xl font-bold font-mono text-cyan-400">{selectedStockData.sharpe_ratio}</p>
                  </div>
                </div>
              </div>

              {/* Volume & Risk */}
              <div className="glass-panel rounded-xl p-6">
                <h3 className="font-display text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" style={{ color: '#ff0040' }} />
                  風險指標
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 glass-card rounded-lg">
                    <span className="text-sm text-gray-500">美元成交量</span>
                    <span className="font-mono font-bold text-cyan-400">{formatDollarVolume(selectedStockData.dollar_volume)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 glass-card rounded-lg">
                    <span className="text-sm text-gray-500">最大回撤</span>
                    <span className="font-mono font-bold text-red-400">{selectedStockData.max_drawdown}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 glass-card rounded-lg">
                    <span className="text-sm text-gray-500">風險等級</span>
                    <span 
                      className="px-3 py-1 rounded text-sm font-bold"
                      style={{ 
                        background: `${getRiskLevel(getRiskScore(selectedStockData)).color}20`, 
                        color: getRiskLevel(getRiskScore(selectedStockData)).color,
                        border: `1px solid ${getRiskLevel(getRiskScore(selectedStockData)).color}40`
                      }}
                    >
                      {getRiskLevel(getRiskScore(selectedStockData)).level}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 glass-card rounded-lg">
                    <span className="text-sm text-gray-500">vs SMH (20日)</span>
                    <span className={`font-mono font-bold ${selectedStockData.vs_smh_20d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStockData.vs_smh_20d >= 0 ? '+' : ''}{selectedStockData.vs_smh_20d.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Share */}
              <div className="flex justify-end">
                <ShareCard stock={selectedStockData} type="analysis" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {!selectedStockData && (
        <section className="px-6 py-12 text-center">
          <div className="glass-panel rounded-2xl p-12 max-w-md mx-auto">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="font-display text-xl text-white mb-2">選擇股票開始分析</h3>
            <p className="text-gray-500">使用上方搜索框選擇股票，或點擊精選推薦</p>
          </div>
        </section>
      )}
    </div>
  );
}
