import React from 'react';
import { Globe2, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  const handleLink = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    } else {
      window.location.hash = `#${tab}`;
    }
  };

  return (
    <footer className="mt-16 border-t border-amber-500/20 bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleLink('dashboard')}>
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Globe2 className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-white">
                Earn<span className="text-amber-400">World</span>
              </span>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              {t('transparency.desc')}
            </p>

            <div className="flex items-center gap-2 text-xs text-amber-300/80 font-medium pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sem depósitos • Sem esquemas • 100% Gratuito</span>
            </div>
          </div>

          {/* 8 Dedicated Pages Navigation */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Páginas do EarnWorld
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li>
                <button onClick={() => handleLink('dashboard')} className="hover:text-amber-300 transition-colors">
                  1. Início (Dashboard)
                </button>
              </li>
              <li>
                <button onClick={() => handleLink('earn')} className="hover:text-amber-300 transition-colors">
                  2. Ganhar Pontos (Pesquisas, Ofertas, Anúncios)
                </button>
              </li>
              <li>
                <button onClick={() => handleLink('referrals')} className="hover:text-amber-300 transition-colors">
                  3. Indicar Amigos (+200 pts)
                </button>
              </li>
              <li>
                <button onClick={() => handleLink('balance')} className="hover:text-amber-300 transition-colors">
                  4. Saldo & Carteira (USD)
                </button>
              </li>
              <li>
                <button onClick={() => handleLink('withdraw')} className="hover:text-amber-300 transition-colors">
                  5. Levantamento (PayPal, Payoneer, USDT, Banco)
                </button>
              </li>
              <li>
                <button onClick={() => handleLink('history')} className="hover:text-amber-300 transition-colors">
                  6. Histórico de Transações
                </button>
              </li>
              <li>
                <button onClick={() => handleLink('profile')} className="hover:text-amber-300 transition-colors">
                  7. Perfil / Definições
                </button>
              </li>
              <li>
                <button onClick={() => handleLink('help')} className="hover:text-amber-300 transition-colors">
                  8. Ajuda & Suporte
                </button>
              </li>
            </ul>
          </div>

          {/* Payment Methods Info */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Métodos de Pagamento
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li className="flex items-center gap-1.5">
                <span>🇲🇿 M-Pesa (Vodacom Moçambique)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span>🇲🇿 e-Mola (Movitel Moçambique)</span>
              </li>
              <li>PayPal (Dólares USD)</li>
              <li>Payoneer (Dólares USD)</li>
              <li>USDT (TRC-20 & BEP-20)</li>
              <li>Transferência Bancária (BIM, BCI)</li>
            </ul>
          </div>

          {/* Legal / Rules */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Regras & Transparência
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li>1.000 pontos = US$ 1,00</li>
              <li>Levantamento mínimo: US$ 5,00</li>
              <li>Pontos são recompensas internas</li>
              <li>Zero taxas de depósito ou saque</li>
              <li>Tolerância zero a robôs ou fraudes</li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} EarnWorld Global Rewards. {t('footer.rights')}</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Moçambique 🇲🇿 & Comunidade Global</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
