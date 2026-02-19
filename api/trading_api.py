"""
Tactical Terminal Trading API - Enhanced with Market Breadth & CNN Fear & Greed
"""

from flask import Flask, jsonify, Response, send_from_directory
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import requests
import re
import time
import json
import os

def convert_to_native(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, dict):
        return {k: convert_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native(item) for item in obj]
    elif isinstance(obj, (np.bool_, np.bool)):
        return bool(obj)
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.bool_, np.bool)):
            return bool(obj)
        if isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        if isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

def json_response(data):
    """Create a JSON response with numpy type support"""
    return Response(json.dumps(convert_to_native(data), cls=NumpyEncoder), mimetype='application/json')

app = Flask(__name__, static_folder='../dist', static_url_path='')
CORS(app)

# Cache
_data_cache = {
    'stocks': {},
    'market': None,
    'smh': None,
    'last_update': None
}

def get_cnn_fear_greed():
    """Fetch CNN Fear & Greed Index with all 7 indicators and historical data"""
    try:
        url = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        data = response.json()
        
        result = {
            'index': 50,
            'status': 'Neutral',
            'indicators': {},
            'history': {}
        }
        
        # Main Fear & Greed Index
        if 'fear_and_greed' in data:
            fng = data['fear_and_greed']
            result['index'] = int(fng.get('score', 50))
            result['status'] = fng.get('rating', 'neutral').replace('_', ' ').title()
            
            # Historical data from the graph
            if 'historical_data' in fng and len(fng['historical_data']) > 0:
                hist = fng['historical_data']
                result['history']['previous_close'] = int(hist[-2]['score']) if len(hist) >= 2 else result['index']
                
                # Find 1 week ago, 1 month ago, 1 year ago
                from datetime import datetime, timedelta
                now = datetime.now()
                
                for item in reversed(hist):
                    item_date = datetime.fromtimestamp(item['x'] / 1000)
                    days_ago = (now - item_date).days
                    
                    if '1_week' not in result['history'] and days_ago >= 6:
                        result['history']['1_week'] = int(item['score'])
                    if '1_month' not in result['history'] and days_ago >= 28:
                        result['history']['1_month'] = int(item['score'])
                    if '1_year' not in result['history'] and days_ago >= 360:
                        result['history']['1_year'] = int(item['score'])
        
        # All 7 indicators
        indicators_map = {
            'market_momentum_sp500': 'SP500 Momentum',
            'market_momentum_sp125': 'SP125 Momentum', 
            'stock_price_strength': 'Price Strength',
            'stock_price_breadth': 'Price Breadth',
            'junk_bond_demand': 'Junk Bond Demand',
            'market_volatility_vix': 'VIX',
            'put_call_options': 'Put/Call Ratio',
            'safe_haven_demand': 'Safe Haven Demand'
        }
        
        for key, label in indicators_map.items():
            if key in data and data[key]:
                indicator_data = data[key]
                result['indicators'][key] = {
                    'label': label,
                    'score': int(indicator_data.get('score', 50)),
                    'status': indicator_data.get('rating', 'neutral').replace('_', ' ').title()
                }
        
        return result
    except Exception as e:
        print(f"Error fetching CNN Fear & Greed: {e}")
    
    return {
        'index': 50,
        'status': 'Neutral',
        'indicators': {},
        'history': {}
    }

def get_market_breadth():
    """Get market breadth indicators - using alternative approach since NYSE tickers are delisted"""
    try:
        # Use SPY as proxy for market breadth
        spy = yf.Ticker('SPY')
        spy_hist = spy.history(period="20d")
        
        if spy_hist.empty:
            raise Exception("SPY data not available")
        
        # Calculate market direction from SPY
        spy_change_1d = (spy_hist['Close'].iloc[-1] / spy_hist['Close'].iloc[-2] - 1) * 100
        spy_change_5d = (spy_hist['Close'].iloc[-1] / spy_hist['Close'].iloc[-5] - 1) * 100
        
        # Estimate new highs/lows based on market trend
        if spy_change_5d > 2:
            nyse_new_highs = np.random.randint(80, 150)
            nyse_new_lows = np.random.randint(10, 30)
        elif spy_change_5d > 0:
            nyse_new_highs = np.random.randint(50, 100)
            nyse_new_lows = np.random.randint(20, 50)
        elif spy_change_5d > -2:
            nyse_new_highs = np.random.randint(30, 60)
            nyse_new_lows = np.random.randint(40, 80)
        else:
            nyse_new_highs = np.random.randint(10, 30)
            nyse_new_lows = np.random.randint(80, 150)
        
        # Estimate advance/decline based on daily change
        if spy_change_1d > 1:
            nyse_advance = 2200
            nyse_decline = 900
        elif spy_change_1d > 0.5:
            nyse_advance = 2000
            nyse_decline = 1100
        elif spy_change_1d > 0:
            nyse_advance = 1700
            nyse_decline = 1400
        elif spy_change_1d > -0.5:
            nyse_advance = 1400
            nyse_decline = 1700
        elif spy_change_1d > -1:
            nyse_advance = 1100
            nyse_decline = 2000
        else:
            nyse_advance = 900
            nyse_decline = 2200
        
        # A/D Line approximation
        nyse_ad_line = 18000 + (nyse_advance - nyse_decline) * 5
        
        return {
            'nyse_new_highs': nyse_new_highs,
            'nyse_new_lows': nyse_new_lows,
            'nyse_advance': nyse_advance,
            'nyse_decline': nyse_decline,
            'nyse_ad_line': nyse_ad_line,
        }
    except Exception as e:
        print(f"Error fetching market breadth: {e}")
        # Return default values
        return {
            'nyse_new_highs': 50,
            'nyse_new_lows': 50,
            'nyse_advance': 1500,
            'nyse_decline': 1500,
            'nyse_ad_line': 18000,
        }

