import { useMemo, useState } from 'react';

interface HeatmapStock {
  ticker: string;
  name: string;
  price: number;
  price_change_pct: number;
  perf_20d: number;
  perf_60d: number;
  vs_smh_20d: number;
  total_score: number;
  dollar_volume: number;
  volatility: number;
  rating: string;
}

interface HeatMapProps {
  stocks: HeatmapStock[];
  metric?: 'perf_20d' | 'perf_60d' | 'vs_smh_20d' | 'total_score' | 'price_change_pct';
  groupBy?: 'sector' | 'rating' | 'performance';
  onStockClick?: (ticker: string) => void;
}

interface GroupedStocks {
  name: string;
  stocks: HeatmapStock[];
  avgValue: number;
}

const getPerformanceColor = (value: number, min: number, max: number): string => {
  const range = max - min;
  if (range === 0) return '#334155';
  
  const normalized = (value - min) / range;
  
  if (normalized > 0.7) {
    // Strong green
    return `rgb(${Math.floor(0 + (1 - normalized) * 100)}, ${Math.floor(200 + normalized * 55)}, ${Math.floor(100 + (1 - normalized) * 50)})`;
  } else if (normalized > 0.5) {
    // Light green
    return `rgb(${Math.floor(50 + (1 - normalized) * 150)}, ${Math.floor(180 + normalized * 40)}, ${Math.floor(100 + (1 - normalized) * 100)})`;
  } else if (normalized > 0.3) {
    // Yellow/Green mix
    return `rgb(${Math.floor(150 + (1 - normalized) * 105)}, ${Math.floor(180 + normalized * 20)}, ${Math.floor(50 + (1 - normalized) * 100)})`;
  } else if (normalized > 0.15) {
    // Yellow
    return `rgb(${Math.floor(200 + normalized * 55)}, ${Math.floor(180 + normalized * 20)}, ${Math.floor(50 + normalized * 50)})`;
  } else if (normalized > 0) {
    // Light red
    return `rgb(${Math.floor(220 + (1 - normalized) * 35)}, ${Math.floor(100 + normalized * 80)}, ${Math.floor(80 + normalized * 70)})`;
  } else {
    // Strong red
    return `rgb(${Math.floor(220 + normalized * 100)}, ${Math.floor(50 + normalized * 150)}, ${Math.floor(60 + normalized * 100)})`;
  }
};

const getPerformanceLabel = (metric: string): string => {
  const labels: Record<string, string> = {
    perf_20d: '20日表現',
    perf_60d: '60日表現',
    vs_smh_20d: '相對 SMH 強弱',
    total_score: '綜合評分',
    price_change_pct: '日內漲跌'
  };
  return labels[metric] || metric;
};

const groupStocks = (stocks: HeatmapStock[], groupBy: string): GroupedStocks[] => {
  if (groupBy === 'rating') {
    const groups: Record<string, HeatmapStock[]> = { S: [], A: [], B: [], C: [], D: [], F: [] };
    stocks.forEach(stock => {
      const rating = stock.rating || 'F';
      if (!groups[rating]) groups[rating] = [];
      groups[rating].push(stock);
    });
    
    return Object.entries(groups)
      .filter(([, groupStocks]) => groupStocks.length > 0)
      .map(([name, groupStocks]) => ({
        name: `Rating ${name}`,
        stocks: groupStocks.sort((a, b) => b.total_score - a.total_score),
        avgValue: groupStocks.reduce((s, st) => s + st.total_score, 0) / groupStocks.length
      }))
      .sort((a, b) => b.avgValue - a.avgValue);
  }
  
  if (groupBy === 'performance') {
    const groups: Record<string, HeatmapStock[]> = {
      'Strong': [],
      'Moderate': [],
      'Weak': [],
      'Very Weak': []
    };
    
    stocks.forEach(stock => {
      const perf = stock.perf_20d;
      if (perf > 10) groups['Strong'].push(stock);
      else if (perf > 0) groups['Moderate'].push(stock);
      else if (perf > -10) groups['Weak'].push(stock);
      else groups['Very Weak'].push(stock);
    });
    
    return Object.entries(groups)
      .filter(([, groupStocks]) => groupStocks.length > 0)
      .map(([name, groupStocks]) => ({
        name,
        stocks: groupStocks.sort((a, b) => b.perf_20d - a.perf_20d),
        avgValue: groupStocks.reduce((s, st) => s + st.perf_20d, 0) / groupStocks.length
      }))
      .sort((a, b) => b.avgValue - a.avgValue);
  }
  
  // Default: all stocks in one group
  return [{
    name: 'All Stocks',
    stocks: stocks.sort((a, b) => b.total_score - a.total_score),
    avgValue: stocks.reduce((s, st) => s + st.total_score, 0) / stocks.length
  }];
};

