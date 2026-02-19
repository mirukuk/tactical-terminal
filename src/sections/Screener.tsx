import { useState, useMemo } from 'react';
import { 
  Activity, 
  RefreshCw,
  ArrowUpDown,
  Target,
  Flame,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ArrowRight,
  BarChart3,
  AlertTriangle,
  TrendingUp as TrendUp
} from 'lucide-react';
import { useStockContext, type StockData, type MarketData } from '../context/StockContext';
import { formatDollarVolume } from '../hooks/useApi';
import ShareCard from '../components/ShareCard';

interface ScreenerProps {
  onNavigate?: (page: string, stockTicker?: string) => void;
}

// Get trading recommendation - now considers market regime
type LucideIcon = typeof ThumbsUp;
const getRecommendation = (stock: StockData, marketRegime?: MarketData | null): { text: string; color: string; icon: LucideIcon } => {
  const score = stock.total_score;
  const vsSmh = stock.vs_smh_20d;
  const perf20d = stock.perf_20d;
  const rsi = stock.rsi;
  
  // Base recommendation
  let recommendation: { text: string; color: string; icon: LucideIcon };
  
  if (score >= 75 && vsSmh > 5 && perf20d > 5 && rsi < 70) {
    recommendation = { text: '強烈買入', color: '#00ff9d', icon: ThumbsUp };
  } else if (score >= 60 && vsSmh > 0 && perf20d > 0) {
    recommendation = { text: '買入', color: '#00d68f', icon: ThumbsUp };
  } else if (score < 35 && vsSmh < -5 && perf20d < -5) {
    recommendation = { text: '強烈賣出', color: '#ff0040', icon: ThumbsDown };
  } else if (score < 50 && vsSmh < 0 && perf20d < 0) {
    recommendation = { text: '賣出', color: '#ff3355', icon: ThumbsDown };
  } else if (rsi > 75 && perf20d > 15) {
    recommendation = { text: '謹慎', color: '#ff6b35', icon: Minus };
  } else {
    recommendation = { text: '持有', color: '#ffd700', icon: Minus };
  }
  
  // Adjust for market regime
  if (marketRegime && !marketRegime.allow_new_longs) {
    if (recommendation.text === '強烈買入' || recommendation.text === '買入') {
      return { text: '觀望', color: '#ffd700', icon: Minus };
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

export default function Screener({ onNavigate }: ScreenerProps) {
  const { stocksData, smhData, marketData, loading, refreshData, selectedStock, setSelectedStock } = useStockContext();
  const [sortBy, setSortBy] = useState<string>('dollar_volume');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const stocks = useMemo(() => Object.values(stocksData), [stocksData]);

  // Sort stocks - default by dollar_volume, filter by outperform all benchmarks
  const sortedStocks = useMemo(() => {
    // Filter: only stocks that outperform both SMH and QQQ on all timeframes
    const filtered = [...stocks].filter((stock) => stock.outperform_all_benchmarks);
    
    return filtered.sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (sortBy) {
        case 'perf_5d':
          aVal = a.perf_5d || 0;
          bVal = b.perf_5d || 0;
          break;
        case 'total_score':
          aVal = a.total_score;
          bVal = b.total_score;
          break;
        case 'risk_score':
          aVal = getRiskScore(a);
          bVal = getRiskScore(b);
          break;
        case 'vs_smh_20d':
          aVal = a.vs_smh_20d;
          bVal = b.vs_smh_20d;
          break;
        case 'perf_20d':
          aVal = a.perf_20d;
          bVal = b.perf_20d;
          break;
        case 'perf_60d':
          aVal = a.perf_60d;
          bVal = b.perf_60d;
          break;
        case 'perf_180d':
          aVal = a.perf_180d;
          bVal = b.perf_180d;
          break;
        case 'dollar_volume':
        default:
          aVal = a.dollar_volume;
          bVal = b.dollar_volume;
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [stocks, sortBy, sortOrder]);

  const getRatingClass = (rating: string) => {
    switch (rating) {
      case 'S': return 'rating-s';
      case 'A': return 'rating-a';
      case 'B': return 'rating-b';
      case 'C': return 'rating-c';
      case 'D': return 'rating-d';
      default: return 'rating-c';
    }
  };

  const getRiskClass = (score: number) => {
    if (score >= 60) return 'bg-red-400/20 text-red-400';
    if (score >= 40) return 'bg-yellow-400/20 text-yellow-400';
    return 'bg-green-400/20 text-green-400';
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const selectedStockData = selectedStock ? stocksData[selectedStock] : null;
  const selectedRecommendation = selectedStockData ? getRecommendation(selectedStockData, marketData) : null;

  const handleGoToAnalysis = () => {
    if (selectedStock && onNavigate) {
      onNavigate('analysis', selectedStock);
    }
  };

  return (
    <div className="min-h-screen pb-12 grid-bg">
      {/* Header */}
      <section className="py-6 px-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-white tracking-wider">
              股票篩選
            </h1>
            <p className="font-mono text-xs text-gray-500 tracking-widest">
              STOCK SCREENER · {sortedStocks.length} 隻股票
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

      {/* Main Content - Two Column Layout */}
      <section className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left - Stock Table */}
          <div className="xl:col-span-2">
            <div className="glass-panel rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>股票</th>
                      <th 
                        className="cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={() => handleSort('dollar_volume')}
                      >
                        <div className="flex items-center gap-1">
                          美元成交
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={() => handleSort('perf_5d')}
                      >
                        <div className="flex items-center gap-1">
                          5日
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={() => handleSort('total_score')}
                      >
                        <div className="flex items-center gap-1">
                          評分
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={() => handleSort('perf_20d')}
                      >
                        <div className="flex items-center gap-1">
                          20日
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={() => handleSort('perf_60d')}
                      >
                        <div className="flex items-center gap-1">
                          60日
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={() => handleSort('vs_smh_20d')}
                      >
                        <div className="flex items-center gap-1">
                          vs SMH
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={() => handleSort('risk_score')}
                      >
                        <div className="flex items-center gap-1">
                          風險
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th>建議</th>
                      <th>評級</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStocks.map((stock) => {
                      const recommendation = getRecommendation(stock, marketData);
                      const RecIcon = recommendation.icon;
                      const isSelected = selectedStock === stock.ticker;
                      return (
                        <tr 
                          key={stock.ticker}
                          className={`cursor-pointer transition-all ${isSelected ? 'selected bg-cyan-400/10' : ''}`}
                          onClick={() => setSelectedStock(stock.ticker)}
                        >
                          <td>
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-mono font-bold text-white flex items-center gap-2">
                                  {stock.ticker}
                                  {stock.perf_20d > 10 && stock.vs_smh_20d > 0 && (
                                    <Flame className="w-4 h-4 text-orange-400" />
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">{stock.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="font-mono text-cyan-400">
                            {formatDollarVolume(stock.dollar_volume)}
                          </td>
                          <td className={`font-mono ${stock.perf_5d ?? 0 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(stock.perf_5d ?? 0) >= 0 ? '+' : ''}{stock.perf_5d?.toFixed(1) || '0.0'}%
                          </td>
                          <td>
                            <span className={`inline-block px-2 py-0.5 rounded text-sm font-bold ${
                              stock.total_score >= 70 ? 'bg-green-400/20 text-green-400' :
                              stock.total_score >= 50 ? 'bg-yellow-400/20 text-yellow-400' :
                              'bg-red-400/20 text-red-400'
                            }`}>
                              {stock.total_score}
                            </span>
                          </td>
                          <td className={`font-mono ${stock.perf_20d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stock.perf_20d >= 0 ? '+' : ''}{stock.perf_20d.toFixed(1)}%
                          </td>
                          <td className={`font-mono ${stock.perf_60d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stock.perf_60d >= 0 ? '+' : ''}{stock.perf_60d.toFixed(1)}%
                          </td>
                          <td>
                            <div className={`flex items-center gap-1 ${stock.vs_smh_20d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stock.vs_smh_20d >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              {stock.vs_smh_20d >= 0 ? '+' : ''}{stock.vs_smh_20d.toFixed(1)}%
                            </div>
                          </td>
                          <td>
                            <span className={`inline-block px-2 py-0.5 rounded text-sm font-bold ${getRiskClass(getRiskScore(stock))}`}>
                              {getRiskScore(stock)}
                            </span>
                          </td>
                          <td>
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
                              style={{ background: `${recommendation.color}20`, color: recommendation.color, border: `1px solid ${recommendation.color}40` }}
                            >
                              <RecIcon className="w-3 h-3" />
                              {recommendation.text}
                            </span>
                          </td>
                          <td>
                            <span className={`inline-block px-3 py-1 rounded text-sm font-bold ${getRatingClass(stock.rating)}`}>
                              {stock.rating}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right - Selected Stock Details */}
          <div className="xl:col-span-1">
            {selectedStockData ? (
              <div className="glass-panel rounded-xl p-6 sticky top-6">
                  {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-white flex items-center gap-2">
                    <Target className="w-5 h-5" style={{ color: '#ffd700' }} />
                    {selectedStockData.ticker}
                  </h3>
                  {selectedRecommendation && (() => {
                    const RecIcon = selectedRecommendation.icon;
                    return (
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
                        style={{ background: `${selectedRecommendation.color}20`, color: selectedRecommendation.color, border: `1px solid ${selectedRecommendation.color}40` }}
                      >
                        <RecIcon className="w-3 h-3" />
                        {selectedRecommendation.text}
                      </span>
                    );
                  })()}
                </div>

                {/* Market Regime Warning */}
                {marketData && !marketData.allow_new_longs && (
                  <div 
                    className="rounded-lg p-3 mb-4"
                    style={{
                      background: 'rgba(255, 0, 64, 0.1)',
                      border: '1px solid rgba(255, 0, 64, 0.3)'
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-400 text-sm font-medium">市場環境警告</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          當前不建議建新倉位。建議倉位: {Math.round(marketData.position_size_multiplier * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Price */}
                <div className="mb-6">
                  <div className="font-mono text-3xl font-bold text-white">${selectedStockData.price}</div>
                  <div className={`font-mono text-sm ${selectedStockData.price_change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedStockData.price_change_pct >= 0 ? '+' : ''}{selectedStockData.price_change_pct.toFixed(2)}%
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="glass-card rounded-lg p-3">
                    <div className="text-xs text-gray-500">評分</div>
                    <div className="font-mono text-lg text-cyan-400">{selectedStockData.total_score}</div>
                  </div>
                  <div className="glass-card rounded-lg p-3">
                    <div className="text-xs text-gray-500">風險</div>
                    <div className={`font-mono text-lg ${getRiskScore(selectedStockData) >= 60 ? 'text-red-400' : 'text-green-400'}`}>
                      {getRiskScore(selectedStockData)}
                    </div>
                  </div>
                  <div className="glass-card rounded-lg p-3">
                    <div className="text-xs text-gray-500">5日</div>
                    <div className={`font-mono text-lg ${(selectedStockData.perf_5d ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(selectedStockData.perf_5d ?? 0) >= 0 ? '+' : ''}{selectedStockData.perf_5d?.toFixed(1) || '0.0'}%
                    </div>
                  </div>
                  <div className="glass-card rounded-lg p-3">
                    <div className="text-xs text-gray-500">vs SMH 5D</div>
                    <div className={`font-mono text-lg ${(selectedStockData.vs_smh_5d ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(selectedStockData.vs_smh_5d ?? 0) >= 0 ? '+' : ''}{selectedStockData.vs_smh_5d?.toFixed(1) || '0.0'}%
                    </div>
                  </div>
                  <div className="glass-card rounded-lg p-3">
                    <div className="text-xs text-gray-500">20日</div>
                    <div className={`font-mono text-lg ${selectedStockData.perf_20d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStockData.perf_20d >= 0 ? '+' : ''}{selectedStockData.perf_20d.toFixed(1)}%
                    </div>
                  </div>
                  <div className="glass-card rounded-lg p-3">
                    <div className="text-xs text-gray-500">60日</div>
                    <div className={`font-mono text-lg ${selectedStockData.perf_60d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStockData.perf_60d >= 0 ? '+' : ''}{selectedStockData.perf_60d.toFixed(1)}%
                    </div>
                  </div>
                  <div className="glass-card rounded-lg p-3">
                    <div className="text-xs text-gray-500">180日</div>
                    <div className={`font-mono text-lg ${selectedStockData.perf_180d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStockData.perf_180d >= 0 ? '+' : ''}{selectedStockData.perf_180d.toFixed(1)}%
                    </div>
                  </div>
                  <div className="glass-card rounded-lg p-3">
                    <div className="text-xs text-gray-500">vs SMH 20D</div>
                    <div className={`font-mono text-lg ${selectedStockData.vs_smh_20d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStockData.vs_smh_20d >= 0 ? '+' : ''}{selectedStockData.vs_smh_20d.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Volume */}
                <div className="glass-card rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-500 mb-1">美元成交量</div>
                  <div className="font-mono text-xl text-cyan-400">
                    {formatDollarVolume(selectedStockData.dollar_volume)}
                  </div>
                </div>

                {/* Technical */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-xs text-gray-500">RSI</div>
                    <div className="font-mono text-lg text-white">{selectedStockData.rsi.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Sharpe</div>
                    <div className="font-mono text-lg text-white">{selectedStockData.sharpe_ratio}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">波動率</div>
                    <div className="font-mono text-lg text-white">{selectedStockData.volatility}%</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleGoToAnalysis}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    深度分析
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <ShareCard stock={selectedStockData} type="analysis" />
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-xl p-6 text-center text-gray-500 sticky top-6">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>點擊股票查看詳情</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
