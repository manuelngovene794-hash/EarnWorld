import { AppConfig } from '../types';
import { storageService } from './storageService';

export interface ExchangeRateResult {
  success: boolean;
  rate: number;
  lastUpdated: string;
  provider: string;
  message?: string;
}

export const exchangeRateService = {
  /**
   * Fetches real-time USD/MZN exchange rate from reliable sources.
   * Primary: open.er-api.com (updated daily)
   * Fallback: api.exchangerate-api.com
   * Server endpoint: /api/exchange-rate/sync
   */
  async fetchLiveUsdToMznRate(): Promise<ExchangeRateResult | null> {
    // 1. Try Primary Public Open Forex API
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        const mznRate = Number(data?.rates?.MZN);
        if (mznRate && !isNaN(mznRate) && mznRate > 30 && mznRate < 120) {
          const roundedRate = Number(mznRate.toFixed(2));
          return {
            success: true,
            rate: roundedRate,
            lastUpdated: new Date().toISOString(),
            provider: 'Open Exchange Rates (open.er-api.com)',
            message: `Taxa obtida com sucesso: 1 USD = ${roundedRate.toFixed(2)} MZN`
          };
        }
      }
    } catch (e: any) {
      console.warn('Primary exchange rate source note:', e.message);
    }

    // 2. Try Fallback Public Forex API
    try {
      const res2 = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (res2.ok) {
        const data2 = await res2.json();
        const mznRate2 = Number(data2?.rates?.MZN);
        if (mznRate2 && !isNaN(mznRate2) && mznRate2 > 30 && mznRate2 < 120) {
          const roundedRate2 = Number(mznRate2.toFixed(2));
          return {
            success: true,
            rate: roundedRate2,
            lastUpdated: new Date().toISOString(),
            provider: 'ExchangeRate-API (api.exchangerate-api.com)',
            message: `Taxa obtida via fonte secundária: 1 USD = ${roundedRate2.toFixed(2)} MZN`
          };
        }
      }
    } catch (e2: any) {
      console.warn('Secondary exchange rate source note:', e2.message);
    }

    // 3. Try Server Proxy Route
    try {
      const serverRes = await fetch('/api/exchange-rate/sync');
      if (serverRes.ok) {
        const serverData = await serverRes.json();
        if (serverData.success && typeof serverData.rate === 'number') {
          return {
            success: true,
            rate: serverData.rate,
            lastUpdated: serverData.lastUpdated || new Date().toISOString(),
            provider: serverData.provider || 'Servidor EarnWorld',
            message: `Taxa obtida via servidor: 1 USD = ${serverData.rate.toFixed(2)} MZN`
          };
        }
      }
    } catch (_) {}

    return null;
  },

  /**
   * Checks and updates the USD/MZN rate once per day.
   * If source is unavailable, strictly preserves the last valid rate without inventing numbers.
   */
  async syncDailyExchangeRate(currentConfig: AppConfig, force = false): Promise<{
    updated: boolean;
    rate: number;
    lastUpdated?: string;
    message: string;
  }> {
    const existingRate = currentConfig.usdToMznRate || 63.90;
    const lastUpdateStr = currentConfig.usdToMznLastUpdated;

    // Check if updated in the last 24 hours (once per day rule)
    if (!force && lastUpdateStr) {
      const lastUpdateMs = new Date(lastUpdateStr).getTime();
      const nowMs = Date.now();
      const diffHours = (nowMs - lastUpdateMs) / (1000 * 60 * 60);

      if (diffHours < 24) {
        return {
          updated: false,
          rate: existingRate,
          lastUpdated: lastUpdateStr,
          message: `Taxa diária válida: 1 USD = ${existingRate.toFixed(2)} MZN (atualizada há ${Math.floor(diffHours)}h)`
        };
      }
    }

    // Attempt to fetch fresh rate from reliable source
    const result = await this.fetchLiveUsdToMznRate();

    if (result && result.success && result.rate > 0) {
      const updatedConfig: AppConfig = {
        ...currentConfig,
        usdToMznRate: result.rate,
        usdToMznLastUpdated: result.lastUpdated,
        usdToMznProvider: result.provider
      };

      try {
        await storageService.updateAppConfig(updatedConfig);
      } catch (err: any) {
        console.warn('Could not save updated exchange rate to database:', err.message);
      }

      return {
        updated: true,
        rate: result.rate,
        lastUpdated: result.lastUpdated,
        message: `Taxa de câmbio USD/MZN atualizada com sucesso: 1 USD = ${result.rate.toFixed(2)} MZN`
      };
    }

    // Source unavailable: Keep last valid rate without inventing a rate
    return {
      updated: false,
      rate: existingRate,
      lastUpdated: lastUpdateStr,
      message: `Fonte de câmbio indisponível no momento. Mantida a última taxa válida: 1 USD = ${existingRate.toFixed(2)} MZN.`
    };
  },

  /**
   * Helper to format the update timestamp into a human-friendly Portuguese string.
   */
  formatLastUpdateDate(isoString?: string): string {
    if (!isoString) return 'Hoje (taxa de referência)';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-MZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return isoString;
    }
  }
};