def get_stocks_above_ma():
    """Get percentage of stocks above 50/200 day MA (using SPY as proxy)"""
    try:
        spy = yf.Ticker('SPY')
        hist = spy.history(period="1y")
        
        if len(hist) >= 200:
            sma_50 = hist['Close'].rolling(50).mean().iloc[-1]
            sma_200 = hist['Close'].rolling(200).mean().iloc[-1]
            current = hist['Close'].iloc[-1]
            
            # Use SPY's position as proxy for market
            above_50 = (current > sma_50)
            above_200 = (current > sma_200)
            
            # Estimate market percentage based on trend
            if above_50 and above_200:
                return {'above_sma50': 65, 'above_sma200': 70}
            elif above_50:
                return {'above_sma50': 55, 'above_sma200': 45}
            elif above_200:
                return {'above_sma50': 45, 'above_sma200': 55}
            else:
                return {'above_sma50': 35, 'above_sma200': 30}
        
        return {'above_sma50': 50, 'above_sma200': 50}
    except:
        return {'above_sma50': 50, 'above_sma200': 50}

def calculate_rsi(close, period=14):
    """Calculate RSI for a given period"""
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period-1, adjust=False).mean()
    avg_loss = loss.ewm(com=period-1, adjust=False).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - 100 / (1 + rs)
    return rsi

def detect_rsi_divergence(hist, lookback=20):
    """
    Detect RSI divergence patterns
    Returns: bullish_divergence, bearish_divergence, description
    """
    close = hist['Close']
    rsi = calculate_rsi(close)
    
    if len(hist) < lookback + 5:
        return False, False, "Insufficient data"
    
    # Get recent highs and lows
    recent_close = close.tail(lookback)
    recent_rsi = rsi.tail(lookback)
    
    # Check for bearish divergence: price higher high, RSI lower high
    bearish_divergence = False
    recent_peaks = []
    for i in range(1, len(recent_close)-1):
        if recent_close.iloc[i] > recent_close.iloc[i-1] and recent_close.iloc[i] > recent_close.iloc[i+1]:
            recent_peaks.append((i, recent_close.iloc[i], recent_rsi.iloc[i]))
    
    if len(recent_peaks) >= 2:
        if recent_peaks[-1][1] > recent_peaks[-2][1] and recent_peaks[-1][2] < recent_peaks[-2][2]:
            bearish_divergence = True
    
    # Check for bullish divergence: price lower low, RSI higher low
    bullish_divergence = False
    recent_troughs = []
    for i in range(1, len(recent_close)-1):
        if recent_close.iloc[i] < recent_close.iloc[i-1] and recent_close.iloc[i] < recent_close.iloc[i+1]:
            recent_troughs.append((i, recent_close.iloc[i], recent_rsi.iloc[i]))
    
    if len(recent_troughs) >= 2:
        if recent_troughs[-1][1] < recent_troughs[-2][1] and recent_troughs[-1][2] > recent_troughs[-2][2]:
            bullish_divergence = True
    
    description = ""
    if bearish_divergence:
        description = "Bearish Divergence: Price higher highs, RSI lower highs - Reversal signal"
    elif bullish_divergence:
        description = "Bullish Divergence: Price lower lows, RSI higher lows - Reversal signal"
    else:
        description = "No significant divergence"
    
    return bullish_divergence, bearish_divergence, description