export default function HeatMap({ 
  stocks, 
  metric = 'perf_20d',
  groupBy = 'rating',
  onStockClick 
}: HeatMapProps) {
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  
  const filteredStocks = useMemo(() => {
    return stocks.filter(s => s.dollar_volume > 1000000); // Filter low volume
  }, [stocks]);
  
  const metricValues = useMemo(() => {
    return filteredStocks.map(s => s[metric]);
  }, [filteredStocks, metric]);
  
  const minValue = useMemo(() => Math.min(...metricValues), [metricValues]);
  const maxValue = useMemo(() => Math.max(...metricValues), [metricValues]);
  
  const groupedData = useMemo(() => {
    return groupStocks(filteredStocks, groupBy);
  }, [filteredStocks, groupBy]);
  
  const totalStocks = filteredStocks.length;
  const outperforming = filteredStocks.filter(s => s[metric] > 0).length;
  const underperforming = totalStocks - outperforming;

  return (
    <div className="w-full">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-gray-500 text-xs">指標</span>
            <p className="text-white font-mono">{getPerformanceLabel(metric)}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-xs text-gray-400">跑贏 {outperforming}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-xs text-gray-400">跑輸 {underperforming}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <span className="text-gray-500 text-xs">股票數量</span>
          <p className="text-white font-mono text-xl">{totalStocks}</p>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs text-gray-500">{minValue.toFixed(1)}%</span>
        <div className="flex-1 h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500" />
        <span className="text-xs text-gray-500">{maxValue.toFixed(1)}%</span>
      </div>
      
      {/* Heatmap Grid */}
      <div className="space-y-6 max-h-[500px] overflow-y-auto">
        {groupedData.map(group => (
          <div key={group.name}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-300">{group.name}</h4>
              <span className={`text-xs font-mono ${group.avgValue > 0 ? 'text-green-400' : 'text-red-400'}`}>
                Avg: {group.avgValue > 0 ? '+' : ''}{group.avgValue.toFixed(1)}
              </span>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1">
              {group.stocks.map(stock => {
                const value = stock[metric];
                const color = getPerformanceColor(value, minValue, maxValue);
                const isHovered = hoveredStock === stock.ticker;
                
                return (
                  <div
                    key={stock.ticker}
                    className={`
                      relative p-2 rounded cursor-pointer transition-all duration-200
                      ${isHovered ? 'scale-110 z-10 shadow-lg' : 'hover:scale-105'}
                    `}
                    style={{ backgroundColor: color }}
                    onMouseEnter={() => setHoveredStock(stock.ticker)}
                    onMouseLeave={() => setHoveredStock(null)}
                    onClick={() => onStockClick?.(stock.ticker)}
                  >
                    {/* Ticker */}
                    <div className="text-center">
                      <p className="text-xs font-bold text-white drop-shadow-md">
                        {stock.ticker}
                      </p>
                      
                      {/* Value on hover */}
                      {isHovered && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-[#0a0c10] border border-white/20 rounded-lg shadow-xl z-50 whitespace-nowrap">
                          <p className="text-xs font-bold text-white">{stock.name}</p>
                          <p className={`text-xs font-mono ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {value >= 0 ? '+' : ''}{value.toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">評分: {stock.total_score}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">最強股票</p>
          <p className="font-mono text-sm text-green-400">
            {filteredStocks.length > 0 && filteredStocks.reduce((max, s) => s[metric] > max[metric] ? s : max)[metric].toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600">
            {filteredStocks.length > 0 && filteredStocks.reduce((max, s) => s[metric] > max[metric] ? s : max).ticker}
          </p>
        </div>
        
        <div className="glass-card rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">最弱股票</p>
          <p className="font-mono text-sm text-red-400">
            {filteredStocks.length > 0 && filteredStocks.reduce((min, s) => s[metric] < min[metric] ? s : min)[metric].toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600">
            {filteredStocks.length > 0 && filteredStocks.reduce((min, s) => s[metric] < min[metric] ? s : min).ticker}
          </p>
        </div>
        
        <div className="glass-card rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">平均表現</p>
          <p className={`font-mono text-sm ${(metricValues.reduce((a, b) => a + b, 0) / metricValues.length) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(metricValues.reduce((a, b) => a + b, 0) / metricValues.length).toFixed(1)}%
          </p>
        </div>
        
        <div className="glass-card rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">跑贏比例</p>
          <p className="font-mono text-sm text-cyan-400">
            {((outperforming / totalStocks) * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}

export type { HeatmapStock };
