import { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Share2, TrendingUp, TrendingDown, AlertTriangle, Zap, Target } from 'lucide-react';
import type { StockData } from '../context/StockContext';

interface ShareCardProps {
  stock: StockData;
  type: 'analysis' | 'risk' | 'options' | 'volume';
}

// Calculate risk score (0-100, higher = more risky)
const calculateRiskScore = (stock: StockData): number => {
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

export default function ShareCard({ stock, type }: ShareCardProps) {
  const shareRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!shareRef.current) return;
    
    try {
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: '#0a0c10',
        scale: 3,
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `${stock.ticker}-${type}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error('Failed to generate image:', err);
    }
  };

  const riskScore = calculateRiskScore(stock);

  const getTypeConfig = () => {
    switch (type) {
      case 'risk':
        return {
          title: '風險預警',
          subtitle: 'RISK ALERT',
          color: riskScore > 60 ? '#ff0040' : riskScore > 40 ? '#ffd700' : '#00ff9d',
          icon: AlertTriangle,
          highlight: riskScore > 60 ? '高風險警示' : riskScore > 40 ? '中等風險' : '風險可控'
        };
      case 'options':
        return {
          title: '期權策略',
          subtitle: 'OPTIONS STRATEGY',
          color: '#bf5af2',
          icon: Zap,
          highlight: stock.perf_20d > 0 ? '看漲策略' : '看跌策略'
        };
      case 'volume':
        return {
          title: '量能篩選',
          subtitle: 'VOLUME SCREENER',
          color: '#00ff9d',
          icon: Target,
          highlight: `評分: ${stock.total_score}`
        };
      default:
        return {
          title: '戰術分析',
          subtitle: 'TACTICAL ANALYSIS',
          color: stock.price_change_pct >= 0 ? '#00ff9d' : '#ff0040',
          icon: stock.price_change_pct >= 0 ? TrendingUp : TrendingDown,
          highlight: `評分: ${stock.total_score}`
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <>
      <button 
        onClick={handleShare}
        className="btn-secondary flex items-center gap-2"
      >
        <Share2 className="w-4 h-4" />
        分享
      </button>

      {/* Hidden Share Card */}
      <div className="fixed -left-[9999px]" ref={shareRef}>
        <div 
          className="relative overflow-hidden"
          style={{
            width: '1080px',
            height: '1350px',
            background: 'linear-gradient(180deg, #0a0c10 0%, #11141a 50%, #0a0c10 100%)',
          }}
        >
          {/* Grid Background */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}
          />

          {/* Top Glow */}
          <div 
            className="absolute top-0 left-0 right-0 h-2"
            style={{
              background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
              boxShadow: `0 0 60px ${config.color}`
            }}
          />

          {/* Corner Decorations */}
          <div className="absolute top-8 left-8 w-20 h-20 border-l-2 border-t-2" style={{ borderColor: config.color, opacity: 0.5 }} />
          <div className="absolute top-8 right-8 w-20 h-20 border-r-2 border-t-2" style={{ borderColor: config.color, opacity: 0.5 }} />
          <div className="absolute bottom-8 left-8 w-20 h-20 border-l-2 border-b-2" style={{ borderColor: config.color, opacity: 0.5 }} />
          <div className="absolute bottom-8 right-8 w-20 h-20 border-r-2 border-b-2" style={{ borderColor: config.color, opacity: 0.5 }} />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col p-16">
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
              <div>
                <div className="font-mono text-sm tracking-widest mb-2" style={{ color: config.color }}>
                  {config.subtitle}
                </div>
                <div className="font-display text-4xl text-white tracking-wider">
                  {config.title}
                </div>
              </div>
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${config.color}30 0%, ${config.color}10 100%)`,
                  border: `2px solid ${config.color}50`,
                  boxShadow: `0 0 40px ${config.color}40`
                }}
              >
                <Icon className="w-10 h-10" style={{ color: config.color }} />
              </div>
            </div>

            {/* Main Ticker */}
            <div className="text-center mb-12">
              <div 
                className="font-display text-[12rem] font-black text-white leading-none tracking-tighter"
                style={{ textShadow: `0 0 80px ${config.color}50` }}
              >
                {stock.ticker}
              </div>
              <div className="font-mono text-2xl text-gray-400 mt-4">
                {stock.name}
              </div>
            </div>

            {/* Price Section */}
            <div className="flex items-center justify-center gap-8 mb-12">
              <div className="text-center">
                <div className="font-mono text-6xl font-bold text-white">
                  ${stock.price.toFixed(2)}
                </div>
                <div 
                  className="font-mono text-3xl mt-2"
                  style={{ color: stock.price_change_pct >= 0 ? '#00ff9d' : '#ff0040' }}
                >
                  {stock.price_change_pct >= 0 ? '+' : ''}{stock.price_change_pct.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Highlight Badge */}
            <div className="flex justify-center mb-12">
              <div 
                className="px-12 py-6 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${config.color}30 0%, ${config.color}10 100%)`,
                  border: `3px solid ${config.color}`,
                  boxShadow: `0 0 60px ${config.color}50`
                }}
              >
                <div className="font-display text-4xl font-bold text-white tracking-wider">
                  {config.highlight}
                </div>
              </div>
            </div>

            {/* Score & Risk Grid */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              {/* Score */}
              <div 
                className="p-8 rounded-2xl text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(0, 240, 255, 0.02) 100%)',
                  border: '2px solid rgba(0, 240, 255, 0.3)',
                  boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)'
                }}
              >
                <div className="font-mono text-xl text-gray-400 mb-4">綜合評分</div>
                <div 
                  className="font-display text-8xl font-black"
                  style={{ 
                    color: stock.total_score >= 70 ? '#00ff9d' : stock.total_score >= 50 ? '#ffd700' : '#ff0040',
                    textShadow: `0 0 40px ${stock.total_score >= 70 ? '#00ff9d' : stock.total_score >= 50 ? '#ffd700' : '#ff0040'}50`
                  }}
                >
                  {stock.total_score}
                </div>
                <div className="font-mono text-lg text-gray-500 mt-2">/ 100</div>
              </div>

              {/* Risk Score */}
              <div 
                className="p-8 rounded-2xl text-center"
                style={{
                  background: riskScore > 60 
                    ? 'linear-gradient(135deg, rgba(255, 0, 64, 0.1) 0%, rgba(255, 0, 64, 0.02) 100%)'
                    : riskScore > 40
                      ? 'linear-gradient(135deg, rgba(255, 184, 0, 0.1) 0%, rgba(255, 184, 0, 0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(0, 255, 157, 0.1) 0%, rgba(0, 255, 157, 0.02) 100%)',
                  border: `2px solid ${riskScore > 60 ? '#ff0040' : riskScore > 40 ? '#ffd700' : '#00ff9d'}40`,
                  boxShadow: `0 0 40px ${riskScore > 60 ? '#ff0040' : riskScore > 40 ? '#ffd700' : '#00ff9d'}20`
                }}
              >
                <div className="font-mono text-xl text-gray-400 mb-4">風險分數</div>
                <div 
                  className="font-display text-8xl font-black"
                  style={{ 
                    color: riskScore > 60 ? '#ff0040' : riskScore > 40 ? '#ffd700' : '#00ff9d',
                    textShadow: `0 0 40px ${riskScore > 60 ? '#ff0040' : riskScore > 40 ? '#ffd700' : '#00ff9d'}50`
                  }}
                >
                  {riskScore}
                </div>
                <div className="font-mono text-lg text-gray-500 mt-2">
                  {riskScore > 60 ? '高風險' : riskScore > 40 ? '中等風險' : '低風險'}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-8 border-t border-cyan-500/20">
              <div className="flex items-center justify-between">
                <div className="font-mono text-lg text-gray-500">
                  TACTICAL TERMINAL v2.0
                </div>
                <div className="font-mono text-lg text-gray-500">
                  {new Date().toLocaleDateString('zh-TW')}
                </div>
              </div>
              <div className="font-mono text-sm text-gray-600 mt-2 text-center">
                ⚠️ 數據僅供參考，不構成投資建議
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