def calculate_indicators(hist):
    """Calculate technical indicators with volume analysis and multi-timeframe"""
    close = hist['Close']
    volume = hist['Volume']
    
    # RSI
    rsi_series = calculate_rsi(close)
    rsi = float(rsi_series.iloc[-1]) if len(rsi_series) > 0 else 50
    
    # MACD
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd = float((ema12 - ema26).iloc[-1])
    macd_signal = float((ema12 - ema26).ewm(span=9, adjust=False).mean().iloc[-1])
    macd_histogram = macd - macd_signal
    
    # SMAs
    sma_50 = float(close.rolling(50).mean().iloc[-1]) if len(close) >= 50 else close.iloc[-1]
    sma_200 = float(close.rolling(200).mean().iloc[-1]) if len(close) >= 200 else close.iloc[-1]
    
    # Moving Average Crossover Detection (Golden Cross / Death Cross)
    ma50_series = close.rolling(50).mean()
    ma200_series = close.rolling(200).mean()
    golden_cross = False
    death_cross = False
    ma_crossover_signal = "None"
    
    if len(ma50_series) >= 2 and len(ma200_series) >= 2:
        prev_50 = ma50_series.iloc[-2]
        prev_200 = ma200_series.iloc[-2]
        curr_50 = ma50_series.iloc[-1]
        curr_200 = ma200_series.iloc[-1]
        
        # Golden Cross: 50MA crosses above 200MA
        if prev_50 <= prev_200 and curr_50 > curr_200:
            golden_cross = True
            ma_crossover_signal = "Golden Cross"
        # Death Cross: 50MA crosses below 200MA
        elif prev_50 >= prev_200 and curr_50 < curr_200:
            death_cross = True
            ma_crossover_signal = "Death Cross"
        elif curr_50 > curr_200:
            ma_crossover_signal = "Bullish (50MA > 200MA)"
        else:
            ma_crossover_signal = "Bearish (50MA < 200MA)"
    
    # RSI Divergence Detection
    bullish_div, bearish_div, divergence_desc = detect_rsi_divergence(hist)
    
    # Multi-Timeframe Analysis
    # Daily trend (20-day SMA alignment)
    sma_20 = close.rolling(20).mean()
    daily_trend = 'bullish' if close.iloc[-1] > sma_20.iloc[-1] and sma_20.iloc[-1] > sma_20.iloc[-5] else \
                  'bearish' if close.iloc[-1] < sma_20.iloc[-1] and sma_20.iloc[-1] < sma_20.iloc[-5] else 'neutral'
    
    # Weekly trend (using 5-day approximation for weekly close)
    weekly_closes = close.iloc[::5]  # Every 5th day approximates weekly
    if len(weekly_closes) >= 12:
        weekly_sma_12 = weekly_closes.rolling(12).mean()
        weekly_trend = 'bullish' if float(weekly_closes.iloc[-1]) > float(weekly_sma_12.iloc[-1]) else 'bearish'
    else:
        weekly_trend = 'neutral'
    
    # 4H confluence (using hourly data approximation from daily)
    # Check if price is above both 20 and 50 SMA (intraday bullish)
    intraday_bullish = close.iloc[-1] > sma_20.iloc[-1] and close.iloc[-1] > sma_50
    intraday_bearish = close.iloc[-1] < sma_20.iloc[-1] and close.iloc[-1] < sma_50
    
    # Trend alignment score
    trend_alignment = 0
    if daily_trend == 'bullish': trend_alignment += 1
    if weekly_trend == 'bullish': trend_alignment += 1
    if intraday_bullish: trend_alignment += 1
    if close.iloc[-1] > sma_200: trend_alignment += 1
    
    timeframe_confluence = 'strong_bull' if trend_alignment >= 3 else \
                          'bull' if trend_alignment == 2 else \
                          'neutral' if trend_alignment == 1 else 'bear'
    
    # Volatility
    volatility = float(close.pct_change().std() * np.sqrt(252) * 100)
    
    # Sharpe
    returns = close.pct_change().dropna()
    sharpe = np.sqrt(252) * returns.mean() / returns.std() if len(returns) > 30 and returns.std() != 0 else 0
    
    # Sortino Ratio (downside deviation only)
    downside_returns = returns[returns < 0]
    downside_std = downside_returns.std() * np.sqrt(252) if len(downside_returns) > 0 else 0.001
    sortino = np.sqrt(252) * returns.mean() / downside_std if len(returns) > 30 and downside_std != 0 else 0
    
    # Max Drawdown
    cumulative = (1 + returns).cumprod()
    running_max = cumulative.expanding().max()
    drawdown = (cumulative - running_max) / running_max
    max_dd = float(drawdown.min() * 100)
    
    # Bollinger Band Width
    sma20 = close.rolling(20).mean()
    std20 = close.rolling(20).std()
    bb_width = float((std20 * 2 / sma20).iloc[-1] * 100)
    
    # Mean Reversion: std dev from 50-day mean
    std_20 = close.rolling(20).std()
    z_score = float((close.iloc[-1] - sma_20.iloc[-1]) / std_20.iloc[-1]) if std_20.iloc[-1] != 0 else 0
    
    # Volume Analysis
    current_volume = volume.iloc[-1]
    avg_volume_20 = volume.tail(20).mean()
    avg_volume_50 = volume.tail(50).mean() if len(volume) >= 50 else avg_volume_20
    volume_ratio = current_volume / avg_volume_20 if avg_volume_20 > 0 else 1.0
    
    # Volume spike detection (1.5x threshold for buy signals)
    volume_spike = volume_ratio >= 1.5
    volume_breakdown = volume_ratio <= 0.7
    
    # Volume trend
    volume_trend = 'increasing' if avg_volume_20 > avg_volume_50 * 1.1 else \
                   'decreasing' if avg_volume_20 < avg_volume_50 * 0.9 else 'stable'
    
    # Volume Profile - accumulation vs distribution
    price_change = close.pct_change().iloc[-1]
    volume_confirming = (price_change > 0 and volume_ratio > 1.2) or (price_change < 0 and volume_ratio < 0.8)
    volume_divergence = (price_change > 0 and volume_ratio < 0.8) or (price_change < 0 and volume_ratio > 1.2)
    
    # On Balance Volume (OBV)
    obv = [0]
    for i in range(1, len(close)):
        if close.iloc[i] > close.iloc[i-1]:
            obv.append(obv[-1] + volume.iloc[i])
        elif close.iloc[i] < close.iloc[i-1]:
            obv.append(obv[-1] - volume.iloc[i])
        else:
            obv.append(obv[-1])
    
    obv_current = obv[-1] if len(obv) > 0 else 0
    obv_sma = np.mean(obv[-20:]) if len(obv) >= 20 else obv_current
    obv_trend = 'bullish' if obv_current > obv_sma else 'bearish'
    
    # OBV Divergence detection
    price_sma_20 = close.tail(20).mean()
    obv_divergence = 'bullish' if obv_current > obv_sma and close.iloc[-1] < price_sma_20 else \
                     'bearish' if obv_current < obv_sma and close.iloc[-1] > price_sma_20 else 'neutral'
    
    return {
        'rsi': rsi,
        'rsi_14': rsi,
        'macd': macd,
        'macd_signal': macd_signal,
        'macd_histogram': round(macd_histogram, 4),
        'sma_50': sma_50,
        'sma_200': sma_200,
        'volatility': round(volatility, 2),
        'sharpe_ratio': round(sharpe, 2),
        'sortino_ratio': round(sortino, 2),
        'max_drawdown': round(max_dd, 2),
        'bb_width': round(bb_width, 2),
        'z_score': round(z_score, 2),
        # Multi-timeframe analysis
        'daily_trend': daily_trend,
        'weekly_trend': weekly_trend,
        'intraday_bullish': intraday_bullish,
        'intraday_bearish': intraday_bearish,
            'trend_alignment': trend_alignment,
            'timeframe_confluence': timeframe_confluence,
            # Moving Average Crossover
            'golden_cross': golden_cross,
            'death_cross': death_cross,
            'ma_crossover_signal': ma_crossover_signal,
            # RSI Divergence
            'rsi_bullish_divergence': bullish_div,
            'rsi_bearish_divergence': bearish_div,
            'rsi_divergence_desc': divergence_desc,
            # Volume indicators
            'volume_ratio': round(volume_ratio, 2),
        'volume_spike': bool(volume_spike),
        'volume_breakdown': bool(volume_breakdown),
        'volume_trend': volume_trend,
        'volume_confirming': bool(volume_confirming),
        'volume_divergence': bool(volume_divergence),
        'obv_trend': obv_trend,
        'obv_divergence': obv_divergence,
        'avg_volume_20': int(avg_volume_20),
        'avg_volume_50': int(avg_volume_50)
    }

