import { AppConfig } from '../types';
import { storageService } from './storageService';

export const monetagService = {
  /**
   * Syncs real revenue from Monetag API via secure server proxy.
   * Strictly enforces real revenue: does NOT invent balance or allow negative numbers.
   */
  async syncRealRevenue(config: AppConfig): Promise<{
    synced: boolean;
    balanceUsd: number;
    message: string;
  }> {
    const apiKey = config.monetagApiKey || (import.meta as any).env?.VITE_MONETAG_API_KEY;

    if (!apiKey || apiKey.trim().length === 0) {
      return {
        synced: false,
        balanceUsd: Math.max(0, config.availableRealRevenueUsd || 0),
        message: 'Chave da API da Monetag não configurada. A plataforma usa o saldo real auditado do tesouro.'
      };
    }

    try {
      // Call server proxy endpoint to avoid browser CORS restrictions
      const response = await fetch('/api/monetag/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com código ${response.status}`);
      }

      const result = await response.json();

      if (result.synced && typeof result.balanceUsd === 'number') {
        const verifiedBalance = Math.max(0, Number(result.balanceUsd.toFixed(2)));

        // Update database with verified real revenue
        const updatedConfig: AppConfig = {
          ...config,
          availableRealRevenueUsd: verifiedBalance,
          monetagLiveBalanceUsd: verifiedBalance,
          monetagLastSync: new Date().toISOString(),
          monetagSyncStatus: 'connected'
        };

        await storageService.updateAppConfig(updatedConfig);

        return {
          synced: true,
          balanceUsd: verifiedBalance,
          message: result.message || `Receita real sincronizada da Monetag: US$ ${verifiedBalance.toFixed(2)}`
        };
      }

      return {
        synced: false,
        balanceUsd: Math.max(0, config.availableRealRevenueUsd || 0),
        message: result.message || 'Não foi possível validar saldo na Monetag.'
      };
    } catch (err: any) {
      console.warn('Monetag revenue sync note:', err.message);
      return {
        synced: false,
        balanceUsd: Math.max(0, config.availableRealRevenueUsd || 0),
        message: `Não foi possível sincronizar com a Monetag (${err.message}). O saldo real seguro foi mantido.`
      };
    }
  },

  /**
   * Automatically syncs Monetag revenue in the background if API key is present.
   */
  async autoSyncIfConfigured(config: AppConfig): Promise<void> {
    const key = config.monetagApiKey || (import.meta as any).env?.VITE_MONETAG_API_KEY;
    if (key && key.trim().length > 0) {
      // Avoid hammering API if synced in last 10 minutes
      if (config.monetagLastSync) {
        const last = new Date(config.monetagLastSync).getTime();
        const now = Date.now();
        if (now - last < 10 * 60 * 1000) return;
      }
      this.syncRealRevenue(config).catch(() => {});
    }
  }
};
