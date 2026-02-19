import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockData {
  ticker: string;
  name: string;
  price: number;
  price_change: number;
  price_change_pct: number;
  volume: number;
  avg_volume_20: number;
  dollar_volume: number;
  perf_5d?: number;
  perf_20d: number;
  perf_60d: number;
  perf_180d: number;
  vs_smh_5d?: number;
  vs_smh_20d: number;
  vs_smh_60d: number;
  vs_smh_180d: number;
  outperform_all_benchmarks?: boolean;
  recommendation: string;
  rsi: number;
  rsi_14: number;
  sma_50: number;
  sma_200: number;
  above_sma50: boolean;
  above_sma200: boolean;
  volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  macd: number;
  bb_width: number;
  rating: string;
  total_score: number;
  smh_rs: number; // Relative Strength vs SMH
  history: HistoryPoint[];
  ohlc_history?: HistoryPoint[];
}

export interface SpyHistoryPoint {
  date: string;
  close: number;
}

export interface MarketData {
  spy_price: number;
  spy_change_pct: number;
  qqq_price: number;
  qqq_change_pct: number;
  iwm_price: number;
  iwm_change_pct: number;
  vix: number;
  smh_price: number;
  smh_20d: number;
  smh_60d: number;
  smh_180d: number;
  // Market Breadth
  nyse_new_highs: number;
  nyse_new_lows: number;
  nyse_advance: number;
  nyse_decline: number;
  nyse_ad_line: number;
  stocks_above_sma50: number;
  stocks_above_sma200: number;
  // CNN Fear & Greed
  fear_greed_index: number;
  fear_greed_status: string;
  fear_greed_indicators: Record<string, { label: string; score: number; status: string }>;
  fear_greed_history: {
    previous_close?: number;
    '1_week'?: number;
    '1_month'?: number;
    '1_year'?: number;
  };
  // SPY Technical
  spy_sma_10m: number;
  spy_above_10m: boolean;
  spy_rsi_14: number;
  // Market Regime
  regime: string;
  regime_chinese: string;
  regime_color: string;
  trading_mode: string;
  spy_above_200ma: boolean;
  spy_sma_200: number;
  spy_distance_to_200ma: number;
  vix_level: string;
  allow_new_longs: boolean;
  reduce_position_size: boolean;
  position_size_multiplier: number;
  // Overall
  overall_score: number;
  signal: string;
  signal_color: string;
  last_updated: string;
  // SPY History for RS Chart
  spy_history?: SpyHistoryPoint[];
}

interface StockContextType {
  watchlist: string[];
  setWatchlist: (tickers: string[] | ((prev: string[]) => string[])) => void;
  addToWatchlist: (ticker: string) => Promise<void>;
  removeFromWatchlist: (ticker: string) => void;
  selectedStock: string;
  setSelectedStock: (ticker: string) => void;
  stocksData: Record<string, StockData>;
  marketData: MarketData | null;
  loading: boolean;
  refreshData: () => Promise<void>;
  smhData: StockData | null;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

const WATCHLIST_KEY = 'tactical_terminal_watchlist';

export function StockProvider({ children }: { children: ReactNode }) {
  // Load watchlist from localStorage on init
  const [watchlist, setWatchlistState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [stocksData, setStocksData] = useState<Record<string, StockData>>({});
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [smhData, setSmhData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);

  // Save watchlist to localStorage whenever it changes
  const setWatchlist = useCallback((tickers: string[] | ((prev: string[]) => string[])) => {
    setWatchlistState(prev => {
      const newWatchlist = typeof tickers === 'function' ? tickers(prev) : tickers;
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newWatchlist));
      return newWatchlist;
    });
  }, []);

  const addToWatchlist = useCallback(async (ticker: string) => {
    const upperTicker = ticker.toUpperCase();
    setWatchlistState(prev => {
      if (prev.includes(upperTicker)) return prev;
      const newList = [...prev, upperTicker];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newList));
      return newList;
    });
    
    // Fetch stock data if not already in stocksData
    if (!stocksData[upperTicker]) {
      try {
        const response = await fetch(`${API_URL}/api/stock/${upperTicker}`);
        if (response.ok) {
          const data = await response.json();
          setStocksData(prev => ({ ...prev, [upperTicker]: data }));
        }
      } catch (err) {
        console.error(`Failed to fetch ${upperTicker}:`, err);
      }
    }
  }, [stocksData]);

  const removeFromWatchlist = useCallback((ticker: string) => {
    setWatchlistState(prev => {
      const newList = prev.filter(t => t !== ticker);
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newList));
      return newList;
    });
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/all-data`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      
      setStocksData(data.stocks || {});
      setMarketData(data.market || null);
      setSmhData(data.smh || null);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <StockContext.Provider value={{
      watchlist,
      setWatchlist,
      addToWatchlist,
      removeFromWatchlist,
      selectedStock,
      setSelectedStock,
      stocksData,
      marketData,
      loading,
      refreshData,
      smhData,
    }}>
      {children}
    </StockContext.Provider>
  );
}

export function useStockContext() {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStockContext must be used within StockProvider');
  }
  return context;
}
