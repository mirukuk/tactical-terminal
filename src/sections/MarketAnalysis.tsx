import { useState } from 'react';
import { 
  RefreshCw,
  Globe,
  BarChart3,
  Share2,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  TrendingUp,
  TrendingDown,
  Cpu,
  Clock
} from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import { formatPercentage, formatDollarVolume } from '../hooks/useApi';

// Market Score Card Component
function MarketScoreCard({ 
  title, 
  score, 
  signal, 
  icon: Icon,
  rawValue,
  rawLabel
}: { 
  title: string; 
  score: number; 
  signal: string; 
  icon: React.ElementType;
  rawValue?: number;
  rawLabel?: string;
}) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return '#00ff9d';
    if (s >= 60) return '#ffd700';
    if (s >= 40) return '#ff6b35';
    return '#ff0040';
  };
  
  const color = getScoreColor(score);
  
  return (
    <div className="glass-card rounded-xl p-5 hover:border-cyan-400/30 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" style={{ color }} />
          <span className="text-sm text-gray-400">{title}</span>
        </div>
        <span 
          className="px-2 py-0.5 rounded text-xs font-bold"
          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
        >
          {signal}
        </span>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-4xl font-bold" style={{ color }}>{Math.round(score)}</span>
        <span className="text-sm text-gray-500">/ 100</span>
      </div>
      
      {rawValue !== undefined && (
        <div className="mt-2 text-xs text-gray-500">
          {rawLabel}: <span className="font-mono text-gray-300">{Math.round(rawValue)}</span>
        </div>
      )}
      
      <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${score}%`, 
            background: `linear-gradient(90deg, ${color}, ${color}80)`,
            boxShadow: `0 0 10px ${color}50`
          }}
        />
      </div>
    </div>
  );
}

// Market Index Card
function MarketIndexCard({ name, price, change }: { name: string; price: number; change: number }) {
  const isPositive = change >= 0;
  return (
    <div className="glass-card rounded-xl p-4 text-center hover:border-cyan-400/30 transition-all">
      <p className="text-xs text-gray-500 mb-1">{name}</p>
      <p className="font-mono text-xl font-bold text-white">${price.toFixed(2)}</p>
      <p className={`font-mono text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </p>
    </div>
  );
}

