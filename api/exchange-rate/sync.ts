export default async function handler(_req: any, res: any) {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (response.ok) {
      const data = await response.json();
      const mznRate = Number(data?.rates?.MZN);
      if (mznRate && !isNaN(mznRate)) {
        const roundedRate = Number(mznRate.toFixed(2));
        return res.status(200).json({
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
}
