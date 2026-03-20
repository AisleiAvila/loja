# Backend Refactoring Patterns (Node.js / Express)

## 1. Zod Validation on Every Incoming Payload

Never access `req.body` fields directly without parsing through a Zod schema.

```javascript
// ❌ Before
app.post('/api/orders', async (req, res) => {
  const { productId, quantity, email } = req.body;
  // no validation — any value can be injected
});

// ✅ After
app.post('/api/orders', async (req, res) => {
  try {
    const payload = orderSchema.parse(req.body);
    // payload is fully typed and validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    return res.status(500).json({ message: 'Erro interno.' });
  }
});
```

## 2. Admin Route Auth Guard

Always check the Authorization header on admin routes. Extract the check so it is not copy-pasted.

```javascript
// ✅ Reusable guard pattern used in this project
function requireAdmin(req, res) {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${adminToken}`) {
    res.status(401).json({ message: 'Não autorizado.' });
    return false;
  }
  return true;
}

// Usage
app.get('/api/orders', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  // proceed
});
```

## 3. Consistent Error Responses

All error responses must return JSON `{ message: string }` — never plain text or unstructured objects.

```javascript
// ❌ Before
res.status(400).send('Bad request');
res.status(500).send(error.message);

// ✅ After
res.status(400).json({ message: 'Pedido inválido.' });
res.status(500).json({ message: 'Erro interno do servidor.' });
```

## 4. Route Parameter Sanitization

`req.params` and `req.query` values are user-controlled strings. Never use them in file system paths unsanitized.

```javascript
// ❌ Before — path traversal risk
const filePath = path.join(uploadDir, req.params.filename);

// ✅ After — use path.basename to strip directory segments
const safeName = path.basename(req.params.filename);
const filePath = path.join(uploadDir, safeName);
```

## 5. Webhook Raw Body Ordering

The Stripe webhook route must be registered **before** `express.json()` to receive the raw body needed for signature validation.

```javascript
// ✅ Correct order (already in this project — do not change)
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), handler);
// ...
app.use(express.json()); // must come AFTER the raw webhook route
```

## 6. Multer File Upload Validation

Always use the project's existing `upload` middleware (not a custom `multer()` instance) to enforce the MIME type allowlist and 5 MB size limit.

```javascript
// ✅ Use the configured instance
app.post('/api/uploads/image', requireAdminMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Nenhum ficheiro enviado.' });
  }
  // req.file.mimetype is already validated
});
```

Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`.

## 7. async/await Error Handling

Wrap every `async` route handler in try/catch. Always return after sending a response to prevent "headers already sent" errors.

```javascript
// ✅ Standard pattern
app.get('/api/something', async (req, res) => {
  try {
    const result = await someAsyncOperation();

    if (!result) {
      return res.status(404).json({ message: 'Não encontrado.' });
    }

    return res.json(result);
  } catch {
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});
```

## 8. Zod Schema Reuse

Define Zod schemas at the module top level, not inline inside route handlers. Use `.extend()` and `.omit()` to derive variations.

```javascript
// ✅ Define once at top level (already done for productSchema / newProductSchema)
const newProductSchema = productSchema.omit({ id: true }).extend({
  id: z.string().optional()
});
```

## 9. Storage / Payment Feature Detection

Before using optional integrations, always check if they are initialized:

```javascript
// ✅ Pattern used throughout this project
if (!stripe) {
  return res.status(404).json({ message: 'Pagamentos por cartão não configurados.' });
}

if (!supabase) {
  // fall back to local JSON
}
```