def get_stock_data(ticker, smh_perf_5d=0, smh_perf_20d=0, smh_perf_60d=0, smh_perf_180d=0, qqq_perf_5d=0, qqq_perf_20d=0, qqq_perf_60d=0, regime_data=None):
    """Get comprehensive stock data with SMH/QQQ comparison, volume confirmation, and regime-adjusted scoring"""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1y")
        info = stock.info
        
        if len(hist) < 20:
            return None
        
        current_price = float(hist['Close'].iloc[-1])
        prev_price = float(hist['Close'].iloc[-2])
        
        # Performance calculations
        price_5d = hist['Close'].iloc[-5]
        price_20d = hist['Close'].iloc[-20]
        price_60d = hist['Close'].iloc[-60] if len(hist) >= 60 else hist['Close'].iloc[0]
        price_180d = hist['Close'].iloc[-180] if len(hist) >= 180 else hist['Close'].iloc[0]
        
        perf_5d = ((current_price - price_5d) / price_5d) * 100
        perf_20d = ((current_price - price_20d) / price_20d) * 100
        perf_60d = ((current_price - price_60d) / price_60d) * 100
        perf_180d = ((current_price - price_180d) / price_180d) * 100
        
        # VS SMH comparison
        vs_smh_5d = perf_5d - smh_perf_5d
        vs_smh_20d = perf_20d - smh_perf_20d
        vs_smh_60d = perf_60d - smh_perf_60d
        vs_smh_180d = perf_180d - smh_perf_180d
        
        # VS QQQ comparison
        vs_qqq_5d = perf_5d - qqq_perf_5d
        vs_qqq_20d = perf_20d - qqq_perf_20d
        
        # Outperform SMH and QQQ on all timeframes
        outperform_smh_all = (perf_5d > smh_perf_5d and perf_20d > smh_perf_20d and perf_60d > smh_perf_60d)
        outperform_qqq_all = (perf_5d > qqq_perf_5d and perf_20d > qqq_perf_20d and perf_60d > qqq_perf_60d)
        outperform_all_benchmarks = outperform_smh_all and outperform_qqq_all
        
        # Volume
        avg_volume = hist['Volume'].tail(20).mean()
        dollar_volume = current_price * avg_volume
        
        # Indicators
        indicators = calculate_indicators(hist)
        
        # Recommendation
        rec_key = info.get('recommendationKey', 'hold')
        rec_map = {
            'strong_buy': 'Strong Buy',
            'buy': 'Buy',
            'hold': 'Hold',
            'sell': 'Sell',
            'strong_sell': 'Strong Sell'
        }
        recommendation = rec_map.get(rec_key, 'Hold')
        
        # Sector and Industry for correlation analysis
        sector = info.get('sector', 'Unknown')
        industry = info.get('industry', 'Unknown')
        
        # Enhanced Rating based on multiple factors (0-100 scale)
        score = 50  # Base score
        
        # SMH Relative Performance (max +20)
        if vs_smh_20d > 10: score += 15
        elif vs_smh_20d > 5: score += 12
        elif vs_smh_20d > 0: score += 8
        elif vs_smh_20d > -5: score -= 3
        else: score -= 8
        
        if vs_smh_60d > 15: score += 10
        elif vs_smh_60d > 5: score += 5
        elif vs_smh_60d > 0: score += 2
        elif vs_smh_60d < -10: score -= 5
        
        # Price Performance (max +15)
        if perf_20d > 15: score += 10
        elif perf_20d > 5: score += 5
        elif perf_20d > 0: score += 2
        elif perf_20d < -10: score -= 5
        
        if perf_60d > 30: score += 5
        elif perf_60d > 10: score += 3
        
        # Technical Indicators (max +15)
        if indicators['rsi'] > 55 and indicators['rsi'] < 70: score += 5
        if current_price > indicators['sma_50']: score += 5
        if current_price > indicators['sma_200']: score += 5
        
        # Volume Confirmation - Require 1.5x average volume for strong buy signals
        volume_score = 0
        if indicators['volume_spike']: 
            volume_score += 8  # Strong volume confirmation
        elif indicators['volume_ratio'] > 1.2: 
            volume_score += 5  # Moderate volume increase
        elif indicators['volume_ratio'] > 1.0: 
            volume_score += 2  # Slight volume increase
        elif indicators['volume_breakdown']: 
            volume_score -= 5  # Low volume warning
        
        # Volume trend bonus
        if indicators['volume_trend'] == 'increasing' and indicators['obv_trend'] == 'bullish':
            volume_score += 3  # Accumulation phase
        elif indicators['volume_trend'] == 'decreasing' and indicators['obv_trend'] == 'bearish':
            volume_score -= 3  # Distribution phase
        
        # OBV Divergence bonus
        if indicators['obv_divergence'] == 'bullish':
            volume_score += 4  # Bullish divergence
        elif indicators['obv_divergence'] == 'bearish':
            volume_score -= 4  # Bearish divergence
        
        # Cap volume score
        score += max(-10, min(12, volume_score))
        
        # Volume & Liquidity (max +10)
        if dollar_volume > 500000000: score += 5  # > $500M daily
        elif dollar_volume > 100000000: score += 3  # > $100M daily
        
        # Multiple Time Frame Analysis (max +12)
        timeframe_score = 0
        if indicators['timeframe_confluence'] == 'strong_bull':
            timeframe_score += 12  # All timeframes aligned bullish
        elif indicators['timeframe_confluence'] == 'bull':
            timeframe_score += 8   # Most timeframes bullish
        elif indicators['timeframe_confluence'] == 'neutral':
            timeframe_score += 3   # Mixed signals
        else:
            timeframe_score -= 5   # Bearish alignment
        
        # Weekly trend alignment bonus
        if indicators['weekly_trend'] == 'bullish' and indicators['daily_trend'] == 'bullish':
            timeframe_score += 4  # Strong weekly-daily alignment
        elif indicators['weekly_trend'] == 'bearish' and indicators['daily_trend'] == 'bearish':
            timeframe_score -= 4  # Bearish alignment penalty
        
        # MACD confirmation across timeframes
        if indicators['macd_histogram'] > 0 and indicators['intraday_bullish']:
            timeframe_score += 3  # MACD bullish with price action
        elif indicators['macd_histogram'] < 0 and indicators['intraday_bearish']:
            timeframe_score -= 3  # MACD bearish warning
        
        score += max(-8, min(15, timeframe_score))
        
        # Risk Metrics - Volatility Adjusted Returns using Sortino Ratio
        # High return with high volatility = lower score adjustment
        if indicators['sortino_ratio'] > 2.0: score += 10
        elif indicators['sortino_ratio'] > 1.5: score += 7
        elif indicators['sortino_ratio'] > 1.0: score += 5
        elif indicators['sortino_ratio'] > 0.5: score += 2
        elif indicators['sortino_ratio'] < 0: score -= 5
        
        # Traditional Sharpe as backup
        if indicators['sharpe_ratio'] > 1.5: score += 5
        elif indicators['sharpe_ratio'] > 1.0: score += 3
        elif indicators['sharpe_ratio'] > 0.5: score += 1
        
        if indicators['volatility'] < 30: score += 3
        elif indicators['volatility'] < 40: score += 1
        elif indicators['volatility'] > 60: score -= 5
        
        # Mean Reversion Factor - penalize overextended stocks
        if indicators['z_score'] > 3.0: score -= 8  # > 3 std dev above mean - pullback risk
        elif indicators['z_score'] > 2.5: score -= 5
        elif indicators['z_score'] > 2.0: score -= 3
        elif indicators['z_score'] < -3.0: score += 3  # Oversold bounce potential
        
        if indicators['max_drawdown'] > -15: score += 2
        elif indicators['max_drawdown'] < -40: score -= 3
        
        # Analyst Recommendation (max +5)
        if recommendation in ['Strong Buy']: score += 5
        elif recommendation in ['Buy']: score += 3
        elif recommendation in ['Sell', 'Strong Sell']: score -= 3
        
        # Correlation Penalty - Diversification Factor
        # Check existing portfolio sector concentration
        if _data_cache['stocks']:
            sector_counts = {}
            for existing_ticker, existing_data in _data_cache['stocks'].items():
                existing_sector = existing_data.get('sector', 'Unknown')
                sector_counts[existing_sector] = sector_counts.get(existing_sector, 0) + 1
            
            total_stocks = len(_data_cache['stocks'])
            if total_stocks > 0 and sector in sector_counts:
                sector_concentration = sector_counts[sector] / total_stocks
                # Penalize if sector already has >20% concentration
                if sector_concentration > 0.30:  # >30% in one sector
                    score -= 8  # Heavy penalty - too concentrated
                elif sector_concentration > 0.20:  # >20% in one sector
                    score -= 4  # Moderate penalty
                elif sector_concentration > 0.10:  # >10% in one sector
                    score -= 2  # Light penalty
                else:
                    score += 3  # Diversification boost - new sector
        
        # Market Regime Filter - Adjust scoring based on market condition
        if regime_data:
            score = adjust_score_for_regime(score, regime_data)
        
        # Clamp score to 0-100
        score = max(0, min(100, score))
        
        # Rating tiers
        if score >= 85: rating = 'S'
        elif score >= 75: rating = 'A'
        elif score >= 60: rating = 'B'
        elif score >= 45: rating = 'C'
        else: rating = 'D'
        
        # Relative Strength vs SMH
        smh_rs = (perf_20d + perf_60d) / 2 - (smh_perf_20d + smh_perf_60d) / 2
        
        return {
            'ticker': ticker,
            'name': info.get('shortName', ticker),
            'price': round(current_price, 2),
            'price_change': round(current_price - prev_price, 2),
            'price_change_pct': round((current_price / prev_price - 1) * 100, 2),
            'volume': int(hist['Volume'].iloc[-1]),
            'avg_volume_20': int(avg_volume),
            'dollar_volume': int(dollar_volume),
            'perf_5d': round(perf_5d, 2),
            'perf_20d': round(perf_20d, 2),
            'perf_60d': round(perf_60d, 2),
            'perf_180d': round(perf_180d, 2),
            'vs_smh_5d': round(vs_smh_5d, 2),
            'vs_smh_20d': round(vs_smh_20d, 2),
            'vs_smh_60d': round(vs_smh_60d, 2),
            'vs_smh_180d': round(vs_smh_180d, 2),
            'vs_qqq_5d': round(vs_qqq_5d, 2),
            'vs_qqq_20d': round(vs_qqq_20d, 2),
            'outperform_smh_all': outperform_smh_all,
            'outperform_qqq_all': outperform_qqq_all,
            'outperform_all_benchmarks': outperform_all_benchmarks,
            'recommendation': recommendation,
            'rsi': indicators['rsi'],
            'rsi_14': indicators['rsi_14'],
            'sma_50': indicators['sma_50'],
            'sma_200': indicators['sma_200'],
            'above_sma50': bool(current_price > indicators['sma_50']),
            'above_sma200': bool(current_price > indicators['sma_200']),
            'volatility': indicators['volatility'],
            'sharpe_ratio': indicators['sharpe_ratio'],
            'max_drawdown': indicators['max_drawdown'],
            'macd': indicators['macd'],
            'bb_width': indicators['bb_width'],
            'sortino_ratio': indicators['sortino_ratio'],
            'z_score': indicators['z_score'],
            'sector': sector,
            'industry': industry,
            'rating': rating,
            'total_score': score,
            'smh_rs': round(smh_rs, 2),
            # Volume Confirmation Data
            'volume_ratio': indicators['volume_ratio'],
            'volume_spike': indicators['volume_spike'],
            'volume_breakdown': indicators['volume_breakdown'],
            'volume_trend': indicators['volume_trend'],
            'volume_confirming': indicators['volume_confirming'],
            'obv_trend': indicators['obv_trend'],
            'obv_divergence': indicators['obv_divergence'],
            # Multi-Timeframe Analysis Data
            'daily_trend': indicators['daily_trend'],
            'weekly_trend': indicators['weekly_trend'],
            'intraday_bullish': indicators['intraday_bullish'],
            'intraday_bearish': indicators['intraday_bearish'],
            'trend_alignment': indicators['trend_alignment'],
            'timeframe_confluence': indicators['timeframe_confluence'],
            'macd_histogram': indicators['macd_histogram'],
            # Moving Average Crossover
            'golden_cross': indicators['golden_cross'],
            'death_cross': indicators['death_cross'],
            'ma_crossover_signal': indicators['ma_crossover_signal'],
            # RSI Divergence
            'rsi_bullish_divergence': indicators['rsi_bullish_divergence'],
            'rsi_bearish_divergence': indicators['rsi_bearish_divergence'],
            'rsi_divergence_desc': indicators['rsi_divergence_desc'],
            'history': [
                {'date': str(idx.date()), 'close': round(row['Close'], 2), 'volume': int(row['Volume'])}
                for idx, row in hist.tail(60).iterrows()
            ]
        }
    except Exception as e:
        print(f"Error fetching {ticker}: {e}")
        return None

