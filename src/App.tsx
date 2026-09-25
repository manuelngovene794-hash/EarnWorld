import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { EarnPage } from './components/pages/EarnPage';
import { ReferralsPage } from './components/pages/ReferralsPage';
import { BalancePage } from './components/pages/BalancePage';
import { WithdrawPage } from './components/pages/WithdrawPage';
import { HistoryPage } from './components/pages/HistoryPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { HelpPage } from './components/pages/HelpPage';
import { AdminPanel } from './components/AdminPanel';
import { RewardedAdModal } from './components/RewardedAdModal';
import { WithdrawModal } from './components/WithdrawModal';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppConfig } from './types';
import { DEFAULT_CONFIG } from './data/initialData';
import { storageService } from './services/storageService';
import { monetagService } from './services/monetagService';

function MainApp() {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // Parse initial tab from location hash or pathname
  const [activeTab, setActiveTab] = useState<string>(() => {
    const path = window.location.pathname.replace('/', '').toLowerCase();
    const hash = window.location.hash.replace('#', '').toLowerCase();

    if (path === 'admin' || hash === 'admin') return 'admin';
    if (['dashboard', 'earn', 'referrals', 'balance', 'withdraw', 'history', 'profile', 'help'].includes(hash)) {
      return hash;
    }
    // Backward compatibility for 'tasks' -> 'earn'
    if (hash === 'tasks') return 'earn';
    return 'dashboard';
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [adModalOpen, setAdModalOpen] = useState(false);

  // Sync route on popstate and hashchange
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.replace('/', '').toLowerCase();
      const hash = window.location.hash.replace('#', '').toLowerCase();

      if (path === 'admin' || hash === 'admin') {
        setActiveTab('admin');
      } else if (['dashboard', 'earn', 'referrals', 'balance', 'withdraw', 'history', 'profile', 'help'].includes(hash)) {
        setActiveTab(hash);
      } else if (hash === 'tasks') {
        setActiveTab('earn');
      } else if (!hash && path === '') {
        setActiveTab('dashboard');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Subscribe to real-time global config (exchange rates, liquidity balances, rules)
  useEffect(() => {
    const unsubscribe = storageService.subscribeAppConfig((newCfg) => {
      setConfig(newCfg);
      monetagService.autoSyncIfConfigured(newCfg);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateTab = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'admin') {
      window.history.pushState(null, '', '/admin');
    } else if (tab === 'dashboard') {
      window.history.pushState(null, '', window.location.pathname);
    } else {
      window.location.hash = `#${tab}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 pb-16 md:pb-0">
      
      {/* Navbar Header (Top Desktop & Mobile Navigation) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleUpdateTab}
        config={config}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenAdModal={() => setAdModalOpen(true)}
      />

      {/* Main Container - Renders the respective dedicated page */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* 1. Início / Dashboard */}
        {activeTab === 'dashboard' && (
          <Dashboard
            config={config}
            setActiveTab={handleUpdateTab}
            onOpenWithdraw={() => handleUpdateTab('withdraw')}
            onOpenAdModal={() => setAdModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
            onSelectTask={() => handleUpdateTab('earn')}
          />
        )}

        {/* 2. Ganhar Pontos — pesquisas, ofertas, anúncios e check-in */}
        {activeTab === 'earn' && (
          <EarnPage
            config={config}
            onOpenAdModal={() => setAdModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
            setActiveTab={handleUpdateTab}
          />
        )}

        {/* 3. Indicar Amigos — código e link de convite */}
        {activeTab === 'referrals' && (
          <ReferralsPage
            config={config}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {/* 4. Saldo — pontos, valor em USD/MZN e conversor */}
        {activeTab === 'balance' && (
          <BalancePage
            config={config}
            setActiveTab={handleUpdateTab}
            onOpenWithdraw={() => handleUpdateTab('withdraw')}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {/* 5. Levantamento — M-Pesa, e-Mola, PayPal, Payoneer, USDT e banco */}
        {activeTab === 'withdraw' && (
          <WithdrawPage
            config={config}
            onOpenAuth={() => setAuthModalOpen(true)}
            setActiveTab={handleUpdateTab}
          />
        )}

        {/* 6. Histórico — ganhos e levantamentos */}
        {activeTab === 'history' && (
          <HistoryPage
            onOpenAuth={() => setAuthModalOpen(true)}
            setActiveTab={handleUpdateTab}
          />
        )}

        {/* 7. Perfil / Definições — dados, país e idioma */}
        {activeTab === 'profile' && (
          <ProfilePage
            config={config}
            onOpenAuth={() => setAuthModalOpen(true)}
            setActiveTab={handleUpdateTab}
          />
        )}

        {/* 8. Ajuda — perguntas frequentes e suporte */}
        {activeTab === 'help' && (
          <HelpPage
            config={config}
            setActiveTab={handleUpdateTab}
          />
        )}

        {/* Painel do Administrador (/admin) */}
        {activeTab === 'admin' && (
          <AdminPanel
            config={config}
            onUpdateConfig={setConfig}
          />
        )}

      </main>

      {/* Global Interactive Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <WithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        config={config}
        onSuccessWithdrawal={() => {
          handleUpdateTab('history');
        }}
      />

      <RewardedAdModal
        isOpen={adModalOpen}
        onClose={() => setAdModalOpen(false)}
        config={config}
      />

      {/* Footer */}
      <Footer onNavigate={handleUpdateTab} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}
