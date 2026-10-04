import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendRealSmsOtp, verifyRealSmsOtp } from './src/server/smsCore.js';
import { saveUserBackup, findUserBackup } from './src/server/userStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Monetag Real Revenue API Proxy
  app.post('/api/monetag/sync', async (req, res) => {
    try {
      const apiKey = req.body?.apiKey || process.env.MONETAG_API_KEY;

      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        return res.status(400).json({
          success: false,
          synced: false,
          message: 'Chave de API da Monetag não configurada.'
        });
      }

      const cleanKey = apiKey.trim();
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const dateTo = today.toISOString().split('T')[0];
      const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];

      // Query Monetag SSP API v5 statistics with date range
      const url = `https://api.monetag.com/v5/pub/statistics?date_from=${dateFrom}&date_to=${dateTo}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMsg = `Monetag API HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.errors && Array.isArray(errData.errors)) {
            errorMsg = errData.errors.join(', ');
          } else if (errData.message) {
            errorMsg = errData.message;
          }
        } catch (_) {
          const txt = await response.text();
          if (txt) errorMsg = txt.slice(0, 100);
        }

        return res.status(200).json({
          success: false,
          synced: false,
          message: `Não foi possível autenticar na Monetag: ${errorMsg}`
        });
      }

      const data = await response.json();
      let totalRevenue = 0;

      if (typeof data.revenue === 'number') {
        totalRevenue = data.revenue;
      } else if (typeof data.profit === 'number') {
        totalRevenue = data.profit;
      } else if (typeof data.balance === 'number') {
        totalRevenue = data.balance;
      } else if (typeof data.total_revenue === 'number') {
        totalRevenue = data.total_revenue;
      } else if (typeof data.revenue_sum === 'number') {
        totalRevenue = data.revenue_sum;
      } else if (Array.isArray(data)) {
        totalRevenue = data.reduce((acc: number, item: any) => {
          const val = Number(item.profit ?? item.revenue ?? item.money ?? item.payout ?? 0);
          return acc + (isNaN(val) ? 0 : val);
        }, 0);
      } else if (data.items && Array.isArray(data.items)) {
        totalRevenue = data.items.reduce((acc: number, item: any) => {
          const val = Number(item.profit ?? item.revenue ?? item.money ?? item.payout ?? 0);
          return acc + (isNaN(val) ? 0 : val);
        }, 0);
      }

      const safeBalance = Math.max(0, Number(totalRevenue.toFixed(2)));

      return res.json({
        success: true,
        synced: true,
        balanceUsd: safeBalance,
        message: `Receita real sincronizada da Monetag: US$ ${safeBalance.toFixed(2)}`
      });
    } catch (err: any) {
      console.warn('Monetag server proxy error:', err.message);
      return res.status(200).json({
        success: false,
        synced: false,
        message: `Erro na comunicação com a Monetag: ${err.message}`
      });
    }
  });

  // Monetag postback / webhook endpoint for real-time impression & revenue callbacks
  app.all('/api/monetag/postback', (req, res) => {
    const estimatedPrice = Number(req.query.estimated_price || req.body?.estimated_price || 0);
    console.log('[Monetag Postback] Recebido evento de receita:', estimatedPrice);
    res.status(200).send('OK');
  });

  // Exchange Rate Proxy (USD to MZN)
  app.get('/api/exchange-rate/sync', async (_req, res) => {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (response.ok) {
        const data = await response.json();
        const mznRate = Number(data?.rates?.MZN);
        if (mznRate && !isNaN(mznRate)) {
          const roundedRate = Number(mznRate.toFixed(2));
          return res.json({
            success: true,
            rate: roundedRate,
            lastUpdated: new Date().toISOString(),
            provider: 'Open Exchange Rates (open.er-api.com)'
          });
        }
      }
      return res.status(503).json({ success: false, message: 'Fonte primária de câmbio indisponível' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Persistent User Data Synchronization Endpoint (Guarantees data recovery across logouts & devices)
  app.get('/api/user/sync', (req, res) => {
    try {
      const uid = typeof req.query.uid === 'string' ? req.query.uid : undefined;
      const email = typeof req.query.email === 'string' ? req.query.email : undefined;
      const phone = typeof req.query.phone === 'string' ? req.query.phone : undefined;

      const record = findUserBackup({ uid, email, phone });
      if (!record) {
        return res.status(404).json({ success: false, message: 'Conta não encontrada no backup.' });
      }

      return res.json({
        success: true,
        profile: record.profile,
        completedTasks: record.completedTasks || [],
        transactions: record.transactions || []
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  app.post('/api/user/sync', (req, res) => {
    try {
      const { profile, completedTasks, transactions } = req.body || {};
      if (!profile || !profile.id) {
        return res.status(400).json({ success: false, message: 'Perfil inválido.' });
      }

      saveUserBackup(profile, completedTasks, transactions);
      return res.json({ success: true, message: 'Dados da conta persistidos com sucesso.' });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Real SMS OTP Send Endpoint (Supporting Mozambique +258 and international E.164 numbers)
  app.post('/api/auth/send-sms', async (req, res) => {
    try {
      const rawPhone = String(req.body?.phoneNumber || '').trim();
      const result = await sendRealSmsOtp(rawPhone);

      if (!result.success) {
        const statusCode = !result.configured ? 503 : 400;
        return res.status(statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[SMS Dispatch Error]:', err);
      return res.status(500).json({ success: false, message: 'Erro interno ao despachar SMS.' });
    }
  });

  // Real SMS OTP Verification Endpoint
  app.post('/api/auth/verify-sms', (req, res) => {
    try {
      const rawPhone = String(req.body?.phoneNumber || '').trim();
      const code = String(req.body?.code || '').trim();
      const otpToken = String(req.body?.otpToken || '').trim();

      const result = verifyRealSmsOtp(rawPhone, code, otpToken);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Erro ao verificar código SMS.' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EarnWorld server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