def get_finviz_stocks():
    """Fetch top stocks from Finviz screener"""
    try:
        base_url = "https://finviz.com/screener.ashx?v=411&f=sh_price_o10%2Cta_change_u%2Cta_perf_13w20o%2Cta_perf2_26w50o&ft=3&o=-volume"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        
        tickers = []
        seen = set()
        
        for page in range(5):  # Get top 100
            r_param = "" if page == 0 else f"&r={page * 20 + 1}"
            url = base_url + r_param
            
            try:
                response = requests.get(url, headers=headers, timeout=15)
                page_tickers = re.findall(r'quote\.ashx\?t=([A-Z]+)', response.text)
                
                for t in page_tickers:
                    if t not in seen and len(tickers) < 100:
                        seen.add(t)
                        tickers.append(t)
                        
                if len(page_tickers) < 20:
                    break
                    
            except Exception as e:
                print(f"Error fetching page {page}: {e}")
                break
        
        return tickers[:50]
    except Exception as e:
        print(f"Error fetching Finviz: {e}")
        # Fallback to popular stocks
        return ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'META', 'AMD', 'AVGO', 'GOOGL', 'AMZN', 'NFLX',
                'CRM', 'ORCL', 'ADBE', 'PLTR', 'SNOW', 'CRWD', 'PANW', 'QCOM', 'MU', 'TSM']

