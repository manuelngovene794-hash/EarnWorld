import { saveUserBackup, findUserBackup } from '../../src/server/userStore.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Retrieve user profile, points, and tasks
  if (req.method === 'GET') {
    const { uid, email, phone } = req.query || {};
    const record = findUserBackup({
      uid: typeof uid === 'string' ? uid : undefined,
      email: typeof email === 'string' ? email : undefined,
      phone: typeof phone === 'string' ? phone : undefined
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Conta não encontrada no backup do servidor.' });
    }

    return res.status(200).json({
      success: true,
      profile: record.profile,
      completedTasks: record.completedTasks || [],
      transactions: record.transactions || []
    });
  }

  // POST: Persist user profile, points, and completed tasks
  if (req.method === 'POST') {
    try {
      const raw = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { profile, completedTasks, transactions } = raw;

      if (!profile || !profile.id) {
        return res.status(400).json({ success: false, message: 'Perfil de utilizador inválido.' });
      }

      saveUserBackup(profile, completedTasks, transactions);

      return res.status(200).json({ success: true, message: 'Dados da conta persistidos com sucesso no servidor.' });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Método não permitido.' });
}
