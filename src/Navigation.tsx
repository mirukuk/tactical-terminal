import { Globe, BarChart3, Layers, Zap } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string, stockTicker?: string) => void;
}

export default function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const navItems = [
    { id: 'market', label: '市場情報', icon: Globe },
    { id: 'screener', label: '股票篩選', icon: BarChart3 },
    { id: 'analysis', label: '深度分析', icon: Zap },
    { id: 'options', label: '期權策略', icon: Layers },
  ];

  return (
    <aside className="w-64 min-h-screen glass-panel border-r border-white/10 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 255, 157, 0.1) 100%)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)'
            }}
          >
            <Zap className="w-5 h-5" style={{ color: '#00f0ff' }} />
          </div>
          <div>
            <h1 className="font-display text-lg text-white tracking-wider">TACTICAL</h1>
            <p className="font-mono text-[10px] text-gray-500 tracking-widest">TERMINAL v2.0</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-display transition-all ${
                isActive 
                  ? 'bg-cyan-400 text-black' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 rounded-full bg-black" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-gray-600 text-center">
          數據僅供參考，不構成投資建議
        </p>
      </div>
    </aside>
  );
}
