export default async function handler(req: any, res: any) {
  try {
    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const apiKey = rawBody?.apiKey || process.env.MONETAG_API_KEY;

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

    return res.status(200).json({
      success: true,
      synced: true,
      balanceUsd: safeBalance,
      message: `Receita real sincronizada da Monetag: US$ ${safeBalance.toFixed(2)}`
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      synced: false,
      message: `Erro na comunicação com a Monetag: ${err.message}`
    });
  }
}
