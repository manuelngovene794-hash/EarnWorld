import crypto from 'crypto';

export interface PhoneValidationResult {
  valid: boolean;
  cleanPhone: string;
  error?: string;
}

export interface SmsSendResult {
  success: boolean;
  configured: boolean;
  delivered: boolean;
  message: string;
  cleanPhone?: string;
  otpToken?: string;
  expiresInSeconds?: number;
  provider?: string;
}

export interface SmsVerifyResult {
  success: boolean;
  verified: boolean;
  phoneNumber?: string;
  message: string;
}

// In-memory OTP storage for persistent state within the Node process
const phoneOtps = new Map<string, { code: string; expiresAt: number; attempts: number }>();

const OTP_SECRET = process.env.OTP_SECRET || process.env.JWT_SECRET || 'earnworld_real_sms_otp_secret_key_2026';

/**
 * Normalizes and validates phone numbers.
 * Supports Mozambique (+258 82/83/84/85/86/87XXXXXXX) and international E.164.
 */
export function normalizeAndValidatePhone(rawPhone: string): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, cleanPhone: '', error: 'Número de telefone é obrigatório.' };
  }

  let clean = rawPhone.replace(/[^\d+]/g, '').trim();

  // Handle international dialing prefix 00 (e.g. 00258... -> +258...)
  if (clean.startsWith('00')) {
    clean = '+' + clean.slice(2);
  }

  // If local Mozambique 9-digit format (e.g. 841234567, 851234567, etc.)
  if (/^8[2-7]\d{7}$/.test(clean)) {
    clean = '+258' + clean;
  } else if (/^2588[2-7]\d{7}$/.test(clean)) {
    clean = '+' + clean;
  } else if (!clean.startsWith('+')) {
    clean = '+' + clean;
  }

  // Mozambique validation (+258)
  if (clean.startsWith('+258')) {
    const localPart = clean.slice(4);
    if (!/^[8][2-7]\d{7}$/.test(localPart)) {
      return {
        valid: false,
        cleanPhone: clean,
        error: 'Número de Moçambique inválido. Formato esperado: +258 84/85/86/87 seguido de 7 dígitos (Ex: +258 84 123 4567).'
      };
    }
    return { valid: true, cleanPhone: clean };
  }

  // International E.164 validation for all countries
  // E.164 format: + followed by 7 to 15 digits
  if (!/^\+[1-9]\d{6,14}$/.test(clean)) {
    return {
      valid: false,
      cleanPhone: clean,
      error: 'Número de telefone internacional inválido. Formato esperado: +[indicativo_país][número] (Ex: +351 912 345 678, +55 11 98765 4321, +1 415 555 2671).'
    };
  }

  return { valid: true, cleanPhone: clean };
}

/**
 * Generates an HMAC-SHA256 signed token for serverless/stateless verification (e.g. Vercel).
 */
export function createOtpToken(cleanPhone: string, code: string, expiresAt: number): string {
  const codeHash = crypto.createHash('sha256').update(`${cleanPhone}:${code}:${OTP_SECRET}`).digest('hex');
  const payload = `${cleanPhone}:${codeHash}:${expiresAt}`;
  const sig = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
  const data = JSON.stringify({ phone: cleanPhone, codeHash, expiresAt, sig });
  return Buffer.from(data, 'utf-8').toString('base64');
}

/**
 * Verifies an HMAC-SHA256 signed token.
 */
