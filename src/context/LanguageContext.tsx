import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'pt' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Brand & General
    'brand.name': 'EarnWorld',
    'brand.tagline': 'Global Rewards',
    'brand.subtitle': 'Plataforma transparente de recompensas com suporte para Moçambique e todo o mundo.',
    'points.disclaimer': 'Os pontos são recompensas internas e não representam dinheiro garantido.',
    'points.ratio': '1.000 pontos = US$1,00',
    'rate.usd_mzn': 'Cotação: US$1 = {rate} MZN',
    
    // Auth & Navigation
    'nav.dashboard': 'Início / Painel',
    'nav.earn': 'Ganhar Pontos',
    'nav.tasks': 'Tarefas & Pesquisas',
    'nav.ads': 'Assistir Anúncios',
    'nav.referrals': 'Indicar Amigos',
    'nav.balance': 'Saldo',
    'nav.withdraw': 'Levantamento',
    'nav.history': 'Histórico',
    'nav.profile': 'Perfil & Definições',
    'nav.help': 'Ajuda & Suporte',
    'nav.admin': 'Painel Admin',
    'nav.login': 'Entrar',
    'nav.register': 'Criar Conta',
    'nav.logout': 'Terminar Sessão',

    // Hero & Balance
    'balance.title': 'Saldo de Pontos',
    'balance.approx_usd': 'Aprox. em Dólares',
    'balance.approx_mzn': 'Aprox. em Meticais (MZ)',
    'balance.total_earned': 'Total Ganho',
    'balance.total_withdrawn': 'Total Levantado',
    'checkin.title': 'Check-in Diário',
    'checkin.claim': 'Reclamar Bónus Diário',
    'checkin.claimed_today': 'Check-in Realizado Hoje',
    'checkin.streak': 'Sequência: {days} dias seguidos',
    'checkin.next_in': 'Próximo check-in em:',

    // Ads
    'ads.title': 'Anúncios Recompensados',
    'ads.desc': 'Assista a anúncios voluntariamente e ganhe pontos internos para a sua conta.',
    'ads.watch_btn': 'Assistir Anúncio (+{pts} Pontos)',
    'ads.cooldown': 'Aguarde {seconds}s para o próximo anúncio',
    'ads.disclaimer': 'Visualizações voluntárias e válidas atribuem pontos. A receita dos anúncios pertence primeiro ao EarnWorld para abastecer a reserva real de liquidez.',
    'ads.anti_abuse': 'Proteção antifraude ativa. Cliques artificiais ou bots resultam em suspensão imediata.',
    'ads.playing': 'A reproduzir anúncio verificado...',
    'ads.remaining': 'Tempo restante: {seconds}s',
    'ads.confirm_interaction': 'Clique para confirmar visualização humana',
    'ads.success': 'Parabéns! Ganhou {pts} pontos com sucesso.',

    // Withdrawals
    'withdraw.title': 'Solicitar Levantamento',
    'withdraw.subtitle': 'Selecione o método de pagamento conforme o seu país.',
    'withdraw.min_notice': 'Levantamento mínimo: US$5 (5.000 pontos)',
    'withdraw.choose_method': 'Escolha o Método de Pagamento',
    'withdraw.amount_pts': 'Quantidade de Pontos a Converter',
    'withdraw.equivalent_usd': 'Valor em USD',
    'withdraw.equivalent_mzn': 'Valor em Meticais (MZN)',
    'withdraw.liquidity_status': 'Estado de Liquidez da Reserva',
    'withdraw.liquidity_guarantee': 'Regra de Transparência: Só pagamos levantamentos usando receita real disponível. Nunca geramos dinheiro fictício.',
    'withdraw.submit_btn': 'Confirmar Pedido de Levantamento',
    'withdraw.waiting_revenue': 'Aguardando receita disponível para pagamento.',
    'withdraw.success': 'Pedido de levantamento registado com sucesso!',

    // Errors & Validations
    'error.invalid_credentials': 'Email ou senha incorretos.',
    'error.email_already_registered': 'Este email já está registado.',
    'error.invalid_code': 'Código de verificação inválido.',
    'error.invalid_referral': 'Código de convite inválido.',
    'error.task_failed': 'Não foi possível concluir a tarefa.',
    'error.insufficient_balance': 'Saldo insuficiente.',
    'error.min_withdrawal': 'O levantamento mínimo é de US$5.',
    'error.waiting_revenue': 'Aguardando receita disponível para pagamento.',
    'error.method_unavailable_country': 'Método de pagamento indisponível no seu país.',
    'error.network': 'Ocorreu um erro de rede. Tente novamente.',
    'error.banned': 'Esta conta foi suspensa pelo sistema antifraude.',

    // Referral
    'ref.title': 'Programa de Convites & Afiliados',
    'ref.subtitle': 'Convide amigos para o EarnWorld e receba bónus de pontos por cada indicação ativa.',
    'ref.code_label': 'O Seu Código de Convite:',
    'ref.link_label': 'O Seu Link Direto:',
    'ref.copy': 'Copiar',
    'ref.copied': 'Copiado!',
    'ref.whatsapp': 'Partilhar no WhatsApp',
    'ref.telegram': 'Partilhar no Telegram',
    'ref.stats_invited': 'Amigos Convidados',
    'ref.stats_earned': 'Pontos Obtidos de Bónus',

    // Admin
    'admin.portal_title': 'Painel Administrativo EarnWorld',
    'admin.revenue_available': 'Receita Real Disponível (Liquidez)',
    'admin.revenue_estimated': 'Receita Estimada de Anúncios',
    'admin.revenue_note': 'A receita estimada NÃO é saldo disponível para pagamentos.',
    'admin.treasury_deposit': 'Adicionar Liquidez Real (Depósito)',
    'admin.usd_mzn_rate': 'Taxa de Câmbio USD / MZN',
    'admin.save_rate': 'Atualizar Taxa',
    'admin.withdrawals_tab': 'Levantamentos',
    'admin.users_tab': 'Utilizadores',
    'admin.fraud_tab': 'Sistema Antifraude',
    'admin.config_tab': 'Configurações Globais',
    'admin.approve': 'Aprovar',
    'admin.mark_paid': 'Marcar como Pago',
    'admin.reject': 'Rejeitar',
    'admin.status_pending': 'Pendente',
    'admin.status_approved': 'Aprovado',
    'admin.status_paid': 'Pago',
    'admin.status_rejected': 'Rejeitado',
    'admin.status_waiting': 'Aguardando Receita',

    // Transparency
    'transparency.title': 'Transparência Financeira & Regras',
    'transparency.desc': 'O EarnWorld opera sob estrita transparência: as recompensas em pontos derivam de verbas publicitárias reais e parcerias pagas. Nenhum utilizador precisa depositar dinheiro para usar a plataforma.',
    'footer.rights': 'Todos os direitos reservados. EarnWorld Global Rewards.'
  },
  en: {
    // Brand & General
    'brand.name': 'EarnWorld',
    'brand.tagline': 'Global Rewards',
    'brand.subtitle': 'Transparent rewards platform supporting Mozambique and worldwide members.',
    'points.disclaimer': 'Points are internal reward units and do not represent guaranteed cash.',
    'points.ratio': '1,000 points = US$1.00',
    'rate.usd_mzn': 'Rate: US$1 = {rate} MZN',

    // Auth & Navigation
    'nav.dashboard': 'Home / Dashboard',
    'nav.earn': 'Earn Points',
    'nav.tasks': 'Tasks & Surveys',
    'nav.ads': 'Watch Ads',
    'nav.referrals': 'Refer Friends',
    'nav.balance': 'Balance',
    'nav.withdraw': 'Withdrawal',
    'nav.history': 'History',
    'nav.profile': 'Profile & Settings',
    'nav.help': 'Help & Support',
    'nav.admin': 'Admin Panel',
    'nav.login': 'Sign In',
    'nav.register': 'Create Account',
    'nav.logout': 'Sign Out',

    // Hero & Balance
    'balance.title': 'Points Balance',
    'balance.approx_usd': 'Approx. in US Dollars',
    'balance.approx_mzn': 'Approx. in Mozambican Meticais (MZ)',
    'balance.total_earned': 'Total Earned',
    'balance.total_withdrawn': 'Total Withdrawn',
    'checkin.title': 'Daily Check-in',
    'checkin.claim': 'Claim Daily Bonus',
    'checkin.claimed_today': 'Check-in Completed Today',
    'checkin.streak': 'Streak: {days} consecutive days',
    'checkin.next_in': 'Next check-in in:',

    // Ads
    'ads.title': 'Rewarded Ads',
    'ads.desc': 'Voluntarily watch ads and earn internal reward points for your account.',
    'ads.watch_btn': 'Watch Video Ad (+{pts} Points)',
    'ads.cooldown': 'Please wait {seconds}s before next ad',
    'ads.disclaimer': 'Voluntary, valid views award points. Ad revenue belongs first to EarnWorld to fund the real liquid treasury pool.',
    'ads.anti_abuse': 'Anti-fraud protection active. Artificial clicks or bots trigger immediate account suspension.',
    'ads.playing': 'Playing verified sponsor ad...',
    'ads.remaining': 'Time remaining: {seconds}s',
    'ads.confirm_interaction': 'Click to confirm human verification',
    'ads.success': 'Congratulations! You earned {pts} points.',

    // Withdrawals
    'withdraw.title': 'Request Withdrawal',
    'withdraw.subtitle': 'Select a payout method suitable for your country.',
    'withdraw.min_notice': 'Minimum withdrawal: US$5 (5,000 points)',
    'withdraw.choose_method': 'Choose Payment Method',
    'withdraw.amount_pts': 'Amount of Points to Convert',
    'withdraw.equivalent_usd': 'Amount in USD',
    'withdraw.equivalent_mzn': 'Amount in Meticais (MZN)',
    'withdraw.liquidity_status': 'Treasury Liquidity Status',
    'withdraw.liquidity_guarantee': 'Transparency Rule: We only pay withdrawals using real available liquid revenue. Fictitious money is never generated.',
    'withdraw.submit_btn': 'Submit Withdrawal Request',
    'withdraw.waiting_revenue': 'Aguardando receita disponível para pagamento.',
    'withdraw.success': 'Withdrawal request submitted successfully!',

    // Errors & Validations
    'error.invalid_credentials': 'Email ou senha incorretos.',
    'error.email_already_registered': 'Este email já está registado.',
    'error.invalid_code': 'Código de verificação inválido.',
    'error.invalid_referral': 'Código de convite inválido.',
    'error.task_failed': 'Não foi possível concluir a tarefa.',
    'error.insufficient_balance': 'Saldo insuficiente.',
    'error.min_withdrawal': 'O levantamento mínimo é de US$5.',
    'error.waiting_revenue': 'Aguardando receita disponível para pagamento.',
    'error.method_unavailable_country': 'Método de pagamento indisponível no seu país.',
    'error.network': 'Network error occurred. Please try again.',
    'error.banned': 'This account has been suspended by anti-fraud filters.',

    // Referral
    'ref.title': 'Referral & Affiliate Program',
    'ref.subtitle': 'Invite friends to EarnWorld and earn bonus points for each active referral.',
    'ref.code_label': 'Your Referral Code:',
    'ref.link_label': 'Your Direct Referral Link:',
    'ref.copy': 'Copy',
    'ref.copied': 'Copied!',
    'ref.whatsapp': 'Share on WhatsApp',
    'ref.telegram': 'Share on Telegram',
    'ref.stats_invited': 'Friends Invited',
    'ref.stats_earned': 'Bonus Points Earned',

    // Admin
    'admin.portal_title': 'EarnWorld Admin Control Panel',
    'admin.revenue_available': 'Real Liquid Revenue Available',
    'admin.revenue_estimated': 'Estimated Ad Network Revenue',
    'admin.revenue_note': 'Estimated revenue is NOT liquid balance available for payments.',
    'admin.treasury_deposit': 'Inject Real Treasury Liquidity',
    'admin.usd_mzn_rate': 'USD / MZN Exchange Rate',
    'admin.save_rate': 'Update Rate',
    'admin.withdrawals_tab': 'Withdrawals',
    'admin.users_tab': 'Users',
    'admin.fraud_tab': 'Anti-Fraud System',
    'admin.config_tab': 'Global Settings',
    'admin.approve': 'Approve',
    'admin.mark_paid': 'Mark as Paid',
    'admin.reject': 'Reject',
    'admin.status_pending': 'Pending',
    'admin.status_approved': 'Approved',
    'admin.status_paid': 'Paid',
    'admin.status_rejected': 'Rejected',
    'admin.status_waiting': 'Waiting Real Revenue',

    // Transparency
    'transparency.title': 'Financial Transparency & Rules',
    'transparency.desc': 'EarnWorld operates with strict honesty: reward points stem from verified sponsor budgets and ad earnings. Users are never asked for deposits or fees.',
    'footer.rights': 'All rights reserved. EarnWorld Global Rewards.'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'pt',
  setLang: () => {},
  t: (key) => key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('earnworld_lang');
    return (saved === 'en' || saved === 'pt') ? saved : 'pt';
  });

  useEffect(() => {
    localStorage.setItem('earnworld_lang', lang);
  }, [lang]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[lang]?.[key] || translations['pt']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
