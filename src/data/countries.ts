import { CountryInfo } from '../types';

export const COUNTRIES: CountryInfo[] = [
  {
    code: 'MZ',
    namePt: 'Moçambique',
    nameEn: 'Mozambique',
    flag: '🇲🇿',
    dialCode: '+258',
    currency: 'MZN',
    currencySymbol: 'MT',
    isPopular: true
  },
  {
    code: 'AO',
    namePt: 'Angola',
    nameEn: 'Angola',
    flag: '🇦🇴',
    dialCode: '+244',
    currency: 'AOA',
    currencySymbol: 'Kz',
    isPopular: true
  },
  {
    code: 'PT',
    namePt: 'Portugal',
    nameEn: 'Portugal',
    flag: '🇵🇹',
    dialCode: '+351',
    currency: 'EUR',
    currencySymbol: '€',
    isPopular: true
  },
  {
    code: 'BR',
    namePt: 'Brasil',
    nameEn: 'Brazil',
    flag: '🇧🇷',
    dialCode: '+55',
    currency: 'BRL',
    currencySymbol: 'R$',
    isPopular: true
  },
  {
    code: 'ZA',
    namePt: 'África do Sul',
    nameEn: 'South Africa',
    flag: '🇿🇦',
    dialCode: '+27',
    currency: 'ZAR',
    currencySymbol: 'R',
    isPopular: true
  },
  {
    code: 'US',
    namePt: 'Estados Unidos',
    nameEn: 'United States',
    flag: '🇺🇸',
    dialCode: '+1',
    currency: 'USD',
    currencySymbol: '$',
    isPopular: true
  },
  {
    code: 'CV',
    namePt: 'Cabo Verde',
    nameEn: 'Cape Verde',
    flag: '🇨🇻',
    dialCode: '+238',
    currency: 'CVE',
    currencySymbol: 'Esc'
  },
  {
    code: 'GW',
    namePt: 'Guiné-Bissau',
    nameEn: 'Guinea-Bissau',
    flag: '🇬🇼',
    dialCode: '+245',
    currency: 'XOF',
    currencySymbol: 'CFA'
  },
  {
    code: 'ST',
    namePt: 'São Tomé e Príncipe',
    nameEn: 'São Tomé and Príncipe',
    flag: '🇸🇹',
    dialCode: '+239',
    currency: 'STN',
    currencySymbol: 'Db'
  },
  {
    code: 'ZW',
    namePt: 'Zimbábue',
    nameEn: 'Zimbabwe',
    flag: '🇿🇼',
    dialCode: '+263',
    currency: 'USD',
    currencySymbol: '$'
  },
  {
    code: 'ZM',
    namePt: 'Zâmbia',
    nameEn: 'Zambia',
    flag: '🇿🇲',
    dialCode: '+260',
    currency: 'ZMW',
    currencySymbol: 'ZK'
  },
  {
    code: 'MW',
    namePt: 'Malawi',
    nameEn: 'Malawi',
    flag: '🇲🇼',
    dialCode: '+265',
    currency: 'MWK',
    currencySymbol: 'MK'
  },
  {
    code: 'TZ',
    namePt: 'Tanzânia',
    nameEn: 'Tanzania',
    flag: '🇹🇿',
    dialCode: '+255',
    currency: 'TZS',
    currencySymbol: 'TSh'
  },
  {
    code: 'KE',
    namePt: 'Quénia',
    nameEn: 'Kenya',
    flag: '🇰🇪',
    dialCode: '+254',
    currency: 'KES',
    currencySymbol: 'KSh'
  },
  {
    code: 'NG',
    namePt: 'Nigéria',
    nameEn: 'Nigeria',
    flag: '🇳🇬',
    dialCode: '+234',
    currency: 'NGN',
    currencySymbol: '₦'
  },
  {
    code: 'GB',
    namePt: 'Reino Unido',
    nameEn: 'United Kingdom',
    flag: '🇬🇧',
    dialCode: '+44',
    currency: 'GBP',
    currencySymbol: '£'
  },
  {
    code: 'CA',
    namePt: 'Canadá',
    nameEn: 'Canada',
    flag: '🇨🇦',
    dialCode: '+1',
    currency: 'CAD',
    currencySymbol: 'CA$'
  },
  {
    code: 'ES',
    namePt: 'Espanha',
    nameEn: 'Spain',
    flag: '🇪🇸',
    dialCode: '+34',
    currency: 'EUR',
    currencySymbol: '€'
  },
  {
    code: 'FR',
    namePt: 'França',
    nameEn: 'France',
    flag: '🇫🇷',
    dialCode: '+33',
    currency: 'EUR',
    currencySymbol: '€'
  },
  {
    code: 'DE',
    namePt: 'Alemanha',
    nameEn: 'Germany',
    flag: '🇩🇪',
    dialCode: '+49',
    currency: 'EUR',
    currencySymbol: '€'
  },
  {
    code: 'IN',
    namePt: 'Índia',
    nameEn: 'India',
    flag: '🇮🇳',
    dialCode: '+91',
    currency: 'INR',
    currencySymbol: '₹'
  },
  {
    code: 'AE',
    namePt: 'Emirados Árabes Unidos',
    nameEn: 'United Arab Emirates',
    flag: '🇦🇪',
    dialCode: '+971',
    currency: 'AED',
    currencySymbol: 'AED'
  }
];

export const getCountryByCode = (code: string): CountryInfo => {
  return COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
};