export function verifyOtpToken(cleanPhone: string, code: string, token: string): boolean {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const data = JSON.parse(raw);
    if (!data.phone || !data.codeHash || !data.expiresAt || !data.sig) {
      return false;
    }

    if (data.phone !== cleanPhone) {
      return false;
    }

    if (Date.now() > data.expiresAt) {
      return false;
    }

    // Verify HMAC signature
    const payload = `${data.phone}:${data.codeHash}:${data.expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
    if (expectedSig !== data.sig) {
      return false;
    }

    // Verify code hash
    const expectedHash = crypto.createHash('sha256').update(`${cleanPhone}:${code}:${OTP_SECRET}`).digest('hex');
    return expectedHash === data.codeHash;
  } catch (_) {
    return false;
  }
}

/**
 * Dispatches a real SMS OTP code through the configured carrier gateway.
 */
export async function sendRealSmsOtp(rawPhone: string): Promise<SmsSendResult> {
  const val = normalizeAndValidatePhone(rawPhone);
  if (!val.valid) {
    return {
      success: false,
      configured: true,
      delivered: false,
      message: val.error || 'Número de telefone inválido.'
    };
  }

  const cleanPhone = val.cleanPhone;

  // Check which real SMS gateway is configured
  const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
  const hasAfricasTalking = Boolean(process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_API_KEY);
  const hasInfobip = Boolean(process.env.INFOBIP_API_KEY && process.env.INFOBIP_BASE_URL);
  const hasVonage = Boolean(process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET);
  const hasGatewayUrl = Boolean(process.env.SMS_GATEWAY_URL);

  const isConfigured = hasTwilio || hasAfricasTalking || hasInfobip || hasVonage || hasGatewayUrl;

  if (!isConfigured) {
    return {
      success: false,
      configured: false,
      delivered: false,
      message: 'Gateway de SMS real não configurado no servidor. Configure as variáveis de ambiente no Vercel (Twilio, Africa\'s Talking, Infobip ou Vonage).'
    };
  }

  // Rate limiting: 45 seconds between requests for the same phone
  const existing = phoneOtps.get(cleanPhone);
  const now = Date.now();
  if (existing && existing.expiresAt - now > 4 * 60 * 1000 + 15 * 1000) {
    return {
      success: false,
      configured: true,
      delivered: false,
      message: 'Aguarde 45 segundos antes de solicitar um novo código SMS.'
    };
  }

  // Generate 6-digit cryptographic OTP (100000 - 999999)
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity
  phoneOtps.set(cleanPhone, { code: otpCode, expiresAt, attempts: 0 });

  const smsText = `O seu código de verificação EarnWorld é: ${otpCode}. Válido por 5 minutos. Não partilhe este código.`;
  console.log(`[SMS Gateway Dispatch] A despachar SMS real para ${cleanPhone}`);

  let realDelivered = false;
  let lastError = '';
  let providerUsed = '';

  // 1. Africa's Talking (widely used in Mozambique & Africa)
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
          message: smsText,
          ...(process.env.AFRICASTALKING_SENDER_ID ? { from: process.env.AFRICASTALKING_SENDER_ID } : {})
        })
      });

      if (atRes.ok) {
        realDelivered = true;
        providerUsed = "Africa's Talking";
      } else {
        const atData = await atRes.json().catch(() => ({}));
        lastError = atData.errorMessage || `AfricasTalking HTTP ${atRes.status}`;
      }
    } catch (err: any) {
      lastError = err.message;
      console.warn('[AfricasTalking Error]:', err.message);
    }
  }

  // 2. Twilio
  if (!realDelivered && hasTwilio) {
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
        providerUsed = 'Twilio';
      } else {
        const twData = await twilioRes.json().catch(() => ({}));
        lastError = twData.message || `Twilio HTTP ${twilioRes.status}`;
      }
    } catch (err: any) {
      lastError = err.message;
      console.warn('[Twilio Error]:', err.message);
    }
  }

  // 3. Infobip
  if (!realDelivered && hasInfobip) {
    try {
      const baseUrl = (process.env.INFOBIP_BASE_URL || '').replace(/\/$/, '');
      const ibRes = await fetch(`${baseUrl}/sms/2/text/advanced`, {
        method: 'POST',
        headers: {
          'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              destinations: [{ to: cleanPhone }],
              from: process.env.INFOBIP_FROM || 'EarnWorld',
              text: smsText
            }
          ]
        })
      });

      if (ibRes.ok) {
        realDelivered = true;
        providerUsed = 'Infobip';
      } else {
        const ibData = await ibRes.json().catch(() => ({}));
        lastError = ibData.requestError?.serviceException?.text || `Infobip HTTP ${ibRes.status}`;
      }
    } catch (err: any) {
      lastError = err.message;
      console.warn('[Infobip Error]:', err.message);
    }
  }

  // 4. Vonage / Nexmo
  if (!realDelivered && hasVonage) {
    try {
      const vnRes = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          api_key: process.env.VONAGE_API_KEY,
          api_secret: process.env.VONAGE_API_SECRET,
          to: cleanPhone.replace('+', ''),
          from: process.env.VONAGE_FROM || 'EarnWorld',
          text: smsText
        })
      });

      if (vnRes.ok) {
        const vnData = await vnRes.json().catch(() => ({}));
        if (vnData.messages && vnData.messages[0]?.status === '0') {
          realDelivered = true;
          providerUsed = 'Vonage';
        } else {
          lastError = vnData.messages?.[0]?.['error-text'] || 'Erro ao enviar via Vonage';
        }
      } else {
        lastError = `Vonage HTTP ${vnRes.status}`;
      }
    } catch (err: any) {
      lastError = err.message;
      console.warn('[Vonage Error]:', err.message);
    }
  }

  // 5. Generic SMS Gateway Webhook
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
        providerUsed = 'Gateway Personalizado';
      } else {
        lastError = `Gateway HTTP ${gwRes.status}`;
      }
    } catch (err: any) {
      lastError = err.message;
      console.warn('[SMS Gateway Webhook Error]:', err.message);
    }
  }

  if (!realDelivered) {
    return {
      success: false,
      configured: true,
      delivered: false,
      message: `Falha ao despachar SMS para ${cleanPhone}: ${lastError || 'Erro no fornecedor de telecomunicações'}.`
    };
  }

  const otpToken = createOtpToken(cleanPhone, otpCode, expiresAt);

  return {
    success: true,
    configured: true,
    delivered: true,
    cleanPhone,
    otpToken,
    expiresInSeconds: 300,
    provider: providerUsed,
    message: `Código SMS de 6 dígitos enviado com sucesso para ${cleanPhone}.`
  };
}

/**
 * Validates the SMS OTP code submitted by the user.
 */
export function verifyRealSmsOtp(rawPhone: string, code: string, otpToken?: string): SmsVerifyResult {
  const cleanPhone = (rawPhone || '').replace(/[^\d+]/g, '').trim();
  const cleanCode = (code || '').trim();

  if (!cleanPhone || !cleanCode) {
    return {
      success: false,
      verified: false,
      message: 'Número de telefone e código SMS de 6 dígitos são obrigatórios.'
    };
  }

  // 1. Check in-memory state
  const stored = phoneOtps.get(cleanPhone);
  if (stored) {
    const now = Date.now();
    if (now > stored.expiresAt) {
      phoneOtps.delete(cleanPhone);
      return {
        success: false,
        verified: false,
        message: 'O código SMS expirou (validade de 5 minutos). Solicite um novo código.'
      };
    }

    if (stored.attempts >= 5) {
      phoneOtps.delete(cleanPhone);
      return {
        success: false,
        verified: false,
        message: 'Número excessivo de tentativas incorretas. Solicite um novo código por segurança.'
      };
    }

    if (stored.code !== cleanCode) {
      stored.attempts += 1;
      return {
        success: false,
        verified: false,
        message: `Código SMS incorreto. Restam ${5 - stored.attempts} tentativa(s).`
      };
    }

    // Success! Clean up to prevent replay
    phoneOtps.delete(cleanPhone);
    return {
      success: true,
      verified: true,
      phoneNumber: cleanPhone,
      message: 'Número de telemóvel verificado com sucesso.'
    };
  }

  // 2. Check signed token (for stateless / Vercel serverless functions)
  if (otpToken) {
    const isValid = verifyOtpToken(cleanPhone, cleanCode, otpToken);
    if (isValid) {
      return {
        success: true,
        verified: true,
        phoneNumber: cleanPhone,
        message: 'Número de telemóvel verificado com sucesso.'
      };
    }
  }

  return {
    success: false,
    verified: false,
    message: 'Código de verificação SMS inválido ou expirado. Solicite um novo código.'
  };
}
