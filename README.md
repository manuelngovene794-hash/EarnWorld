# EarnWorld – Global Rewards

Plataforma global de recompensas transparentes e seguras, desenhada para utilizadores globais e com suporte especial a Moçambique (M-Pesa e e-Mola).

## Características Principais

- **Autenticação**: Registo e login com Google, Email/Senha e Telefone (SMS).
- **Lista Completa de Países**: Moçambique (MZ, +258) em destaque com valores em Meticais (MT/MZN).
- **Conversão de Pontos**:
  - 1.000 pontos = US$1,00
  - 5.000 pontos = US$5,00 (Levantamento Mínimo)
  - Taxa USD/MZN em tempo real configurável pelo administrador.
- **Anúncios Recompensados Transparentes**:
  - Visualização 100% voluntária de 15 segundos.
  - Verificação humana de segurança antifraude (proteção contra bots).
  - Anúncios concedem pontos internos, nunca dinheiro direto.
  - A receita publicitária pertence ao EarnWorld e alimenta a reserva real de liquidez.
- **Pagamentos & Levantamentos Seguros**:
  - Métodos: **M-Pesa** (Vodacom Moçambique), **e-Mola** (Movitel Moçambique), **PayPal**, **Payoneer**, **USDT** (TRC-20/BEP-20) e **Transferência Bancária**.
  - **Regra de Transparência**: Só são pagos levantamentos quando existe receita real disponível.
  - Se a liquidez imediata for insuficiente, o pedido é mantido como: *"Aguardando receita disponível para pagamento."*
- **Painel Administrativo (`/admin`)**:
  - Acesso imediato pelo menu ou rota `/admin`.
  - Super administrador padrão: `manuelngovene794@gmail.com`.
  - Gestão de saldo real de liquidez vs. receita estimada de anúncios.
  - Ajuste instantâneo da taxa de câmbio USD/MZN.
  - Aprovação, liquidação e rejeição de pedidos com reembolso automático de pontos.
  - Monitor antifraude e limitação por hora.
- **Idiomas**: Bilingue em Português e Inglês com troca imediata.

## Como Publicar Gratuitamente no Vercel ou Netlify

### 1. Vercel
1. Conecte o seu repositório GitHub ao [Vercel](https://vercel.com).
2. O ficheiro `vercel.json` incluído já configura os redirecionamentos SPA automaticamente.
3. Clique em **Deploy**.

### 2. Netlify
1. Conecte o repositório ao [Netlify](https://netlify.com).
2. As configurações em `netlify.toml` e `public/_redirects` asseguram o build (`npm run build`) e a rota SPA `/* -> /index.html 200`.
3. Clique em **Deploy Site**.
