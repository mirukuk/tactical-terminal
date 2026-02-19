import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  showPatterns?: boolean;
}

interface Pattern {
  type: string;
  index: number;
  description: string;
  bullish: boolean;
}

// Pattern recognition functions
const detectPatterns = (data: CandlestickData[]): Pattern[] => {
  const patterns: Pattern[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];
    
    // Bullish Engulfing
    if (previous.close < previous.open && // Previous bearish
        current.close > current.open && // Current bullish
        current.open <= previous.close && // Open at or below previous close
        current.close >= previous.open) { // Close at or above previous open
      patterns.push({
        type: 'Engulfing',
        index: i,
        description: '看漲吞沒形態 - 強勢反轉信號',
        bullish: true
      });
    }
    
    // Bearish Engulfing
    if (previous.close > previous.open && // Previous bullish
        current.close < current.open && // Current bearish
        current.open >= previous.close && // Open at or above previous close
        current.close <= previous.open) { // Close at or below previous open
      patterns.push({
        type: 'Engulfing',
        index: i,
        description: '看跌吞沒形態 - 弱勢反轉信號',
        bullish: false
      });
    }
    
    // Doji
    const bodySize = Math.abs(current.close - current.open);
    const range = current.high - current.low;
    if (bodySize < range * 0.1 && range > 0) {
      patterns.push({
        type: 'Doji',
        index: i,
        description: '十字星 - 市場猶豫信號',
        bullish: current.close > previous.close
      });
    }
    
    // Hammer
    const lowerShadow = Math.min(current.open, current.close) - current.low;
    const upperShadow = current.high - Math.max(current.open, current.close);
    if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5 && current.close > previous.close * 0.98) {
      patterns.push({
        type: 'Hammer',
        index: i,
        description: '錘子線 - 潛在看漲反轉',
        bullish: true
      });
    }
    
    // Shooting Star
    if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5 && current.close < previous.close * 1.02) {
      patterns.push({
        type: 'Shooting Star',
        index: i,
        description: '射擊之星 - 潛在看跌反轉',
        bullish: false
      });
    }
    
    // Morning Star (3-candle pattern)
    if (i >= 2) {
      const twoBack = data[i - 2];
      if (twoBack.close < twoBack.open && // Bearish
          Math.abs(previous.close - previous.open) < Math.abs(twoBack.close - twoBack.open) * 0.5 && // Small body
          current.close > current.open && // Bullish
          current.close > (twoBack.open + twoBack.close) / 2) {
        patterns.push({
          type: 'Morning Star',
          index: i,
          description: '晨星形態 - 強烈看漲反轉',
          bullish: true
        });
      }
    }
    
    // Evening Star (3-candle pattern)
    if (i >= 2) {
      const twoBack = data[i - 2];
      if (twoBack.close > twoBack.open && // Bullish
          Math.abs(previous.close - previous.open) < Math.abs(twoBack.close - twoBack.open) * 0.5 && // Small body
          current.close < current.open && // Bearish
          current.close < (twoBack.open + twoBack.close) / 2) {
        patterns.push({
          type: 'Evening Star',
          index: i,
          description: '暮星形態 - 強烈看跌反轉',
          bullish: false
        });
      }
    }
  }
  
  return patterns;
};

// Transform candlestick data for Recharts
const transformData = (data: CandlestickData[]) => {
  return data.map((candle, index) => {
    const isBullish = candle.close >= candle.open;
    const bodyTop = Math.max(candle.open, candle.close);
    const bodyBottom = Math.min(candle.open, candle.close);
    const bodyHeight = bodyTop - bodyBottom;
    const upperShadow = candle.high - bodyTop;
    const lowerShadow = bodyBottom - candle.low;
    
    return {
      date: candle.date,
      index,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      isBullish,
      bodyTop,
      bodyBottom,
      bodyHeight,
      upperShadow,
      lowerShadow,
      wickHigh: candle.high,
      wickLow: candle.low,
    };
  });
};

interface TooltipPayloadItem {
  payload: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  const isBullish = data.close >= data.open;
  
  return (
    <div className="bg-[#0a0c10] border border-white/10 rounded-lg p-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2">{data.date}</p>
      <div className="space-y-1 font-mono text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">開:</span>
          <span className={isBullish ? 'text-green-400' : 'text-red-400'}>${data.open.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">高:</span>
          <span className="text-white">${data.high.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">低:</span>
          <span className="text-white">${data.low.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">收:</span>
          <span className={isBullish ? 'text-green-400' : 'text-red-400'}>${data.close.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
          <span className="text-gray-500">成交量:</span>
          <span className="text-cyan-400">{(data.volume / 1000000).toFixed(1)}M</span>
        </div>
      </div>
    </div>
  );
};

export default function CandlestickChart({ data, showPatterns = true }: CandlestickChartProps) {
  const transformedData = useMemo(() => transformData(data), [data]);
  const patterns = useMemo(() => showPatterns ? detectPatterns(data) : [], [data, showPatterns]);
  
  // Get pattern indices for highlighting
  const patternIndices = useMemo(() => 
    new Set(patterns.map(p => p.index)),
    [patterns]
  );

  if (!data.length) return null;

  return (
    <div className="w-full h-full">
      {/* Pattern Legend */}
      {showPatterns && patterns.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {patterns.slice(-5).map((pattern, i) => (
            <div
              key={i}
              className={`px-3 py-1 rounded-full text-xs font-mono border ${
                pattern.bullish 
                  ? 'bg-green-400/10 border-green-400/30 text-green-400' 
                  : 'bg-red-400/10 border-red-400/30 text-red-400'
              }`}
            >
              {pattern.type}: {pattern.description}
            </div>
          ))}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={transformedData}>
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
            tickFormatter={(value: number) => `$${value.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Candlestick bodies as bars */}
          <Bar 
            dataKey="bodyTop" 
            barSize={12}
            fill="#00ff9d"
            stroke="#00ff9d"
          >
            {transformedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isBullish ? '#00ff9d' : '#ff0040'}
                stroke={entry.isBullish ? '#00ff9d' : '#ff0040'}
                fillOpacity={patternIndices.has(index) ? 1 : 0.8}
              />
            ))}
          </Bar>
          
          {/* Pattern highlighting */}
          {showPatterns && patterns.map((pattern, i) => (
            <ReferenceLine
              key={`pattern-${i}`}
              x={transformedData[pattern.index]?.date}
              stroke={pattern.bullish ? '#00ff9d' : '#ff0040'}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
