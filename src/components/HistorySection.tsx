import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Coins, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Transaction, WithdrawalRequest } from '../types';
import { storageService } from '../services/storageService';

export const HistorySection: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'all' | 'earnings' | 'withdrawals'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [txs, wths] = await Promise.all([
        storageService.getUserTransactions(currentUser.id),
        storageService.getUserWithdrawals(currentUser.id)
      ]);
      setTransactions(txs);
      setWithdrawals(wths);
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
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-3">
        <Clock className="w-10 h-10 text-slate-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Histórico de Atividade</h3>
        <p className="text-xs text-slate-400">Inicie sessão para visualizar os seus ganhos e pedidos de levantamento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header and Controls */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>Extrato de Pontos & Histórico de Levantamentos</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registo auditável de todas as recompensas creditadas e pedidos de pagamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub tabs */}
          <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ganhos
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'withdrawals' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Levantamentos ({withdrawals.length})
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main List */}
      {activeTab === 'withdrawals' ? (
        /* Withdrawals List */
        <div className="space-y-3">
          {withdrawals.length === 0 ? (
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-400 text-xs">
              Nenhum pedido de levantamento registado até o momento.
            </div>
          ) : (
            withdrawals.map((wth) => {
              const statusColors = {
                pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                approved: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              };

              return (
                <div
                  key={wth.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white uppercase">{wth.paymentMethod}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[wth.status]}`}>
                          {wth.status === 'pending' ? t('admin.status_pending') :
                           wth.status === 'approved' ? t('admin.status_approved') :
                           wth.status === 'paid' ? t('admin.status_paid') : t('admin.status_rejected')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">{wth.accountDetails}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(wth.createdAt).toLocaleString()}
                        {wth.statusMessage && (
                          <span className="text-amber-400/90 ml-2 font-medium">
                            • {wth.statusMessage}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <span className="text-base font-black text-white">${wth.amountUsd.toFixed(2)} USD</span>
                    <p className="text-xs text-emerald-400 font-bold">{wth.amountMzn.toFixed(2)} MT</p>
                    <p className="text-[10px] text-slate-400">-{wth.pointsDeducted.toLocaleString()} PTS</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Earnings Ledger */
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-400 text-xs">
              Nenhuma transação registada ainda. Complete tarefas para ver os seus ganhos aqui!
            </div>
          ) : (
            transactions.map((tx) => {
              const isPositive = tx.points >= 0;
              return (
                <div
                  key={tx.id}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isPositive ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-white">{tx.description}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString()} • Tipo: {tx.type}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-sm sm:text-base font-black ${
                      isPositive ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {isPositive ? `+${tx.points.toLocaleString()}` : tx.points.toLocaleString()} PTS
                    </span>
                    <p className="text-[11px] text-slate-400">
                      ≈ ${(Math.abs(tx.points) / 1000).toFixed(2)} USD
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
};
