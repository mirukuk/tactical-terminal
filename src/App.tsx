import { useState } from 'react';
import { StockProvider, useStockContext } from './context/StockContext';
import Navigation from './Navigation';
import MarketAnalysis from './sections/MarketAnalysis';
import Screener from './sections/Screener';
import Analysis from './sections/Analysis';
import OptionsTrading from './sections/OptionsTrading';

type PageType = 'market' | 'screener' | 'analysis' | 'options';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageType>('market');
  const { setSelectedStock } = useStockContext();

  const handlePageChange = (page: string, stockTicker?: string) => {
    setCurrentPage(page as PageType);
    // If stock ticker provided, select it
    if (stockTicker) {
      setSelectedStock(stockTicker);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'market':
        return <MarketAnalysis />;
      case 'screener':
        return <Screener onNavigate={handlePageChange} />;
      case 'analysis':
        return <Analysis />;
      case 'options':
        return <OptionsTrading />;
      default:
        return <MarketAnalysis />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex">
      <Navigation currentPage={currentPage} onPageChange={handlePageChange} />
      <main className="flex-1 min-h-screen overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  return (
    <StockProvider>
      <AppContent />
    </StockProvider>
  );
}

export default App;
