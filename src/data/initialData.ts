import { AppConfig, PaymentMethodConfig, TaskItem } from '../types';

export const DEFAULT_CONFIG: AppConfig = {
  paymentFundUsd: 0.00,           // Fundo real disponível para pagamentos (reservado pelo administrador ou sincronizado da Monetag)
  availableRealRevenueUsd: 0.00,  // Receita líquida real disponível
  estimatedAdRevenueUsd: 0.00,    // Receita de anúncios apurada
  minWithdrawalPoints: 5000,      // 5000 pts = $5.00
  pointsPerDollar: 1000,          // 1000 pts = $1.00
  dailyCheckInPoints: 35,
  adRewardPoints: 25,
  referralBonusPoints: 200,
  maxAdsPerHour: 8,
  adNetworkProvider: 'monetag',
  monetagZoneId: '286702',
  admobPublisherId: 'ca-pub-monetization-partner',
  admobSlotId: 'rewarded_slot_web'
};

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'paypal',
    name: 'PayPal (Global)',
    descriptionPt: 'Transferência rápida em dólares americanos (USD) para a sua conta PayPal.',
    descriptionEn: 'Fast transfer in US Dollars (USD) directly to your verified PayPal account.',
    minUsd: 5,
    supportedCountries: ['*'],
    currencyTarget: 'USD',
    fields: [
      {
        id: 'email',
        labelPt: 'Email da Conta PayPal',
        labelEn: 'PayPal Account Email',
        placeholder: 'seu-email@exemplo.com',
        type: 'email',
        helpTextPt: 'Certifique-se de que a conta PayPal pode receber pagamentos em USD.',
        helpTextEn: 'Ensure your PayPal account can receive USD payments.'
      }
    ]
  },
  {
    id: 'payoneer',
    name: 'Payoneer (Global)',
    descriptionPt: 'Receba pagamentos comerciais em USD diretamente na sua conta Payoneer.',
    descriptionEn: 'Receive commercial payout in USD to your registered Payoneer email.',
    minUsd: 10,
    supportedCountries: ['*'],
    currencyTarget: 'USD',
    fields: [
      {
        id: 'email',
        labelPt: 'Email da Conta Payoneer',
        labelEn: 'Payoneer Account Email',
        placeholder: 'payoneer@exemplo.com',
        type: 'email'
      }
    ]
  },
  {
    id: 'usdt',
    name: 'USDT (Tether Crypto)',
    descriptionPt: 'Pagamento em criptomoeda estável USDT na rede TRC-20 ou BEP-20.',
    descriptionEn: 'Stablecoin payout in USDT on TRC-20 or BEP-20 networks.',
    minUsd: 5,
    supportedCountries: ['*'],
    currencyTarget: 'USDT',
    fields: [
      {
        id: 'wallet',
        labelPt: 'Endereço da Carteira USDT (TRC-20 ou BEP-20)',
        labelEn: 'USDT Wallet Address (TRC-20 or BEP-20)',
        placeholder: 'T... ou 0x...',
        type: 'text',
        helpTextPt: 'Verifique cuidadosamente a rede para evitar perda de fundos.',
        helpTextEn: 'Verify your wallet network carefully to prevent loss of funds.'
      },
      {
        id: 'network',
        labelPt: 'Rede',
        labelEn: 'Network',
        placeholder: 'TRC-20 (Tron) ou BEP-20 (BNB Chain)',
        type: 'text'
      }
    ]
  }
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'survey-cpx-101',
    title: 'Digital Payments & Consumer Habits',
    titlePt: 'Hábitos de Consumo e Pagamentos Digitais',
    description: 'Share your feedback on everyday online payments, wallets, and telecom services.',
    descriptionPt: 'Partilhe a sua opinião sobre carteiras digitais, serviços online e transferências.',
    category: 'survey',
    rewardPoints: 60,
    estimatedMinutes: 8,
    partner: 'CPX Research',
    isActive: true,
    badge: 'Popular'
  },
  {
    id: 'survey-tech-102',
    title: 'Global Tech & Smartphone App Study',
    titlePt: 'Estudo Global sobre Uso de Smartphones e Apps',
    description: 'Answer questions about the digital services you use most frequently on mobile.',
    descriptionPt: 'Responda a perguntas sobre as aplicações móveis que utiliza no dia a dia.',
    category: 'survey',
    rewardPoints: 80,
    estimatedMinutes: 12,
    partner: 'BitLabs',
    isActive: true,
    badge: 'Destaque'
  },
  {
    id: 'survey-shopping-103',
    title: 'Retail Trends & E-commerce Survey',
    titlePt: 'Tendências de Compras e Comércio Eletrónico',
    description: 'Quick poll about online delivery preferences, retail shops, and payments.',
    descriptionPt: 'Pesquisa rápida sobre encomendas online e hábitos de consumo.',
    category: 'survey',
    rewardPoints: 45,
    estimatedMinutes: 5,
    partner: 'Pollfish',
    isActive: true
  },
  {
    id: 'survey-media-104',
    title: 'Digital Media & Streaming Preferences',
    titlePt: 'Preferências de Streaming e Conteúdo Digital',
    description: 'Share your habits regarding video streaming platforms, podcasts, and digital news.',
    descriptionPt: 'Avalie plataformas de streaming, áudio e consumo de conteúdos na web.',
    category: 'survey',
    rewardPoints: 55,
    estimatedMinutes: 7,
    partner: 'TheoremReach',
    isActive: true
  },
  {
    id: 'offer-crypto-201',
    title: 'Register & Verify Free Web3 Wallet',
    titlePt: 'Registo e Verificação de Carteira Web3 Gratuita',
    description: 'Create a free decentralized wallet and verify your recovery phrase to earn points.',
    descriptionPt: 'Crie uma carteira digital segura e confirme a sua frase de segurança.',
    category: 'offer',
    rewardPoints: 120,
    estimatedMinutes: 10,
    partner: 'OfferToro',
    isActive: true,
    badge: 'Super Oferta'
  },
  {
    id: 'offer-game-202',
    title: 'Play Brain Puzzle: Reach Level 5',
    titlePt: 'Jogo de Raciocínio: Atingir Nível 5',
    description: 'Install and reach level 5 in the partner logic game.',
    descriptionPt: 'Instale e complete 5 níveis no jogo parceiro de raciocínio e estratégia.',
    category: 'offer',
    rewardPoints: 90,
    estimatedMinutes: 15,
    partner: 'AdGate Media',
    isActive: true
  },
  {
    id: 'offer-newsletter-203',
    title: 'Subscribe to Finance Weekly Briefing',
    titlePt: 'Subscrição da Newsletter Semanal de Finanças',
    description: 'Confirm your email subscription to receive free market updates.',
    descriptionPt: 'Confirme o seu email na newsletter com dicas de finanças pessoais.',
    category: 'offer',
    rewardPoints: 35,
    estimatedMinutes: 2,
    partner: 'RevenueUniverse',
    isActive: true
  },
  {
    id: 'social-follow-301',
    title: 'Join EarnWorld Official Telegram Community',
    titlePt: 'Aderir à Comunidade Oficial EarnWorld no Telegram',
    description: 'Join the announcement channel for promo codes, alerts, and proofs.',
    descriptionPt: 'Junte-se ao canal oficial para receber códigos promocionais e avisos.',
    category: 'special',
    rewardPoints: 25,
    estimatedMinutes: 1,
    partner: 'EarnWorld',
    isActive: true,
    badge: 'Rápido'
  }
];