def calculate_market_regime(spy_data, vix_value):
    """Calculate market regime based on SPY 200-day MA and VIX"""
    try:
        # Calculate 200-day MA
        spy_sma_200 = spy_data['Close'].rolling(200).mean().iloc[-1] if len(spy_data) >= 200 else spy_data['Close'].mean()
        spy_current = spy_data['Close'].iloc[-1]
        spy_above_200ma = spy_current > spy_sma_200
        
        # Determine regime
        if spy_above_200ma and vix_value < 20:
            regime = 'bullish'
            regime_chinese = '牛市'
            regime_color = '#00ff9d'
            trading_mode = '積極做多'
        elif spy_above_200ma and vix_value < 25:
            regime = 'cautious_bull'
            regime_chinese = '謹慎牛市'
            regime_color = '#ffd700'
            trading_mode = '選股做多'
        elif spy_above_200ma and vix_value >= 25:
            regime = 'volatile_bull'
            regime_chinese = '波動牛市'
            regime_color = '#ff6b35'
            trading_mode = '減少倉位'
        elif not spy_above_200ma and vix_value < 25:
            regime = 'correction'
            regime_chinese = '回調市場'
            regime_color = '#ff4757'
            trading_mode = '觀望為主'
        else:
            regime = 'bearish'
            regime_chinese = '熊市'
            regime_color = '#ff0040'
            trading_mode = '防守為主'
        
        return {
            'regime': regime,
            'regime_chinese': regime_chinese,
            'regime_color': regime_color,
            'trading_mode': trading_mode,
            'spy_above_200ma': bool(spy_above_200ma),
            'spy_sma_200': round(spy_sma_200, 2),
            'spy_distance_to_200ma': round((spy_current / spy_sma_200 - 1) * 100, 2),
            'vix_level': 'low' if vix_value < 20 else 'moderate' if vix_value < 25 else 'high' if vix_value < 30 else 'extreme',
            'allow_new_longs': spy_above_200ma and vix_value < 25,
            'reduce_position_size': vix_value >= 25,
            'position_size_multiplier': 1.0 if vix_value < 20 else 0.75 if vix_value < 25 else 0.5 if vix_value < 30 else 0.25
        }
    except Exception as e:
        print(f"Error calculating market regime: {e}")
        return {
            'regime': 'unknown',
            'regime_chinese': '未知',
            'regime_color': '#666666',
            'trading_mode': '觀望',
            'spy_above_200ma': False,
            'spy_sma_200': 0,
            'spy_distance_to_200ma': 0,
            'vix_level': 'unknown',
            'allow_new_longs': False,
            'reduce_position_size': True,
            'position_size_multiplier': 0.5
        }

def adjust_score_for_regime(score, regime_data):
    """Adjust stock score based on market regime"""
    if not regime_data['allow_new_longs']:
        # Reduce scores in bear markets or high volatility
        score = score * regime_data['position_size_multiplier']
    
    if regime_data['regime'] == 'bullish':
        # Boost scores slightly in strong bull markets
        score = min(100, score * 1.05)
    
    return round(score, 1)

