import { useState } from 'react';
import { Edit3, Plus, X, Search, Check } from 'lucide-react';

interface StockEditorProps {
  tickers: string[];
  onTickersChange: (tickers: string[]) => void;
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
}

export default function StockEditor({ tickers, onTickersChange, selectedTicker, onSelectTicker }: StockEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTicker, setNewTicker] = useState('');

  const handleAddTicker = () => {
    const ticker = newTicker.trim().toUpperCase();
    if (ticker && !tickers.includes(ticker)) {
      onTickersChange([...tickers, ticker]);
      setNewTicker('');
    }
  };

  const handleRemoveTicker = (ticker: string) => {
    const newTickers = tickers.filter(t => t !== ticker);
    onTickersChange(newTickers);
    if (selectedTicker === ticker && newTickers.length > 0) {
      onSelectTicker(newTickers[0]);
    }
  };

  return (
    <div className="glass-panel rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4" style={{ color: '#00f0ff' }} />
          <span className="font-display text-sm tracking-wide text-white">股票列表</span>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs font-mono px-3 py-1 rounded-lg transition-all"
          style={{ 
            color: isEditing ? '#00ff9d' : '#00f0ff',
            border: `1px solid ${isEditing ? 'rgba(0, 255, 157, 0.3)' : 'rgba(0, 240, 255, 0.3)'}`,
            background: isEditing ? 'rgba(0, 255, 157, 0.1)' : 'rgba(0, 240, 255, 0.05)'
          }}
        >
          {isEditing ? '完成' : '編輯'}
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {tickers.map((ticker) => (
          <div 
            key={ticker}
            onClick={() => onSelectTicker(ticker)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
              selectedTicker === ticker 
                ? 'border-cyan-400/50' 
                : 'border-white/10 hover:border-cyan-400/30'
            }`}
            style={{
              background: selectedTicker === ticker 
                ? 'linear-gradient(145deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)' 
                : 'rgba(255, 255, 255, 0.03)'
            }}
          >
            <span className="font-mono font-bold text-sm" style={{ color: selectedTicker === ticker ? '#00f0ff' : '#fff' }}>
              {ticker}
            </span>
            {isEditing && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleRemoveTicker(ticker); }}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {selectedTicker === ticker && !isEditing && (
              <Check className="w-3 h-3" style={{ color: '#00f0ff' }} />
            )}
          </div>
        ))}
      </div>
      
      {isEditing && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTicker()}
              placeholder="輸入股票代碼..."
              className="input-modern w-full pl-10"
            />
          </div>
          <button 
            onClick={handleAddTicker}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加
          </button>
        </div>
      )}
    </div>
  );
}
