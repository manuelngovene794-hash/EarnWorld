import React, { useState } from 'react';
import { 
  Globe2, 
  Coins, 
  Wallet, 
  Sparkles, 
  Users, 
  Clock, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  Menu, 
  X, 
  ChevronDown,
  PlaySquare,
  FileText,
  User,
  HelpCircle,
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppConfig } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  config: AppConfig;
  onOpenAuth: () => void;
  onOpenAdModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  config,
  onOpenAuth,
  onOpenAdModal
}) => {
  const { currentUser, logout, quickLoginAsDemoUser } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const points = currentUser?.pointsBalance || 0;
  const approxUsd = (points / (config.pointsPerDollar || 1000)).toFixed(2);

  // The 8 official pages requested by the user
  const pagesList = [
    { id: 'dashboard', num: '1', label: t('nav.dashboard') || 'Início', desc: 'Visão geral e saldo', icon: LayoutDashboard },
    { id: 'earn', num: '2', label: t('nav.earn') || 'Ganhar Pontos', desc: 'Pesquisas, ofertas, anúncios e check-in', icon: Coins, badge: 'Popular' },
    { id: 'referrals', num: '3', label: t('nav.referrals') || 'Indicar Amigos', desc: 'Código e link de convite (+200 pts)', icon: Users, badge: '+200 pts' },
    { id: 'balance', num: '4', label: t('nav.balance') || 'Saldo', desc: 'Pontos acumulados e carteira em USD', icon: TrendingUp },
    { id: 'withdraw', num: '5', label: t('nav.withdraw') || 'Levantamento', desc: 'PayPal, Payoneer, USDT, Transferência', icon: Wallet },
    { id: 'history', num: '6', label: t('nav.history') || 'Histórico', desc: 'Ganhos e levantamentos', icon: Clock },
    { id: 'profile', num: '7', label: t('nav.profile') || 'Perfil / Definições', desc: 'Dados, país e idioma', icon: User },
    { id: 'help', num: '8', label: t('nav.help') || 'Ajuda & Suporte', desc: 'Perguntas frequentes e apoio', icon: HelpCircle },
  ];

  // Top navigation items visible on desktop
  const desktopPrimaryNav = pagesList.slice(0, 6);

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-amber-500/20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Logo */}
            <div 
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Globe2 className="w-6 h-6 text-amber-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-white">Earn</span>
                  <span className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">World</span>
                </div>
                <p className="text-[10px] text-amber-300/80 font-medium tracking-wider uppercase -mt-1 hidden sm:block">
                  Global Rewards
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1">
              {pagesList.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Admin link if user is admin */}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                    activeTab === 'admin'
                      ? 'bg-red-500/20 text-red-300 border-red-500/50'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin</span>
                </button>
              )}
            </nav>

            {/* Medium screen navigation (md to xl) */}
            <nav className="hidden md:flex xl:hidden items-center gap-1">
              {desktopPrimaryNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`relative flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action Bar */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Language Switcher */}
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
                <button
                  onClick={() => setLang('pt')}
                  className={`px-2 py-1 rounded font-semibold transition-colors ${
                    lang === 'pt' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Português"
                >
                  PT
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`px-2 py-1 rounded font-semibold transition-colors ${
                    lang === 'en' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="English"
                >
                  EN
                </button>
              </div>

              {/* Balance Card Widget (if logged in) */}
              {currentUser ? (
                <div 
                  onClick={() => handleNavClick('balance')}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-900 to-amber-950/40 border border-amber-500/30 cursor-pointer hover:border-amber-400 transition-all shadow-inner group"
                  title="Clique para ver o saldo detalhado"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Coins className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-amber-400 text-sm">{points.toLocaleString()}</span>
                      <span className="text-[10px] text-amber-200/80 font-semibold uppercase">PTS</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-semibold leading-none">
                      <span>${approxUsd} USD</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* User Profile / Auth Button */}
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center font-black text-sm text-slate-950 uppercase shadow">
                      {currentUser.displayName?.charAt(0) || 'U'}
                    </div>
                    <span className="hidden lg:block text-xs font-semibold text-slate-200 max-w-[100px] truncate">
                      {currentUser.displayName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-2 border-b border-slate-800 mb-1">
                        <p className="text-sm font-semibold text-white truncate">{currentUser.displayName}</p>
                        <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                        <div className="mt-2 flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                          <span className="text-slate-400">País:</span>
                          <span className="text-amber-400 font-semibold">{currentUser.country === 'MZ' ? '🇲🇿 Moçambique' : currentUser.country}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-slate-400">Convite:</span>
                          <span className="text-amber-300 font-mono font-bold">{currentUser.referralCode}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleNavClick('profile')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <User className="w-4 h-4 text-amber-400" />
                        <span>{t('nav.profile') || 'Perfil / Definições'}</span>
                      </button>

                      <button
                        onClick={() => handleNavClick('balance')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        <span>{t('nav.balance') || 'Saldo de Pontos'}</span>
                      </button>

                      <button
                        onClick={() => handleNavClick('withdraw')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Wallet className="w-4 h-4" />
                        <span>{t('nav.withdraw') || 'Levantamento'}</span>
                      </button>

                      <button
                        onClick={() => handleNavClick('help')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-blue-400" />
                        <span>{t('nav.help') || 'Ajuda & Suporte'}</span>
                      </button>

                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => handleNavClick('admin')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span>{t('nav.admin') || 'Painel Admin'}</span>
                        </button>
                      )}

                      <div className="pt-1 mt-1 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{t('nav.logout')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenAuth}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs sm:text-sm hover:from-amber-400 hover:to-yellow-300 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{t('nav.login')}</span>
                  </button>
                  <button
                    onClick={() => quickLoginAsDemoUser('MZ')}
                    className="hidden sm:inline-flex text-xs px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                    title="Aceder em modo demonstração (Moçambique)"
                  >
                    Demo MZ 🇲🇿
                  </button>
                </div>
              )}

              {/* Mobile Burger Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                aria-label="Abrir Menu de Navegação"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Full Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950/98 border-b border-amber-500/20 px-4 pt-3 pb-8 space-y-3 max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-4">
            
            {/* User points summary in mobile menu */}
            {currentUser && (
              <div 
                onClick={() => handleNavClick('balance')}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-amber-950/40 border border-amber-500/40 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">O Seu Saldo</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-xl font-black text-amber-400">{points.toLocaleString()} PTS</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-400 font-bold">${approxUsd} USD</p>
                </div>
              </div>
            )}

            {/* List of the 8 Dedicated Pages */}
            <div className="space-y-1 pt-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">
                Menu Principal (8 Páginas)
              </p>
              
              {pagesList.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                      }`}>
                        {item.num}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{item.label}</span>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  </button>
                );
              })}
            </div>

            {/* Admin option if admin */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => handleNavClick('admin')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-red-400" />
                  <span>Painel do Administrador (/admin)</span>
                </div>
                <span>Aceder</span>
              </button>
            )}

            {/* If logged out, demo MZ option */}
            {!currentUser && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  quickLoginAsDemoUser('MZ');
                }}
                className="w-full py-3 px-3 rounded-xl bg-slate-900 border border-amber-500/30 text-xs font-bold text-amber-300 text-center"
              >
                🇲🇿 Entrar no Modo Demo Moçambique
              </button>
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar (Persistent Thumb Navigation for Smartphone Users) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-amber-500/20 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => handleNavClick('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
            activeTab === 'dashboard' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Início</span>
        </button>

        <button
          onClick={() => handleNavClick('earn')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
            activeTab === 'earn' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Coins className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Ganhar</span>
        </button>

        <button
          onClick={() => handleNavClick('balance')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
            activeTab === 'balance' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Saldo</span>
        </button>

        <button
          onClick={() => handleNavClick('withdraw')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
            activeTab === 'withdraw' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Levantar</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
            mobileMenuOpen ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Menu (8)</span>
        </button>
      </nav>
    </>
  );
};