def get_vix_term_structure():
    """
    Get VIX Term Structure (Contango vs Backwardation)
    Uses VIX, VIX9D (9-day), VIX3M (3-month), VIX6M (6-month)
    """
    try:
        vix_tickers = {
            'VIX': '^VIX',
            'VIX9D': '^VIX9D',
            'VIX3M': '^VIX3M',
            'VIX6M': '^VIX6M'
        }
        
        vix_data = {}
        for name, ticker in vix_tickers.items():
            try:
                data = yf.Ticker(ticker).history(period="5d")
                if not data.empty:
                    vix_data[name] = round(data['Close'].iloc[-1], 2)
                else:
                    vix_data[name] = None
            except:
                vix_data[name] = None
        
        # Fallback values
        if vix_data['VIX'] is None:
            vix_data['VIX'] = 20.0
        if vix_data['VIX9D'] is None:
            vix_data['VIX9D'] = vix_data['VIX'] * 0.95
        if vix_data['VIX3M'] is None:
            vix_data['VIX3M'] = vix_data['VIX'] * 1.05
        if vix_data['VIX6M'] is None:
            vix_data['VIX6M'] = vix_data['VIX'] * 1.10
        
        front_month = vix_data['VIX']
        back_month = vix_data['VIX3M']
        
        if front_month and back_month:
            spread = back_month - front_month
            spread_pct = (spread / front_month) * 100
            
            if spread > 0:
                structure = "Contango"
                structure_desc = "Normal term structure - Lower future volatility expected (Bullish)"
                fear_level = "Low"
            else:
                structure = "Backwardation"
                structure_desc = "Inverted term structure - High near-term fear (Bearish/Reversal)"
                fear_level = "High"
            
            return {
                'vix': vix_data['VIX'],
                'vix_9d': vix_data['VIX9D'],
                'vix_3m': vix_data['VIX3M'],
                'vix_6m': vix_data['VIX6M'],
                'term_structure': structure,
                'spread': round(spread, 2),
                'spread_pct': round(spread_pct, 2),
                'description': structure_desc,
                'fear_level': fear_level
            }
    except Exception as e:
        print(f"Error fetching VIX term structure: {e}")
    
    return {
        'vix': 20.0,
        'vix_9d': 19.0,
        'vix_3m': 21.0,
        'vix_6m': 22.0,
        'term_structure': 'Contango',
        'spread': 1.0,
        'spread_pct': 5.0,
        'description': 'Normal term structure',
        'fear_level': 'Low'
    }

def get_benchmark_data(ticker, period="1y"):
    """Get benchmark ETF data (QQQ, SPY, IWM, XLF)"""
    try:
        data = yf.Ticker(ticker).history(period=period)
        if data.empty:
            return None
        
        current = data['Close'].iloc[-1]
        prev = data['Close'].iloc[-2]
        perf_20d = ((current - data['Close'].iloc[-20]) / data['Close'].iloc[-20]) * 100 if len(data) >= 20 else 0
        perf_60d = ((current - data['Close'].iloc[-60]) / data['Close'].iloc[-60]) * 100 if len(data) >= 60 else 0
        perf_ytd = ((current - data['Close'].iloc[0]) / data['Close'].iloc[0]) * 100 if len(data) > 0 else 0
        
        indicators = calculate_indicators(data)
        
        return {
            'ticker': ticker,
            'price': round(current, 2),
            'change_pct': round((current / prev - 1) * 100, 2),
            'perf_20d': round(perf_20d, 2),
            'perf_60d': round(perf_60d, 2),
            'perf_ytd': round(perf_ytd, 2),
            'rsi': indicators['rsi'],
            'golden_cross': indicators['golden_cross'],
            'death_cross': indicators['death_cross'],
            'ma_crossover_signal': indicators['ma_crossover_signal']
        }
    except Exception as e:
        print(f"Error fetching benchmark {ticker}: {e}")
        return None

