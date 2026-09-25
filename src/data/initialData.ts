import { AppConfig, PaymentMethodConfig, TaskItem } from '../types';

export const DEFAULT_CONFIG: AppConfig = {
  usdToMznRate: 64.0,              // 1 USD = 64.00 MZN (Admin configurable)
  availableRealRevenueUsd: 0.00,   // Real liquid funds available to honor payouts (Strictly from real Monetag revenue / verified deposits)
  estimatedAdRevenueUsd: 0.00,     // Real ad network revenues
  minWithdrawalPoints: 5000,        // 5000 pts = $5.00
  pointsPerDollar: 1000,            // 1000 pts = $1.00
  dailyCheckInPoints: 35,
  adRewardPoints: 25,
  referralBonusPoints: 200,
  maxAdsPerHour: 8,
  adNetworkProvider: 'monetag',
  monetagZoneId: 'a4e055c2c97843f0ed63fb4bbdb75683',
  admobPublisherId: 'ca-pub-monetization-partner',
  admobSlotId: 'rewarded_slot_web'
};

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'mpesa',
    name: 'M-Pesa (Moçambique)',
    descriptionPt: 'Levantamento direto para carteira móvel Vodacom M-Pesa em Meticais (MT).',
    descriptionEn: 'Direct payout to your Vodacom M-Pesa mobile wallet in Mozambican Meticais (MZN).',
    minUsd: 5,
    supportedCountries: ['MZ'],
    currencyTarget: 'MZN',
    fields: [
      {
        id: 'phone',
        labelPt: 'Número M-Pesa (Vodacom)',
        labelEn: 'M-Pesa Phone Number',
        placeholder: '84XXXXXXX ou 85XXXXXXX',
        type: 'tel',
        pattern: '^[8][45][0-9]{7}$',
        helpTextPt: 'Insira o número de 9 dígitos Vodacom registado no seu M-Pesa.',
        helpTextEn: 'Enter your 9-digit Vodacom mobile number registered on M-Pesa.'
      },
      {
        id: 'name',
        labelPt: 'Nome Titular da Conta',
        labelEn: 'Account Holder Full Name',
        placeholder: 'Ex: Manuel António',
        type: 'text'
      }
    ]
  },
  {
    id: 'emola',
    name: 'e-Mola (Moçambique)',
    descriptionPt: 'Levantamento direto para carteira móvel Movitel e-Mola em Meticais (MT).',
    descriptionEn: 'Direct payout to your Movitel e-Mola mobile wallet in Mozambican Meticais (MZN).',
    minUsd: 5,
    supportedCountries: ['MZ'],
    currencyTarget: 'MZN',
    fields: [
      {
        id: 'phone',
        labelPt: 'Número e-Mola (Movitel)',
        labelEn: 'e-Mola Phone Number',
        placeholder: '86XXXXXXX ou 87XXXXXXX',
        type: 'tel',
        pattern: '^[8][67][0-9]{7}$',
        helpTextPt: 'Insira o número de 9 dígitos Movitel registado no seu e-Mola.',
        helpTextEn: 'Enter your 9-digit Movitel mobile number registered on e-Mola.'
      },
      {
        id: 'name',
        labelPt: 'Nome Titular da Conta',
        labelEn: 'Account Holder Full Name',
        placeholder: 'Ex: Amélia Sitoe',
        type: 'text'
      }
    ]
  },
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
  },
  {
    id: 'bank',
    name: 'Transferência Bancária',
    descriptionPt: 'Transferência direta para bancos em Moçambique (BCI, BIM, Standard, Moza) ou internacionais.',
    descriptionEn: 'Direct transfer to local banks in Mozambique (BCI, BIM, Standard Bank) or international IBAN.',
    minUsd: 10,
    supportedCountries: ['*'],
    currencyTarget: 'MZN',
    fields: [
      {
        id: 'bankName',
        labelPt: 'Nome do Banco',
        labelEn: 'Bank Name',
        placeholder: 'Ex: Millennium BIM, BCI, Standard Bank Moçambique',
        type: 'text'
      },
      {
        id: 'account',
        labelPt: 'Número de Conta / NIB / IBAN',
        labelEn: 'Account Number / NIB / IBAN',
        placeholder: 'Insira o número completo',
        type: 'text'
      },
      {
        id: 'holder',
        labelPt: 'Nome do Beneficiário',
        labelEn: 'Beneficiary Full Name',
        placeholder: 'Nome completo no banco',
        type: 'text'
      }
    ]
  }
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'survey-cpx-101',
    title: 'Moçambique Consumer Insights & Mobile Money',
    titlePt: 'Hábitos de Consumo e Carteiras Móveis em Moçambique',
    description: 'Share your feedback on everyday mobile money usage and telecom providers.',
    descriptionPt: 'Partilhe a sua opinião sobre o uso de M-Pesa, e-Mola e operadoras móveis.',
    category: 'survey',
    rewardPoints: 850,
    estimatedMinutes: 8,
    partner: 'CPX Research',
    isActive: true,
    badge: 'Popular em MZ'
  },
  {
    id: 'survey-tech-102',
    title: 'Global Tech & Smartphone App Study',
    titlePt: 'Estudo Global sobre Uso de Smartphones e Apps',
    description: 'Answer questions about the digital services you use most frequently on mobile.',
    descriptionPt: 'Responda a perguntas sobre as aplicações móveis que utiliza no dia a dia.',
    category: 'survey',
    rewardPoints: 1200,
    estimatedMinutes: 12,
    partner: 'BitLabs',
    isActive: true,
    badge: 'Alta Recompensa'
  },
  {
    id: 'survey-shopping-103',
    title: 'Retail Trends & E-commerce Survey',
    titlePt: 'Tendências de Compras e Comércio Eletrónico',
    description: 'Quick poll about online delivery preferences, retail shops, and payments.',
    descriptionPt: 'Pesquisa rápida sobre encomendas online e compras locais.',
    category: 'survey',
    rewardPoints: 450,
    estimatedMinutes: 5,
    partner: 'Pollfish',
    isActive: true
  },
  {
    id: 'offer-crypto-201',
    title: 'Register & Verify Free Web3 Wallet',
    titlePt: 'Registo e Verificação de Carteira Web3 Gratuita',
    description: 'Create a free decentralized wallet and verify your recovery phrase to earn points.',
    descriptionPt: 'Crie uma carteira digital segura e confirme a sua frase de segurança.',
    category: 'offer',
    rewardPoints: 2500,
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
    rewardPoints: 1400,
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
    rewardPoints: 300,
    estimatedMinutes: 2,
    partner: 'RevenueUniverse',
    isActive: true
  },
  {
    id: 'social-follow-301',
    title: 'Join EarnWorld Official Telegram Community',
    titlePt: 'Aderir à Comunidade Oficial EarnWorld no Telegram',
    description: 'Join the announcement channel for promo codes, alerts, and proofs.',
    descriptionPt: 'Junte-se ao canal oficial para receber códigos promocionais e atualizações.',
    category: 'special',
    rewardPoints: 150,
    estimatedMinutes: 1,
    partner: 'EarnWorld',
    isActive: true,
    badge: 'Rápido'
  }
];
