# Loja Luz do Atlântico

MVP de um site institucional com vendas diretas para 2 a 3 produtos, frontend em Angular e API em Node.js/Express, já preparado para Supabase e Stripe.

## O que está implementado

- Home com vídeo de fundo, destaques de produtos e CTA.
- Página dinâmica de produto com galeria, vídeo e botão de compra.
- Página sobre, contacto e checkout.
- Página de obrigado com resumo do pedido.
- Painel admin com login por palavra-passe, edição de produtos, conteúdo institucional e listagem de pedidos.
- API REST com persistência híbrida: Supabase quando configurado, JSON local como fallback.
- Checkout com fluxo real para Stripe em pagamentos por cartão.
- Webhook Stripe para confirmar pagamentos e atualizar o estado da encomenda.
- Assets próprios em SVG para evitar dependência de imagens externas no ambiente de produção.

## Como executar

1. Instale as dependências da raiz:

```bash
npm install
```

2. Inicie frontend e backend em paralelo:

```bash
npm run dev
```

3. Aceda a:

- Frontend: http://localhost:4200
- Backend: http://localhost:3000/api/health

O endpoint de health indica também qual storage e qual modo de pagamentos estão ativos.

## Deploy na Vercel

O repositório está preparado para ser publicado num único projeto da Vercel, com:

- frontend Angular servido como site estático;
- backend Express exposto como função serverless em `/api/*`;
- fallback de SPA para as rotas do Angular.

### Configuração recomendada

1. Importe este repositório na Vercel usando a raiz do projeto.
2. Mantenha os comandos definidos em [vercel.json](vercel.json).
3. Configure as variáveis de ambiente de produção no painel da Vercel.

### Limitação importante

Em produção na Vercel, não conte com persistência em [backend/data/store.json](backend/data/store.json). O filesystem da função não é persistente. Para ambiente publicado, configure pelo menos:

```env
SITE_URL=https://seu-dominio.pt
ADMIN_PASSWORD=...
ADMIN_TOKEN=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Sem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, a API ainda arranca, mas o fallback local em JSON não é adequado para produção serverless.

## Admin

- URL: http://localhost:4200/admin
- Password padrão: `admin123`

Altere a password e o token criando `backend/.env` com base em `backend/.env.example`.

## Variáveis de ambiente

Existe também um checklist operacional em [docs/env-setup-checklist.md](docs/env-setup-checklist.md) para preencher e validar os valores reais antes de publicar.

### Obrigatórias para desenvolvimento local mínimo

```env
PORT=3000
SITE_URL=http://localhost:4200
ADMIN_PASSWORD=admin123
ADMIN_TOKEN=local-admin-token
```

Com estas quatro variáveis, a aplicação já arranca com storage local em JSON e pagamentos manuais.

### Obrigatórias para produção com Supabase e Stripe

```env
SITE_URL=https://seu-dominio.pt
ADMIN_PASSWORD=...
ADMIN_TOKEN=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

### Opcionais

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SUPABASE_ANON_KEY=
STRIPE_PAYMENT_METHOD_TYPES=card
```

Notas rápidas:

- `SMTP_*` só é necessário para envio real de e-mails transacionais.
- `SUPABASE_ANON_KEY` não é usada pelo backend atual; pode ser útil se depois quiser expor chamadas diretas do frontend ao Supabase.
- `STRIPE_PAYMENT_METHOD_TYPES` pode ficar em `card` para o cenário atual.

## Supabase

1. Crie um projeto no Supabase.
2. Execute o SQL em [backend/supabase/schema.sql](backend/supabase/schema.sql).
3. Preencha no ficheiro `backend/.env`:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Se estas variáveis não estiverem definidas, a aplicação continua a usar [backend/data/store.json](backend/data/store.json).

## Stripe

Para ativar pagamentos com cartão:

```env
SITE_URL=http://localhost:4200
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PAYMENT_METHOD_TYPES=card
```

Depois exponha o backend e aponte o webhook Stripe para:

```text
POST /api/payments/stripe/webhook
```

Evento mínimo recomendado: `checkout.session.completed`.

Sem Stripe configurado, o checkout continua funcional para MB WAY, Multibanco e transferência em modo operacional manual.

## Branding

Os assets locais de demonstração estão em [frontend/public/brand](frontend/public/brand). Substitua-os pelos ficheiros finais da marca sem precisar alterar a estrutura do frontend.

## Próximos passos recomendados

1. Ligar um domínio final e atualizar [frontend/public/sitemap.xml](frontend/public/sitemap.xml) e [frontend/public/robots.txt](frontend/public/robots.txt).
2. Substituir os SVGs de demonstração por fotografia ou vídeo final de marca.
3. Configurar SMTP real para confirmações transacionais.
