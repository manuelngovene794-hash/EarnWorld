import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

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