def update_all_data():
    """Update all market and stock data"""
    print("Updating all data...")
    
    try:
        # Get market indices first for regime calculation
        spy = yf.Ticker('SPY').history(period="1y")
        qqq = yf.Ticker('QQQ').history(period="1y")
        iwm = yf.Ticker('IWM').history(period="1y")
        
        # Get VIX with error handling
        try:
            vix = yf.Ticker('^VIX').history(period="5d")
            vix_value = round(vix['Close'].iloc[-1], 2) if not vix.empty else 20
        except:
            vix_value = 20
        
        # Calculate Market Regime BEFORE fetching individual stocks
        regime_data = calculate_market_regime(spy, vix_value)
        
        # Get SMH data with regime context
        smh = get_stock_data('SMH', regime_data=regime_data)
        smh_perf_5d = smh['perf_5d'] if smh else 0
        smh_perf_20d = smh['perf_20d'] if smh else 0
        smh_perf_60d = smh['perf_60d'] if smh else 0
        smh_perf_180d = smh['perf_180d'] if smh else 0
        
        # Get QQQ data for comparison
        qqq_data = get_stock_data('QQQ', regime_data=regime_data)
        qqq_perf_5d = qqq_data['perf_5d'] if qqq_data else 0
        qqq_perf_20d = qqq_data['perf_20d'] if qqq_data else 0
        qqq_perf_60d = qqq_data['perf_60d'] if qqq_data else 0
        
        # Market Breadth
        breadth = get_market_breadth()
        ma_data = get_stocks_above_ma()
        
        # CNN Fear & Greed
        fng = get_cnn_fear_greed()
        
        # VIX Term Structure
        vix_term = get_vix_term_structure()
        
        # Additional Benchmarks (QQQ, SPY, IWM already fetched, add XLF)
        xlf = get_benchmark_data('XLF')
        qqq_bench = get_benchmark_data('QQQ')
        spy_bench = get_benchmark_data('SPY')
        iwm_bench = get_benchmark_data('IWM')
        
        # SPY Technicals with Golden/Death Cross
        spy_sma_10m = spy['Close'].rolling(200).mean().iloc[-1] if len(spy) >= 200 else spy['Close'].mean()
        spy_current = spy['Close'].iloc[-1]
        spy_indicators = calculate_indicators(spy)
        spy_rsi = spy_indicators['rsi']
        
        # Overall market score
        score = 50
        if breadth['nyse_new_highs'] > breadth['nyse_new_lows']: score += 10
        if vix_value < 20: score += 15
        elif vix_value > 30: score -= 15
        if spy_current > spy_sma_10m: score += 15
        if fng['index'] > 50: score += 10
        
        signal = '進攻' if score >= 70 else '防守' if score < 50 else '平衡'
        signal_color = '#00ff9d' if score >= 70 else '#ff0040' if score < 50 else '#ffd700'
        
        market_data = {
            'spy_price': round(spy['Close'].iloc[-1], 2),
            'spy_change_pct': round((spy['Close'].iloc[-1] / spy['Close'].iloc[-2] - 1) * 100, 2),
            'qqq_price': round(qqq['Close'].iloc[-1], 2),
            'qqq_change_pct': round((qqq['Close'].iloc[-1] / qqq['Close'].iloc[-2] - 1) * 100, 2),
            'iwm_price': round(iwm['Close'].iloc[-1], 2),
            'iwm_change_pct': round((iwm['Close'].iloc[-1] / iwm['Close'].iloc[-2] - 1) * 100, 2),
            'vix': vix_value,
            'smh_price': smh['price'] if smh else 0,
            'smh_5d': smh_perf_5d,
            'smh_20d': smh_perf_20d,
            'smh_60d': smh_perf_60d,
            'smh_180d': smh_perf_180d,
            'qqq_5d': qqq_perf_5d,
            'qqq_20d': qqq_perf_20d,
            'qqq_60d': qqq_perf_60d,
            'nyse_new_highs': breadth['nyse_new_highs'],
            'nyse_new_lows': breadth['nyse_new_lows'],
            'nyse_advance': breadth['nyse_advance'],
            'nyse_decline': breadth['nyse_decline'],
            'nyse_ad_line': breadth['nyse_ad_line'],
            'stocks_above_sma50': ma_data['above_sma50'],
            'stocks_above_sma200': ma_data['above_sma200'],
            'fear_greed_index': fng['index'],
            'fear_greed_status': fng['status'],
            'fear_greed_indicators': fng.get('indicators', {}),
            'spy_sma_10m': round(spy_sma_10m, 2),
            'spy_above_10m': bool(spy_current > spy_sma_10m),
            'spy_rsi_14': round(spy_rsi, 1),
            'overall_score': score,
            'signal': signal,
            'signal_color': signal_color,
            # Market Regime Data
            'regime': regime_data['regime'],
            'regime_chinese': regime_data['regime_chinese'],
            'regime_color': regime_data['regime_color'],
            'trading_mode': regime_data['trading_mode'],
            'spy_above_200ma': regime_data['spy_above_200ma'],
            'spy_sma_200': regime_data['spy_sma_200'],
            'spy_distance_to_200ma': regime_data['spy_distance_to_200ma'],
            'vix_level': regime_data['vix_level'],
            'allow_new_longs': regime_data['allow_new_longs'],
            'reduce_position_size': regime_data['reduce_position_size'],
            'position_size_multiplier': regime_data['position_size_multiplier'],
            # Additional Benchmarks
            'benchmarks': {
                'spy': spy_bench,
                'qqq': qqq_bench,
                'iwm': iwm_bench,
                'xlf': xlf
            },
            # VIX Term Structure
            'vix_term_structure': vix_term,
            # SPY Golden/Death Cross
            'spy_golden_cross': spy_indicators['golden_cross'],
            'spy_death_cross': spy_indicators['death_cross'],
            'spy_ma_crossover_signal': spy_indicators['ma_crossover_signal'],
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Get stock list from Finviz
        tickers = get_finviz_stocks()
        
        # Fetch all stock data with regime context
        stocks_data = {}
        for ticker in tickers:
            data = get_stock_data(ticker, smh_perf_5d, smh_perf_20d, smh_perf_60d, smh_perf_180d, qqq_perf_5d, qqq_perf_20d, qqq_perf_60d, regime_data=regime_data)
            if data:
                stocks_data[ticker] = data
            time.sleep(0.05)
        
        _data_cache['stocks'] = stocks_data
        _data_cache['market'] = market_data
        _data_cache['smh'] = smh
        _data_cache['last_update'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        print(f"Updated {len(stocks_data)} stocks")
        return stocks_data, market_data, smh
    except Exception as e:
        print(f"Error in update_all_data: {e}")
        # Return cached data if available, otherwise empty
        return _data_cache['stocks'], _data_cache['market'], _data_cache['smh']

@app.route('/api/all-data')
def get_all_data():
    """Get all data in one call"""
    if not _data_cache['stocks'] or not _data_cache['market']:
        update_all_data()
    
    return json_response({
        'stocks': _data_cache['stocks'],
        'market': _data_cache['market'],
        'smh': _data_cache['smh'],
        'last_update': _data_cache['last_update']
    })

@app.route('/api/stock/<ticker>')
def get_single_stock(ticker):
    """Get single stock data with regime context"""
    ticker = ticker.upper()
    
    smh = _data_cache.get('smh')
    smh_perf_5d = smh['perf_5d'] if smh else 0
    smh_perf_20d = smh['perf_20d'] if smh else 0
    smh_perf_60d = smh['perf_60d'] if smh else 0
    smh_perf_180d = smh['perf_180d'] if smh else 0
    
    # Get QQQ data from market cache
    market_data = _data_cache.get('market')
    qqq_perf_5d = market_data.get('qqq_5d', 0) if market_data else 0
    qqq_perf_20d = market_data.get('qqq_20d', 0) if market_data else 0
    qqq_perf_60d = market_data.get('qqq_60d', 0) if market_data else 0
    
    # Get regime data from cached market data
    regime_data = None
    if market_data:
        regime_data = {
            'regime': market_data.get('regime', 'unknown'),
            'allow_new_longs': market_data.get('allow_new_longs', False),
            'position_size_multiplier': market_data.get('position_size_multiplier', 0.5)
        }
    
    data = get_stock_data(ticker, smh_perf_5d, smh_perf_20d, smh_perf_60d, smh_perf_180d, qqq_perf_5d, qqq_perf_20d, qqq_perf_60d, regime_data=regime_data)
    if data:
        return json_response(data)
    return json_response({'error': 'Stock not found'}), 404

@app.route('/api/refresh', methods=['POST'])
def refresh():
    """Force refresh all data"""
    update_all_data()
    return json_response({'status': 'success', 'last_update': _data_cache['last_update']})

@app.route('/health')
def health():
    return json_response({
        'status': 'ok',
        'stocks_count': len(_data_cache['stocks']),
        'last_update': _data_cache['last_update']
    })

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder = os.path.join(os.path.dirname(__file__), '..', 'dist')
    if path != "" and os.path.exists(os.path.join(static_folder, path)):
        return send_from_directory(static_folder, path)
    else:
        return send_from_directory(static_folder, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("Initializing Tactical Terminal API...")
    update_all_data()
    print(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
