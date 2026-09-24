import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Coins, 
  Wallet, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  RotateCw, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  Sparkles,
  PlaySquare,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Transaction, WithdrawalRequest } from '../../types';
import { storageService } from '../../services/storageService';

interface HistoryPageProps {
  onOpenAuth: () => void;
  setActiveTab: (tab: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenAuth, setActiveTab }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveFilterTab] = useState<'all' | 'earnings' | 'withdrawals'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [txs, wds] = await Promise.all([
        storageService.getUserTransactions(currentUser.id),
        storageService.getUserWithdrawals(currentUser.id)
      ]);
      setTransactions(txs);
      setWithdrawals(wds);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center max-w-lg mx-auto space-y-4 my-12">
        <Clock className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Histórico de Atividades</h2>
        <p className="text-xs text-slate-400">
          Inicie sessão para visualizar o seu extrato completo de ganhos e levantamentos.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400"
        >
          Entrar na Conta
        </button>
      </div>
    );
  }

  // Filter lists based on search
  const filteredWithdrawals = withdrawals.filter(w => 
    w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" /> Pago
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <CheckCircle2 className="w-3 h-3" /> Aprovado
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <XCircle className="w-3 h-3" /> Rejeitado
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Clock className="w-3 h-3" /> Pendente
          </span>
        );
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'ad_reward':
        return <PlaySquare className="w-4 h-4 text-amber-400" />;
      case 'checkin':
        return <Calendar className="w-4 h-4 text-yellow-400" />;
      case 'referral':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'withdrawal':
        return <Wallet className="w-4 h-4 text-rose-400" />;
      default:
        return <Coins className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Extrato Auditável da Conta</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Histórico de Movimentações</h1>
          <p className="text-xs text-slate-400 mt-1">Acompanhe todos os seus pontos recebidos e o estado dos seus levantamentos em tempo real.</p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-2 transition-colors"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-2 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveFilterTab('all')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas ({transactions.length + withdrawals.length})
          </button>
          <button
            onClick={() => setActiveFilterTab('earnings')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'earnings'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ganhos ({transactions.length})
          </button>
          <button
            onClick={() => setActiveFilterTab('withdrawals')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'withdrawals'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Levantamentos ({withdrawals.length})
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar histórico..."
            className="w-full sm:w-64 px-3 py-1.5 pl-8 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none focus:border-amber-400"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Withdrawals List (if tab is all or withdrawals) */}
      {(activeTab === 'all' || activeTab === 'withdrawals') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            <span>Pedidos de Levantamento ({filteredWithdrawals.length})</span>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">Nenhum pedido de levantamento encontrado.</p>
              <p className="text-xs text-slate-400 mt-1">Quando atingir 5.000 pontos, pode solicitar o seu primeiro pagamento.</p>
              <button
                onClick={() => setActiveTab('withdraw')}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30"
              >
                Solicitar Levantamento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawals.map((w) => (
                <div
                  key={w.id}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">Levantamento {w.paymentMethod.toUpperCase()}</span>
                        {getStatusBadge(w.status)}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        Conta: {w.accountDetails}
                      </p>
                      {w.statusMessage && (
                        <p className="text-[11px] text-amber-300 mt-1">
                          Nota: {w.statusMessage}
                        </p>
                      )}
                      {w.txReference && (
                        <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                          Ref: {w.txReference}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        Solicitado em: {new Date(w.createdAt).toLocaleDateString()} às {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <p className="text-base font-black text-rose-400">-{w.pointsDeducted.toLocaleString()} PTS</p>
                    <p className="text-xs font-bold text-white">US$ {w.amountUsd.toFixed(2)}</p>
                    <p className="text-xs text-emerald-400 font-semibold">{w.amountMzn.toFixed(2)} MT</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Points Transactions List (if tab is all or earnings) */}
      {(activeTab === 'all' || activeTab === 'earnings') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            <span>Créditos & Ganhos de Pontos ({filteredTransactions.length})</span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <Coins className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">Nenhum ganho registado ainda.</p>
              <p className="text-xs text-slate-400 mt-1">Comece por fazer o check-in diário ou assistir a um anúncio.</p>
              <button
                onClick={() => setActiveTab('earn')}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
              >
                Ganhar Pontos Agora
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      {getCategoryIcon(tx.type)}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">{tx.description}</h4>
                      <p className="text-[11px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString()} • {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-sm sm:text-base font-black ${tx.points >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {tx.points >= 0 ? `+${tx.points.toLocaleString()}` : tx.points.toLocaleString()} PTS
                    </span>
                    <p className="text-[10px] text-slate-400">
                      ≈ ${Math.abs(tx.points / 1000).toFixed(2)} USD
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
