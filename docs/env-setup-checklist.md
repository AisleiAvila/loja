# Checklist de Configuração

Use este ficheiro quando tiver os valores reais para o ambiente.

## 1. Base da aplicação

- [ ] Preencher `SITE_URL` com o domínio final, por exemplo `https://loja.sua-marca.pt`
- [ ] Alterar `ADMIN_PASSWORD`
- [ ] Alterar `ADMIN_TOKEN`
- [ ] Confirmar que `PORT` está adequado ao ambiente de deploy

## 2. Supabase

- [ ] Criar projeto no Supabase
- [ ] Executar [backend/supabase/schema.sql](backend/supabase/schema.sql)
- [ ] Preencher `SUPABASE_URL`
- [ ] Preencher `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Confirmar que a API deixa de responder com `storage: local-json` no healthcheck

Validação rápida:

```bash
curl http://localhost:3000/api/health
```

Resultado esperado:

```json
{
  "ok": true,
  "storage": "supabase",
  "payments": "offline"
}
```

## 3. Stripe

- [ ] Preencher `STRIPE_SECRET_KEY`
- [ ] Preencher `STRIPE_WEBHOOK_SECRET`
- [ ] Manter `STRIPE_PAYMENT_METHOD_TYPES=card`, salvo se houver necessidade real de expandir
- [ ] Criar endpoint de webhook no painel Stripe apontando para `/api/payments/stripe/webhook`
- [ ] Subscrever pelo menos o evento `checkout.session.completed`

Validação rápida:

- [ ] Criar um pedido com `paymentMethod=card`
- [ ] Confirmar que a resposta da API contém `paymentProvider: stripe`
- [ ] Confirmar que o redirecionamento abre o Stripe Checkout
- [ ] Confirmar que o pedido passa para `paid` após o webhook

## 4. SMTP

- [ ] Preencher `SMTP_HOST`
- [ ] Preencher `SMTP_PORT`
- [ ] Preencher `SMTP_USER`
- [ ] Preencher `SMTP_PASS`
- [ ] Preencher `SMTP_FROM`

Se não configurar SMTP, a aplicação continua a funcionar, mas sem envio real de e-mails.

## 5. Produção

- [ ] Atualizar [frontend/public/robots.txt](frontend/public/robots.txt) com o domínio final
- [ ] Atualizar [frontend/public/sitemap.xml](frontend/public/sitemap.xml) com o domínio final
- [ ] Substituir assets em [frontend/public/brand](frontend/public/brand)
- [ ] Fazer um build limpo do frontend
- [ ] Validar o arranque do backend com as variáveis reais

Comandos úteis:

```bash
npm run build --prefix frontend
node --check backend/index.js
```

## 6. Verificação final

- [ ] Home carrega corretamente
- [ ] Produtos aparecem com dados esperados
- [ ] Checkout cria pedido manual
- [ ] Checkout por cartão abre Stripe
- [ ] Página de obrigado mostra o `orderId` correto
- [ ] Painel admin lista pedidos e guarda alterações