export default function MarketAnalysis() {
  const { marketData, stocksData, smhData, loading, refreshData } = useStockContext();
  const [, setSelectedStock] = useState<string>('');

  // Calculate market scores
  const marketScores = (() => {
    if (!marketData) return null;
    
    const scores = {
      vix: {
        score: Math.max(0, Math.min(100, 100 - (marketData.vix - 10) * 2.5)),
        signal: marketData.vix < 15 ? '極度樂觀' : marketData.vix < 20 ? '樂觀' : marketData.vix < 25 ? '中性' : marketData.vix < 30 ? '謹慎' : '恐慌',
        rawValue: marketData.vix,
        rawLabel: 'VIX'
      },
      fearGreed: {
        score: marketData.fear_greed_index,
        signal: marketData.fear_greed_status,
        rawValue: marketData.fear_greed_index,
        rawLabel: '指數'
      },
      breadth: {
        score: Math.min(100, Math.max(0, (marketData.nyse_new_highs / (marketData.nyse_new_highs + marketData.nyse_new_lows + 1)) * 100)),
        signal: marketData.nyse_new_highs > marketData.nyse_new_lows * 2 ? '強勢' : marketData.nyse_new_highs > marketData.nyse_new_lows ? '偏多' : '偏弱',
        rawValue: (marketData.nyse_new_highs / (marketData.nyse_new_highs + marketData.nyse_new_lows + 1)) * 100,
        rawLabel: '新高比例'
      },
      spyTrend: {
        score: marketData.spy_above_10m ? 75 : 35,
        signal: marketData.spy_above_10m ? '上升趨勢' : '下降趨勢'
      },
      overall: {
        score: marketData.overall_score,
        signal: marketData.signal
      }
    };
    
    return scores;
  })();

  // Get top stocks by dollar volume
  const topStocks = Object.values(stocksData)
    .sort((a, b) => b.dollar_volume - a.dollar_volume)
    .slice(0, 10);

  const handleShare = () => {
    // Share functionality
  };

  // Loading state
  if (!marketData) {
    return (
      <div className="min-h-screen pb-12 grid-bg flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-pulse"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
            }}
          >
            <Globe className="w-10 h-10" style={{ color: '#00f0ff' }} />
          </div>
          <h2 className="font-display text-2xl text-white mb-2">加載市場數據中...</h2>
          <p className="text-gray-500">正在獲取最新市場情報</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 grid-bg">
      {/* Header */}
      <section className="py-6 px-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-white tracking-wider">
              市場情報
            </h1>
            <p className="font-mono text-xs text-gray-500 tracking-widest">
              MARKET INTELLIGENCE
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={refreshData}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button 
              onClick={handleShare}
              className="btn-secondary flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              分享
            </button>
          </div>
        </div>
      </section>

      {/* Overall Market Score - Hero */}
      <section className="px-6 mb-8">
        <div className="glass-panel rounded-2xl p-8 relative overflow-hidden">
          {/* Background glow */}
          <div 
            className="absolute top-0 right-0 w-96 h-96 opacity-20"
            style={{
              background: `radial-gradient(circle, ${marketData.signal_color} 0%, transparent 70%)`,
              transform: 'translate(30%, -30%)'
            }}
          />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <p className="font-mono text-sm text-gray-500 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                整體市場評分
              </p>
              <div className="flex items-baseline gap-4">
                <span 
                  className="font-display text-7xl font-black"
                  style={{ 
                    color: marketData.signal_color,
                    textShadow: `0 0 40px ${marketData.signal_color}50`
                  }}
                >
                  {Math.round(marketData.overall_score)}
                </span>
                <span 
                  className="px-4 py-2 rounded-xl font-display text-xl"
                  style={{
                    background: `${marketData.signal_color}20`,
                    color: marketData.signal_color,
                    border: `2px solid ${marketData.signal_color}50`,
                    boxShadow: `0 0 30px ${marketData.signal_color}40`
                  }}
                >
                  {marketData.signal}
                </span>
              </div>
              <p className="text-gray-500 mt-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                最後更新: {marketData.last_updated}
              </p>
            </div>
            
            {/* Market Indices */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MarketIndexCard name="SPY" price={marketData.spy_price} change={marketData.spy_change_pct} />
              <MarketIndexCard name="QQQ" price={marketData.qqq_price} change={marketData.qqq_change_pct} />
              <MarketIndexCard name="IWM" price={marketData.iwm_price} change={marketData.iwm_change_pct} />
              {smhData && (
                <MarketIndexCard name="SMH" price={smhData.price} change={smhData.perf_20d} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Market Regime - NEW */}
      <section className="px-6 mb-8">
        <div 
          className="glass-panel rounded-2xl p-6 relative overflow-hidden"
          style={{
            border: `2px solid ${marketData.regime_color}50`,
            boxShadow: `0 0 30px ${marketData.regime_color}20`
          }}
        >
          {/* Regime Background Glow */}
          <div 
            className="absolute top-0 left-0 w-full h-full opacity-10"
            style={{
              background: `linear-gradient(135deg, ${marketData.regime_color} 0%, transparent 50%)`
            }}
          />
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Regime Status */}
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${marketData.regime_color}20`,
                    border: `2px solid ${marketData.regime_color}60`
                  }}
                >
                  <BarChart3 className="w-8 h-8" style={{ color: marketData.regime_color }} />
                </div>
                <div>
                  <p className="font-mono text-xs text-gray-500 tracking-widest mb-1">MARKET REGIME</p>
                  <h2 
                    className="font-display text-3xl font-bold"
                    style={{ color: marketData.regime_color }}
                  >
                    {marketData.regime_chinese}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    交易模式: <span style={{ color: marketData.regime_color }}>{marketData.trading_mode}</span>
                  </p>
                </div>
              </div>

              {/* Regime Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* SPY 200MA */}
                <div 
                  className="glass-card rounded-xl p-4 text-center"
                  style={{
                    border: marketData.spy_above_200ma ? '1px solid #00ff9d50' : '1px solid #ff004050'
                  }}
                >
                  <p className="text-xs text-gray-500 mb-1">SPY vs 200MA</p>
                  <p className={`font-mono text-2xl font-bold ${marketData.spy_above_200ma ? 'text-green-400' : 'text-red-400'}`}>
                    {marketData.spy_above_200ma ? '上方' : '下方'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {marketData.spy_distance_to_200ma > 0 ? '+' : ''}{marketData.spy_distance_to_200ma.toFixed(1)}%
                  </p>
                </div>

                {/* VIX Level */}
                <div 
                  className="glass-card rounded-xl p-4 text-center"
                  style={{
                    border: marketData.vix < 25 ? '1px solid #00ff9d50' : marketData.vix < 30 ? '1px solid #ffd70050' : '1px solid #ff004050'
                  }}
                >
                  <p className="text-xs text-gray-500 mb-1">VIX 恐慌指數</p>
                  <p className={`font-mono text-2xl font-bold ${marketData.vix < 20 ? 'text-green-400' : marketData.vix < 25 ? 'text-yellow-400' : marketData.vix < 30 ? 'text-orange-400' : 'text-red-400'}`}>
                    {marketData.vix}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {marketData.vix < 20 ? '低波動' : marketData.vix < 25 ? '正常' : marketData.vix < 30 ? '謹慎' : '高風險'}
                  </p>
                </div>

                {/* New Longs Allowed */}
                <div 
                  className="glass-card rounded-xl p-4 text-center"
                  style={{
                    border: marketData.allow_new_longs ? '1px solid #00ff9d50' : '1px solid #ff004050'
                  }}
                >
                  <p className="text-xs text-gray-500 mb-1">新倉位建議</p>
                  <p className={`font-mono text-xl font-bold ${marketData.allow_new_longs ? 'text-green-400' : 'text-red-400'}`}>
                    {marketData.allow_new_longs ? '允許做多' : '觀望為主'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {marketData.allow_new_longs ? '市場條件良好' : '等待更好時機'}
                  </p>
                </div>

                {/* Position Size */}
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">倉位調整</p>
                  <p 
                    className="font-mono text-2xl font-bold"
                    style={{ color: marketData.position_size_multiplier >= 1 ? '#00ff9d' : marketData.position_size_multiplier >= 0.75 ? '#ffd700' : marketData.position_size_multiplier >= 0.5 ? '#ff6b35' : '#ff0040' }}
                  >
                    {Math.round(marketData.position_size_multiplier * 100)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {marketData.reduce_position_size ? '減少倉位' : '正常倉位'}
                  </p>
                </div>
              </div>
            </div>

            {/* Trading Rules */}
            <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                當前市場交易規則:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className={`flex items-center gap-2 ${marketData.allow_new_longs ? 'text-green-400' : 'text-red-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${marketData.allow_new_longs ? 'bg-green-400' : 'bg-red-400'}`} />
                  {marketData.allow_new_longs ? '✓ 可以建立新多頭倉位' : '✗ 暫停建立新多頭倉位'}
                </div>
                <div className={`flex items-center gap-2 ${!marketData.reduce_position_size ? 'text-green-400' : 'text-yellow-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${!marketData.reduce_position_size ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  {marketData.reduce_position_size ? `⚠ 建議倉位減至 ${Math.round(marketData.position_size_multiplier * 100)}%` : '✓ 正常使用標準倉位'}
                </div>
                <div className={`flex items-center gap-2 ${marketData.spy_above_200ma ? 'text-green-400' : 'text-red-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${marketData.spy_above_200ma ? 'bg-green-400' : 'bg-red-400'}`} />
                  {marketData.spy_above_200ma ? '✓ SPY 處於200日均線上方 (牛市)' : '✗ SPY 跌破200日均線 (熊市)'}
                </div>
                <div className={`flex items-center gap-2 ${marketData.vix < 25 ? 'text-green-400' : marketData.vix < 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${marketData.vix < 25 ? 'bg-green-400' : marketData.vix < 30 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                  {marketData.vix < 25 ? '✓ VIX 正常 (< 25)' : marketData.vix < 30 ? '⚠ VIX 偏高 (25-30)' : '✗ VIX 過高 (> 30) - 減少交易'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market Scores Grid */}
      {marketScores && (
        <section className="px-6 mb-8">
          <h2 className="font-display text-xl text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" style={{ color: '#00f0ff' }} />
            市場指標評分
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MarketScoreCard 
              title="整體評分" 
              score={marketScores.overall.score} 
              signal={marketScores.overall.signal}
              icon={Target}
            />
            <MarketScoreCard 
              title="VIX 恐慌指數" 
              score={marketScores.vix.score} 
              signal={marketScores.vix.signal}
              icon={Activity}
              rawValue={marketScores.vix.rawValue}
              rawLabel="VIX"
            />
            <MarketScoreCard 
              title="恐懼貪婪指數" 
              score={marketScores.fearGreed.score} 
              signal={marketScores.fearGreed.signal}
              icon={BarChart3}
              rawValue={marketScores.fearGreed.rawValue}
              rawLabel="指數"
            />
            <MarketScoreCard 
              title="市場廣度" 
              score={marketScores.breadth.score} 
              signal={marketScores.breadth.signal}
              icon={TrendingUp}
              rawValue={marketScores.breadth.rawValue}
              rawLabel="新高比例"
            />
            <MarketScoreCard 
              title="SPY 趨勢" 
              score={marketScores.spyTrend.score} 
              signal={marketScores.spyTrend.signal}
              icon={marketData.spy_above_10m ? TrendingUp : TrendingDown}
            />
          </div>
        </section>
      )}

      {/* CNN Fear & Greed */}
      <section className="px-6 mb-8">
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6" style={{ color: marketData.fear_greed_index >= 75 ? '#ff0040' : marketData.fear_greed_index >= 50 ? '#ffd700' : '#00ff9d' }} />
            <h2 className="font-display text-xl text-white tracking-wider">CNN 恐懼貪婪指數</h2>
            <span 
              className="px-3 py-1 rounded-full text-sm font-bold"
              style={{ 
                background: `${marketData.fear_greed_index >= 75 ? '#ff0040' : marketData.fear_greed_index >= 50 ? '#ffd700' : '#00ff9d'}20`, 
                color: marketData.fear_greed_index >= 75 ? '#ff0040' : marketData.fear_greed_index >= 50 ? '#ffd700' : '#00ff9d', 
                border: `1px solid ${marketData.fear_greed_index >= 75 ? '#ff0040' : marketData.fear_greed_index >= 50 ? '#ffd700' : '#00ff9d'}40` 
              }}
            >
              {marketData.fear_greed_index}
            </span>
          </div>
          
          {/* Main Progress Bar */}
          <div className="relative h-6 rounded-full overflow-hidden mb-4"
            style={{ background: 'linear-gradient(90deg, #ff0040 0%, #ff6b35 25%, #ffd700 50%, #00f0ff 75%, #00ff9d 100%)' }}
          >
            <div 
              className="absolute top-0 w-1 h-full bg-white"
              style={{ left: `${marketData.fear_greed_index}%`, boxShadow: '0 0 10px white' }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 font-mono mb-6">
            <span className="text-red-400">極度恐懼</span>
            <span style={{ color: marketData.fear_greed_index >= 75 ? '#00ff9d' : marketData.fear_greed_index >= 50 ? '#ffd700' : '#ff0040' }}>{marketData.fear_greed_status}</span>
            <span className="text-green-400">極度貪婪</span>
          </div>
          
          {/* Historical Data */}
          {marketData.fear_greed_history && Object.keys(marketData.fear_greed_history).length > 0 && (
            <div className="mb-8">
              <h3 className="font-display text-sm text-gray-400 mb-3">歷史數據</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {marketData.fear_greed_history.previous_close !== undefined && (
                  <div className="glass-card rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">前收盤</div>
                    <div className={`font-mono text-xl font-bold ${marketData.fear_greed_history.previous_close >= 75 ? 'text-green-400' : marketData.fear_greed_history.previous_close >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {marketData.fear_greed_history.previous_close}
                    </div>
                  </div>
                )}
                {marketData.fear_greed_history['1_week'] !== undefined && (
                  <div className="glass-card rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">1週前</div>
                    <div className={`font-mono text-xl font-bold ${marketData.fear_greed_history['1_week'] >= 75 ? 'text-green-400' : marketData.fear_greed_history['1_week'] >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {marketData.fear_greed_history['1_week']}
                    </div>
                  </div>
                )}
                {marketData.fear_greed_history['1_month'] !== undefined && (
                  <div className="glass-card rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">1月前</div>
                    <div className={`font-mono text-xl font-bold ${marketData.fear_greed_history['1_month'] >= 75 ? 'text-green-400' : marketData.fear_greed_history['1_month'] >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {marketData.fear_greed_history['1_month']}
                    </div>
                  </div>
                )}
                {marketData.fear_greed_history['1_year'] !== undefined && (
                  <div className="glass-card rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">1年前</div>
                    <div className={`font-mono text-xl font-bold ${marketData.fear_greed_history['1_year'] >= 75 ? 'text-green-400' : marketData.fear_greed_history['1_year'] >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {marketData.fear_greed_history['1_year']}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 7 Sub-Indicators */}
          {marketData.fear_greed_indicators && Object.keys(marketData.fear_greed_indicators).length > 0 && (
            <div>
              <h3 className="font-display text-sm text-gray-400 mb-4">7大子指標</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(marketData.fear_greed_indicators).map(([key, indicator]: [string, { label: string; score: number; status: string }]) => {
                  const score = indicator.score;
                  const getColor = (s: number) => {
                    if (s >= 75) return '#00ff9d';
                    if (s >= 60) return '#ffd700';
                    if (s >= 40) return '#00f0ff';
                    if (s >= 25) return '#ff6b35';
                    return '#ff0040';
                  };
                  const color = getColor(score);
                  
                  return (
                    <div key={key} className="glass-card rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">{indicator.label}</span>
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                        >
                          {score}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${score}%`, 
                            background: `linear-gradient(90deg, ${color}, ${color}80)`
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{indicator.status}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Market Breadth */}
      <section className="px-6 mb-8">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="font-display text-xl text-white mb-6 flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: '#00ff9d' }} />
            市場廣度指標
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* New Highs/Lows */}
            <div className="glass-card rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-3">NYSE 新高/新低</p>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="font-mono text-3xl font-bold text-green-400">{marketData.nyse_new_highs}</p>
                  <p className="text-xs text-gray-500">新高</p>
                </div>
                <div className="text-2xl text-gray-600">/</div>
                <div className="text-center">
                  <p className="font-mono text-3xl font-bold text-red-400">{marketData.nyse_new_lows}</p>
                  <p className="text-xs text-gray-500">新低</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-green-400"
                    style={{ width: `${(marketData.nyse_new_highs / (marketData.nyse_new_highs + marketData.nyse_new_lows + 1)) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-red-400"
                    style={{ width: `${(marketData.nyse_new_lows / (marketData.nyse_new_highs + marketData.nyse_new_lows + 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Advance/Decline */}
            <div className="glass-card rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-3">漲跌家數</p>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="font-mono text-3xl font-bold text-green-400">{marketData.nyse_advance}</p>
                  <p className="text-xs text-gray-500">上漲</p>
                </div>
                <div className="text-2xl text-gray-600">/</div>
                <div className="text-center">
                  <p className="font-mono text-3xl font-bold text-red-400">{marketData.nyse_decline}</p>
                  <p className="text-xs text-gray-500">下跌</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-green-400"
                    style={{ width: `${(marketData.nyse_advance / (marketData.nyse_advance + marketData.nyse_decline + 1)) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-red-400"
                    style={{ width: `${(marketData.nyse_decline / (marketData.nyse_advance + marketData.nyse_decline + 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* % Above MA */}
            <div className="glass-card rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-3">高於移動平均線</p>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="font-mono text-3xl font-bold text-cyan-400">{marketData.stocks_above_sma50}%</p>
                  <p className="text-xs text-gray-500">高於50日MA</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-3xl font-bold text-purple-400">{marketData.stocks_above_sma200}%</p>
                  <p className="text-xs text-gray-500">高於200日MA</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0, 240, 255, 0.2)' }}>
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${marketData.stocks_above_sma50}%` }} />
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(191, 90, 242, 0.2)' }}>
                  <div className="h-full bg-purple-400 rounded-full" style={{ width: `${marketData.stocks_above_sma200}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SPY Trend */}
      <section className="px-6 mb-8">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="font-display text-xl text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: '#00f0ff' }} />
            SPY 趨勢分析
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-xl p-5 text-center">
              <p className="text-sm text-gray-500 mb-2">10個月移動平均</p>
              <p className="font-mono text-2xl font-bold text-white">${marketData.spy_sma_10m.toFixed(2)}</p>
              <div className={`flex items-center justify-center gap-1 mt-2 ${marketData.spy_above_10m ? 'text-green-400' : 'text-red-400'}`}>
                {marketData.spy_above_10m ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span className="text-sm">{marketData.spy_above_10m ? '高於均線' : '低於均線'}</span>
              </div>
            </div>
            <div className="glass-card rounded-xl p-5 text-center">
              <p className="text-sm text-gray-500 mb-2">RSI (14)</p>
              <p className={`font-mono text-2xl font-bold ${marketData.spy_rsi_14 > 70 ? 'text-red-400' : marketData.spy_rsi_14 < 30 ? 'text-green-400' : 'text-white'}`}>
                {Math.round(marketData.spy_rsi_14)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {marketData.spy_rsi_14 > 70 ? '超買區域' : marketData.spy_rsi_14 < 30 ? '超賣區域' : '中性區域'}
              </p>
            </div>
            <div className="glass-card rounded-xl p-5 text-center">
              <p className="text-sm text-gray-500 mb-2">趨勢信號</p>
              <div 
                className="px-4 py-2 rounded-xl font-display text-lg inline-block"
                style={{
                  background: marketData.spy_above_10m ? 'rgba(0, 255, 157, 0.2)' : 'rgba(255, 0, 64, 0.2)',
                  color: marketData.spy_above_10m ? '#00ff9d' : '#ff0040',
                  border: `1px solid ${marketData.spy_above_10m ? '#00ff9d' : '#ff0040'}40`
                }}
              >
                {marketData.spy_above_10m ? '上升趨勢' : '下降趨勢'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Volume Stocks */}
      <section className="px-6">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="font-display text-xl text-white mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5" style={{ color: '#bf5af2' }} />
            熱門股票 (按美元成交量)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {topStocks.map((stock) => (
              <div 
                key={stock.ticker}
                className="glass-card rounded-xl p-4 cursor-pointer hover:border-cyan-400/50 transition-all"
                onClick={() => setSelectedStock(stock.ticker)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-white">{stock.ticker}</span>
                  <span className={`text-xs ${stock.vs_smh_20d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    vs SMH {stock.vs_smh_20d > 0 ? '+' : ''}{stock.vs_smh_20d.toFixed(1)}%
                  </span>
                </div>
                <div className="font-mono text-cyan-400">{formatDollarVolume(stock.dollar_volume)}</div>
                <div className={`text-sm ${stock.price_change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercentage(stock.price_change_pct)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
