import { Layers, Construction, Clock } from 'lucide-react';

export default function OptionsTrading() {
  return (
    <div className="min-h-screen grid-bg flex items-center justify-center">
      <div className="text-center p-12">
        {/* Icon */}
        <div className="w-24 h-24 rounded-2xl mx-auto mb-8 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(191, 90, 242, 0.2) 0%, rgba(88, 86, 214, 0.1) 100%)',
            border: '1px solid rgba(191, 90, 242, 0.3)',
            boxShadow: '0 0 30px rgba(191, 90, 242, 0.2)'
          }}
        >
          <Construction className="w-12 h-12" style={{ color: '#bf5af2' }} />
        </div>

        {/* Title */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Layers className="w-6 h-6" style={{ color: '#bf5af2' }} />
          <h1 className="font-display text-3xl text-white tracking-wider">
            期權策略
          </h1>
        </div>
        
        <p className="font-mono text-xs text-gray-500 tracking-widest mb-8">
          OPTIONS STRATEGY CENTER
        </p>

        {/* Under Development Badge */}
        <div 
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.2) 0%, rgba(255, 184, 0, 0.05) 100%)',
            border: '2px solid rgba(255, 184, 0, 0.4)',
            boxShadow: '0 0 30px rgba(255, 184, 0, 0.2)'
          }}
        >
          <Clock className="w-5 h-5" style={{ color: '#ffd700' }} />
          <span className="font-display text-lg" style={{ color: '#ffd700' }}>
            開發中
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-400 max-w-md mx-auto mb-8">
          期權策略中心正在開發中，敬請期待！
          <br />
          我們將提供專業的期權策略分析、Greeks 計算和風險評估功能。
        </p>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm text-gray-400">策略分析</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">📈</div>
            <p className="text-sm text-gray-400">Greeks 計算</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <p className="text-sm text-gray-400">風險評估</p>
          </div>
        </div>
      </div>
    </div>
  );
}
