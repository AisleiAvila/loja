---
name: code-refactor
description: 'Refatorar código, refactoring, modernizar código legado, melhorar qualidade, atualizar padrões, converter componente Angular para standalone, converter para signals, substituir constructor injection por inject(), corrigir TypeScript strict, melhorar código Express Node.js, padronizar validação Zod, melhorar SCSS responsivo. Use when asked to refactor, modernize, clean up, or improve any code in this project.'
user-invocable: false
---

# Code Refactor — Loja Luz do Atlântico

## When to Use

Activate this skill whenever the user asks to:
- Refactor, modernize, clean up, or improve existing code
- Convert legacy Angular patterns (constructor injection, NgModules, `BehaviorSubject`) to current project standards
- Update Express routes, add Zod validation, or reorganize backend logic
- Fix TypeScript strict-mode violations
- Improve SCSS structure or responsiveness

---

## Priority Order

Apply changes in this order to avoid regressions:

1. **TypeScript types** — fix implicit `any`, add missing types, align with `types.ts`
2. **Angular patterns** — standalone, `inject()`, signals
3. **Backend patterns** — Zod schema validation, auth middleware reuse
4. **SCSS** — flat selectors, `clamp()`, remove hardcoded breakpoints

---

## Angular Refactoring

Full patterns in [./references/angular-patterns.md](./references/angular-patterns.md).

### Top transformations

| From (legacy) | To (current) |
|---------------|--------------|
| `constructor(private svc: Service)` | `private readonly svc = inject(Service)` |
| `BehaviorSubject<T>` + `async` pipe | `signal<T>()` + template call `value()` |
| `NgModule` declarations | `standalone: true` + inline `imports: []` |
| `this.observable$.pipe(tap(...))` side effects | `effect(() => { ... })` |
| `ngModel` two-way binding on non-forms | `signal()` + `(input)` event |

### Checklist — Angular

- [ ] No `constructor()` — all deps via `inject()`
- [ ] `standalone: true` on every component
- [ ] All mutable state is `signal<T>()`; derived state is `computed()`
- [ ] `protected readonly` for signals accessed in template
- [ ] Only needed Angular modules in `imports: []`
- [ ] Signals called as functions in template: `{{ value() }}`
- [ ] No implicit `any` — all signals typed explicitly

---

## Backend Refactoring

Full patterns in [./references/backend-patterns.md](./references/backend-patterns.md).

### Top transformations

| From (legacy) | To (current) |
|---------------|--------------|
| Manual `req.body` field access without validation | `schema.parse(req.body)` with Zod |
| Auth check copy-pasted into each route | Extract `requireAdmin(req, res)` guard |
| `try/catch` with `console.error` only | `try/catch` returning proper JSON `{ message: string }` |
| `req.params.id` used directly | Validated/sanitized before use |
| File upload with no MIME check | Use existing `upload` multer config with `allowedImageMimeTypes` |

### Checklist — Backend

- [ ] All incoming payloads validated with a Zod schema (`.parse()` or `.safeParse()`)
- [ ] Auth header validated for every admin route: `req.headers.authorization === \`Bearer ${adminToken}\``
- [ ] Error responses return `{ message: string }` JSON, not plain text
- [ ] No `req.params` / `req.query` values used unsanitized in file paths or SQL
- [ ] Webhook raw body handled before `express.json()` middleware

---

## TypeScript Refactoring

- Replace all `any` with concrete types from `frontend/src/app/types.ts` or inline interfaces
- Replace `||` with `??` when the intent is nullish coalescing (not falsy)
- Replace `as X` type assertions with proper narrowing (`if (x instanceof X)`, type guards)
- Ensure `noImplicitReturns` is satisfied — every branch of a function must return

---

## SCSS Refactoring

- Replace fixed `px` font sizes with `clamp()`: `font-size: clamp(1rem, 3vw, 2rem)`
- Replace deep nesting (`.parent .child .grandchild`) with flat BEM-like selectors (`.card`, `.card-title`, `.card-body`)
- Replace `@media (max-width: 768px)` breakpoints with fluid layouts using CSS Grid `auto-fit` / `minmax` where possible
- Remove `!important` — use specificity instead

---

## Refactoring Workflow

1. **Read** the file(s) to be refactored in full before changing anything
2. **Identify** which category applies (Angular / backend / TypeScript / SCSS)
3. **Apply** the matching checklist above
4. **Preserve** all existing business logic — only change structure, patterns, and syntax
5. **Verify** the project compiles without TypeScript errors after Angular changes
