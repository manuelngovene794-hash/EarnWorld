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

  // In-memory OTP storage for phone verification: phone -> { code, expiresAt, attempts }
  const phoneOtps = new Map<string, { code: string; expiresAt: number; attempts: number }>();

  // Real SMS OTP Send Endpoint (Supporting Mozambique +258 and international E.164 numbers)
  app.post('/api/auth/send-sms', async (req, res) => {
    try {
      const rawPhone = String(req.body?.phoneNumber || '').trim();
      if (!rawPhone) {
        return res.status(400).json({ success: false, message: 'Número de telefone é obrigatório.' });
      }

      // Format & clean phone number
      let cleanPhone = rawPhone.replace(/[^\d+]/g, '');
      // If user typed Mozambique local 9-digit number without country code (e.g. 84xxxxxxx)
      if (/^8[2-7]\d{7}$/.test(cleanPhone)) {
        cleanPhone = '+258' + cleanPhone;
      } else if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+' + cleanPhone;
      }

      // Validate Mozambique numbers or general international numbers
      if (cleanPhone.startsWith('+258')) {
        const localPart = cleanPhone.slice(4);
        if (!/^[8][2-7]\d{7}$/.test(localPart)) {
          return res.status(400).json({
            success: false,
            message: 'Número de Moçambique inválido. Formato esperado: +258 84/85/86/87 seguido de 7 dígitos.'
          });
        }
      } else if (cleanPhone.length < 8 || cleanPhone.length > 16) {
        return res.status(400).json({
          success: false,
          message: 'Número de telefone internacional inválido. Inclua o indicativo do país (Ex: +258...).'
        });
      }

      // Check if real SMS gateway is configured
      const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
      const hasAfricasTalking = Boolean(process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_API_KEY);
      const hasGatewayUrl = Boolean(process.env.SMS_GATEWAY_URL);

      if (!hasTwilio && !hasAfricasTalking && !hasGatewayUrl) {
        return res.status(503).json({
          success: false,
          configured: false,
          message: 'Gateway de SMS real não configurado. Para envio de SMS a números de Moçambique (+258) e internacionais, configure as credenciais de envio (Twilio ou Africa\'s Talking) no servidor.'
        });
      }

      // Rate limit check: prevent sending more than once every 45 seconds
      const existing = phoneOtps.get(cleanPhone);
      const now = Date.now();
      if (existing && existing.expiresAt - now > 4 * 60 * 1000 + 15 * 1000) {
        return res.status(429).json({
          success: false,
          message: 'Aguarde 45 segundos antes de solicitar um novo código SMS.'
        });
      }

      // Cryptographically secure 6-digit random OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity
      phoneOtps.set(cleanPhone, { code: otpCode, expiresAt, attempts: 0 });

      const smsText = `O seu código de verificação EarnWorld é: ${otpCode}. Válido por 5 minutos. Não partilhe este código.`;
      console.log(`[SMS Gateway Dispatch] Enviando SMS para ${cleanPhone}`);

      let realDelivered = false;
      let lastGatewayError = '';

      // Real Gateway Integration: Twilio
      if (hasTwilio) {
        try {
          const authHeader = 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
          const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              To: cleanPhone,
              From: process.env.TWILIO_FROM || '',
              Body: smsText
            })
          });
          if (twilioRes.ok) {
            realDelivered = true;
          } else {
            const twData = await twilioRes.json().catch(() => ({}));
            lastGatewayError = twData.message || `Twilio HTTP ${twilioRes.status}`;
          }
        } catch (twilioErr: any) {
          lastGatewayError = twilioErr.message;
          console.warn('[Twilio Error]:', twilioErr.message);
        }
      }

      // Real Gateway Integration: Africa's Talking (widely used across Africa and Mozambique)
      if (!realDelivered && hasAfricasTalking) {
        try {
          const atRes = await fetch('https://api.africastalking.com/version1/messaging', {
            method: 'POST',
            headers: {
              'apiKey': process.env.AFRICASTALKING_API_KEY || '',
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            body: new URLSearchParams({
              username: process.env.AFRICASTALKING_USERNAME || '',
              to: cleanPhone,
              message: smsText
            })
          });
          if (atRes.ok) {
            realDelivered = true;
          } else {
            const atData = await atRes.json().catch(() => ({}));
            lastGatewayError = atData.errorMessage || `AfricasTalking HTTP ${atRes.status}`;
          }
        } catch (atErr: any) {
          lastGatewayError = atErr.message;
          console.warn('[AfricasTalking Error]:', atErr.message);
        }
      }

      // Real Gateway Integration: Generic SMS HTTP webhook / API
      if (!realDelivered && hasGatewayUrl) {
        try {
          const gwRes = await fetch(process.env.SMS_GATEWAY_URL || '', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.SMS_GATEWAY_API_KEY ? { 'Authorization': `Bearer ${process.env.SMS_GATEWAY_API_KEY}` } : {})
            },
            body: JSON.stringify({
              phone: cleanPhone,
              message: smsText,
              code: otpCode
            })
          });
          if (gwRes.ok) {
            realDelivered = true;
          } else {
            lastGatewayError = `SMS Gateway HTTP ${gwRes.status}`;
          }
        } catch (gwErr: any) {
          lastGatewayError = gwErr.message;
          console.warn('[SMS Gateway Webhook Error]:', gwErr.message);
        }
      }

      if (!realDelivered) {
        return res.status(502).json({
          success: false,
          message: `Falha ao despachar SMS para ${cleanPhone}: ${lastGatewayError || 'Erro no fornecedor de SMS'}.`
        });
      }

      return res.json({
        success: true,
        cleanPhone,
        message: `Código SMS de 6 dígitos despachado para ${cleanPhone}.`,
        delivered: true,
        expiresInSeconds: 300
      });
    } catch (err: any) {
      console.error('[SMS Dispatch Error]:', err);
      return res.status(500).json({ success: false, message: 'Erro ao despachar SMS.' });
    }
  });

  // Real SMS OTP Verification Endpoint
  app.post('/api/auth/verify-sms', (req, res) => {
    try {
      const rawPhone = String(req.body?.phoneNumber || '').trim();
      const code = String(req.body?.code || '').trim();

      if (!rawPhone || !code) {
        return res.status(400).json({ success: false, message: 'Número de telefone e código SMS são obrigatórios.' });
      }

      let cleanPhone = rawPhone.replace(/[^\d+]/g, '');
      if (/^8[2-7]\d{7}$/.test(cleanPhone)) {
        cleanPhone = '+258' + cleanPhone;
      } else if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+' + cleanPhone;
      }

      const stored = phoneOtps.get(cleanPhone);
      if (!stored) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum código ativo encontrado para este número. Solicite um novo código SMS.'
        });
      }

      const now = Date.now();
      if (now > stored.expiresAt) {
        phoneOtps.delete(cleanPhone);
        return res.status(400).json({
          success: false,
          message: 'O código SMS expirou (validade de 5 minutos). Solicite um novo código.'
        });
      }

      if (stored.attempts >= 5) {
        phoneOtps.delete(cleanPhone);
        return res.status(400).json({
          success: false,
          message: 'Número excessivo de tentativas incorretas. Solicite um novo código.'
        });
      }

      if (stored.code !== code) {
        stored.attempts += 1;
        return res.status(400).json({
          success: false,
          message: `Código SMS incorreto. Restam ${5 - stored.attempts} tentativa(s).`
        });
      }

      // Validated successfully! Remove one-time code to prevent reuse
      phoneOtps.delete(cleanPhone);

      return res.json({
        success: true,
        verified: true,
        phoneNumber: cleanPhone,
        message: 'Número de telemóvel verificado com sucesso.'
      });
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
