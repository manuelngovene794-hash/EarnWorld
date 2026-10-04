import { sendRealSmsOtp } from '../../src/server/smsCore.js';

export default async function handler(req: any, res: any) {
  // CORS & Methods
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido. Utilize POST.' });
  }

  try {
    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const phoneNumber = rawBody.phoneNumber || '';

    const result = await sendRealSmsOtp(phoneNumber);

    if (!result.success) {
      const statusCode = !result.configured ? 503 : 400;
      return res.status(statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Vercel SMS Send Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar envio de SMS. Verifique as credenciais no Vercel.'
    });
  }
}
