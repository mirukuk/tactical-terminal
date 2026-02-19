import { useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';

interface RSDataPoint {
  date: string;
  stockPrice: number;
  spyPrice: number;
  rsLine: number; // Relative Strength line
  stockNormalized: number; // Normalized to start at 100
  spyNormalized: number; // Normalized to start at 100
}

interface RelativeStrengthChartProps {
  stockData: { date: string; close: number }[];
  spyData: { date: string; close: number }[];
  stockTicker: string;
}

// Calculate trendline
const calculateTrendline = (data: RSDataPoint[]): { slope: number; intercept: number; r2: number } => {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((sum, d) => sum + d.rsLine, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  let ssTotal = 0;
  let ssResidual = 0;
  
  data.forEach((d, i) => {
    const x = i;
    const y = d.rsLine;
    numerator += (x - xMean) * (y - yMean);
    denominator += Math.pow(x - xMean, 2);
  });
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Calculate R-squared
  data.forEach((d, i) => {
    const x = i;
    const predicted = slope * x + intercept;
    ssTotal += Math.pow(d.rsLine - yMean, 2);
    ssResidual += Math.pow(d.rsLine - predicted, 2);
  });
  
  const r2 = ssTotal !== 0 ? 1 - (ssResidual / ssTotal) : 0;
  
  return { slope, intercept, r2 };
};

// Detect trendline breaks
const detectTrendlineBreaks = (
  data: RSDataPoint[],
  trendline: { slope: number; intercept: number },
  threshold: number = 2
): { index: number; type: 'breakup' | 'breakdown'; strength: number }[] => {
  const breaks: { index: number; type: 'breakup' | 'breakdown'; strength: number }[] = [];
  
  data.forEach((d, i) => {
    const predicted = trendline.slope * i + trendline.intercept;
    const deviation = d.rsLine - predicted;
    
    if (Math.abs(deviation) > threshold) {
      breaks.push({
        index: i,
        type: deviation > 0 ? 'breakup' : 'breakdown',
        strength: Math.abs(deviation)
      });
    }
  });
  
  return breaks;
};

interface TooltipPayloadItem {
  payload: {
    stockNormalized: number;
    spyNormalized: number;
    rsLine: number;
  };
}

const CustomTooltip = ({ 
  active, 
  payload, 
  label,
  stockTicker 
}: { 
  active?: boolean; 
  payload?: TooltipPayloadItem[]; 
  label?: string;
  stockTicker: string;
}) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="bg-[#0a0c10] border border-white/10 rounded-lg p-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2">{label}</p>
      <div className="space-y-1 font-mono text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-cyan-400">{stockTicker}:</span>
          <span className="text-white">{data.stockNormalized.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-yellow-400">SPY:</span>
          <span className="text-white">{data.spyNormalized.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
          <span className="text-gray-500">相對強度:</span>
          <span className={data.rsLine >= 0 ? 'text-green-400' : 'text-red-400'}>
            {data.rsLine >= 0 ? '+' : ''}{data.rsLine.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default function RelativeStrengthChart({ 
  stockData, 
  spyData, 
  stockTicker 
}: RelativeStrengthChartProps) {
  const chartData = useMemo(() => {
    // Merge data by date
    const merged: RSDataPoint[] = [];
    const spyMap = new Map(spyData.map(d => [d.date, d.close]));
    
    stockData.forEach(stockPoint => {
      const spyPrice = spyMap.get(stockPoint.date);
      if (spyPrice) {
        merged.push({
          date: stockPoint.date,
          stockPrice: stockPoint.close,
          spyPrice: spyPrice,
          rsLine: 0,
          stockNormalized: 0,
          spyNormalized: 0
        });
      }
    });
    
    if (merged.length === 0) return [];
    
    // Normalize to start at 100
    const startStock = merged[0].stockPrice;
    const startSpy = merged[0].spyPrice;
    
    merged.forEach(d => {
      d.stockNormalized = (d.stockPrice / startStock) * 100;
      d.spyNormalized = (d.spyPrice / startSpy) * 100;
      d.rsLine = d.stockNormalized - d.spyNormalized;
    });
    
    return merged;
  }, [stockData, spyData]);
  
  const trendline = useMemo(() => {
    if (chartData.length < 10) return { slope: 0, intercept: 0, r2: 0 };
    return calculateTrendline(chartData);
  }, [chartData]);
  
  const trendlineData = useMemo(() => {
    return chartData.map((d, i) => ({
      ...d,
      trendline: trendline.slope * i + trendline.intercept
    }));
  }, [chartData, trendline]);
  
  const trendlineBreaks = useMemo(() => {
    if (chartData.length < 10) return [];
    return detectTrendlineBreaks(chartData, trendline, 3);
  }, [chartData, trendline]);
  
  // Get recent trend direction
  const recentTrend = useMemo(() => {
    if (chartData.length < 10) return null;
    const recent = chartData.slice(-10);
    const startAvg = recent.slice(0, 5).reduce((s, d) => s + d.rsLine, 0) / 5;
    const endAvg = recent.slice(-5).reduce((s, d) => s + d.rsLine, 0) / 5;
    return {
      direction: endAvg > startAvg ? 'up' : 'down',
      strength: Math.abs(endAvg - startAvg)
    };
  }, [chartData]);

  if (!chartData.length) return null;

  return (
    <div className="w-full h-full">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-400" />
            <span className="text-xs text-gray-400">{stockTicker}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="text-xs text-gray-400">SPY</span>
          </div>
        </div>
        
        {recentTrend && (
          <div className={`text-xs font-mono px-2 py-1 rounded ${
            recentTrend.direction === 'up' 
              ? 'bg-green-400/10 text-green-400' 
              : 'bg-red-400/10 text-red-400'
          }`}>
            近期趨勢: {recentTrend.direction === 'up' ? '↑ 強於大盤' : '↓ 弱於大盤'}
          </div>
        )}
      </div>
      
      {/* Trendline breaks alert */}
      {trendlineBreaks.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {trendlineBreaks.slice(-3).map((brk, i) => (
            <div
              key={i}
              className={`px-2 py-1 rounded text-xs font-mono ${
                brk.type === 'breakup' 
                  ? 'bg-green-400/10 text-green-400' 
                  : 'bg-red-400/10 text-red-400'
              }`}
            >
              {brk.type === 'breakup' ? '↑' : '↓'} 趨勢線突破
            </div>
          ))}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={trendlineData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1d26" />
          <XAxis 
            dataKey="date" 
            stroke="#5a6470" 
            fontSize={11}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis 
            stroke="#5a6470" 
            fontSize={11}
            domain={['auto', 'auto']}
            tickFormatter={(value: number) => value.toFixed(0)}
          />
          <Tooltip 
            content={<CustomTooltip stockTicker={stockTicker} />}
            contentStyle={{ background: '#0a0c10', border: '1px solid #1a1d26', borderRadius: '8px' }}
          />
          
          {/* SPY Line */}
          <Line
            type="monotone"
            dataKey="spyNormalized"
            stroke="#fbbf24"
            strokeWidth={2}
            dot={false}
            name="SPY"
          />
          
          {/* Stock Line */}
          <Line
            type="monotone"
            dataKey="stockNormalized"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={false}
            name={stockTicker}
          />
          
          {/* Relative Strength Area */}
          <Area
            type="monotone"
            dataKey="rsLine"
            fill="#8b5cf6"
            fillOpacity={0.1}
            stroke="#8b5cf6"
            strokeWidth={1}
            strokeDasharray="5 5"
            name="RS Line"
          />
          
          {/* Trendline */}
          <Line
            type="linear"
            dataKey="trendline"
            stroke="#ffffff"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            opacity={0.5}
          />
          
          {/* Zero line */}
          <ReferenceLine y={100} stroke="#5a6470" strokeDasharray="3 3" strokeOpacity={0.5} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}


