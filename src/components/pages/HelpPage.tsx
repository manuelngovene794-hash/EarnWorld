import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  Coins, 
  Wallet, 
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppConfig } from '../../types';

interface HelpPageProps {
  config: AppConfig;
  setActiveTab: (tab: string) => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({ config, setActiveTab }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [supportName, setSupportName] = useState(currentUser?.displayName || '');
  const [supportEmail, setSupportEmail] = useState(currentUser?.email || '');
  const [supportSubject, setSupportSubject] = useState('Levantamento M-Pesa / e-Mola');
  const [supportMessage, setSupportMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);
  const [sending, setSending] = useState(false);

  const faqs = [
    {
      q: '1. Como funcionam os pontos e quanto valem em dinheiro?',
      a: `No EarnWorld, a conversão é transparente e fixa: 1.000 pontos equivalem a exatamente US$ 1,00. Mostramos também o valor aproximado em Meticais (MZN) usando a taxa de câmbio oficial configurada pelo administrador (atualmente 1 USD = ${config.usdToMznRate || 64.0} MZN). Os pontos são recompensas internas atribuídas após a conclusão voluntária de pesquisas, ofertas ou visualização de anúncios.`
    },
    {
      q: '2. Como funcionam os levantamentos em Moçambique por M-Pesa e e-Mola?',
      a: 'Os utilizadores residentes em Moçambique podem solicitar levantamentos diretos para as suas carteiras móveis Vodacom M-Pesa (números que iniciam com 84 ou 85) ou Movitel e-Mola (números 86 ou 87). Os pagamentos são transferidos em Meticais (MT) sem necessidade de conta bancária tradicional.'
    },
    {
      q: '3. Qual é o valor mínimo de levantamento?',
      a: 'O levantamento mínimo no EarnWorld é de 5.000 pontos, que correspondem a exatamente US$ 5,00 (aproximadamente 320 MT). Assim que a sua conta atingir este saldo, a opção de levantamento fica totalmente disponível.'
    },
    {
      q: '4. Quais são os prazos de processamento dos levantamentos?',
      a: 'Os levantamentos via M-Pesa e e-Mola em Moçambique são normalmente validados e enviados dentro de 1 a 48 horas úteis após a aprovação da equipa. Métodos como USDT, PayPal e transferência bancária seguem o mesmo ciclo após a validação das atividades da conta.'
    },
    {
      q: '5. Como funcionam os anúncios recompensados e as regras antifraude?',
      a: 'O utilizador deve escolher voluntariamente assistir aos anúncios patrocinados. Após a reprodução completa do vídeo (15 a 30s) e verificação humana anti-robô, os pontos são creditados na sua conta. NÃO é permitido incentivar cliques, usar bots, emuladores ou criar visualizações artificiais. Contas suspeitas de fraude são suspensas.'
    },
    {
      q: '6. Preciso fazer algum depósito ou pagar mensalidade para usar o EarnWorld?',
      a: 'NÃO! O EarnWorld é 100% gratuito. Nunca solicitamos depósitos, investimentos, taxas de ativação ou mensalidades dos utilizadores. Qualquer pedido de dinheiro em nome do EarnWorld é falso.'
    },
    {
      q: '7. Como posso acompanhar o estado do meu levantamento?',
      a: 'Após o envio do pedido, a transação entra no estado "Pendente" e pode ser acompanhada na página Histórico. Assim que for confirmada e enviada para o seu número M-Pesa, e-Mola ou carteira, o estado muda para "Pago" com a respetiva referência de liquidação.'
    },
    {
      q: '8. Como convidar amigos e receber os pontos de bónus?',
      a: 'Basta aceder à página "Indicar Amigos", copiar o seu código ou link exclusivo e partilhar no WhatsApp ou redes sociais. Por cada amigo que se registe com o seu código, você recebe +200 pontos de bónus.'
    }
  ];

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setTicketSent(true);
      setSupportMessage('');
    }, 900);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/40 border border-amber-500/30 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Central de Ajuda & Apoio ao Utilizador</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Perguntas Frequentes & <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Suporte</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Tire todas as suas dúvidas sobre pontuação, levantamentos M-Pesa/e-Mola, regras de anúncios e fale diretamente com a nossa equipa.
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions Accordion */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Dúvidas Frequentes (FAQ)</h2>
        </div>

        <div className="space-y-2 pt-1">
          {faqs.map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                  className="w-full p-4 flex items-center justify-between text-left gap-3 hover:bg-slate-900/60 transition-colors"
                >
                  <span className="font-bold text-sm text-slate-200">{faq.q}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 bg-slate-950">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Direct Contact Support Form */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-lg font-bold text-white">Fale com o Suporte EarnWorld</h2>
            <p className="text-xs text-slate-400">Tem algum problema com a sua conta ou dúvida específica? Envie-nos uma mensagem.</p>
          </div>
        </div>

        {ticketSent ? (
          <div className="p-6 rounded-xl bg-slate-950 border border-emerald-500/40 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">Mensagem Enviada com Sucesso!</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              O seu pedido de suporte foi recebido pela equipa do EarnWorld. Responderemos através do seu email registado nas próximas 24 horas.
            </p>
            <button
              onClick={() => setTicketSent(false)}
              className="mt-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
            >
              Enviar Nova Mensagem
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendSupport} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">O Seu Nome</label>
                <input
                  type="text"
                  required
                  value={supportName}
                  onChange={(e) => setSupportName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email para Resposta</label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="seu-email@exemplo.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Assunto</label>
              <select
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-amber-400 transition-colors cursor-pointer"
              >
                <option value="Levantamento M-Pesa / e-Mola">Dúvida sobre Levantamento M-Pesa / e-Mola</option>
                <option value="Validação de Tarefas ou Pesquisas">Validação de Tarefas ou Pesquisas</option>
                <option value="Anúncios Recompensados">Anúncios Recompensados & Pontos</option>
                <option value="Problema com Código de Convite">Problema com Código de Convite</option>
                <option value="Outro Assunto">Outro Assunto</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Mensagem Detalhada</label>
              <textarea
                rows={4}
                required
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Descreva o que aconteceu ou a sua dúvida..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-amber-400 transition-colors resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-sm hover:from-amber-400 flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-60 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'A enviar...' : 'Enviar Mensagem'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Official Contacts & Transparency */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-white font-bold">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Canais Oficiais de Atendimento</span>
        </div>
        <p className="leading-relaxed">
          Suporte Oficial por Email: <strong className="text-slate-200">suporte@earnworld.com</strong> ou contacto com o gestor principal: <strong className="text-amber-400">manuelngovene794@gmail.com</strong>.
        </p>
        <p>
          Atendimento a utilizadores de Moçambique e internacional de Segunda a Domingo.
        </p>
      </div>

    </div>
  );
};
