# Coding Conventions — Loja Luz do Atlântico

## TypeScript

| Rule | Value |
|------|-------|
| Strict mode | `"strict": true` |
| No implicit returns | `"noImplicitReturns": true` |
| No implicit overrides | `"noImplicitOverride": true` |
| No index access from property | `"noPropertyAccessFromIndexSignature": true` |
| Isolated modules | `"isolatedModules": true` |
| Target | ES2022 |

- Always declare explicit types on signals: `signal<Product[]>([])` not `signal([])`
- Use `??` (nullish coalescing) and `?.` (optional chaining) rather than `||` for type-safe defaults
- Prefer `const` and `readonly` everywhere possible

## Angular

### Standalone & Imports

Every component must be `standalone: true`. Never use `NgModule`.

Only import Angular modules that are actually used in the template. Common ones:

| Module | When to include |
|--------|----------------|
| `CommonModule` | `*ngIf`, `*ngFor`, `ngClass`, `ngStyle` |
| `RouterLink` | `[routerLink]` bindings |
| `FormsModule` | `[(ngModel)]` two-way binding |
| `ReactiveFormsModule` | `[formGroup]` / `formControlName` |
| `CurrencyPipe` | `{{ value \| currency }}` |
| `DatePipe` | `{{ value \| date }}` |
| `AsyncPipe` | `{{ obs$ \| async }}` |

### Dependency Injection

```typescript
// ✅ Correct
private readonly apiService = inject(ApiService);

// ❌ Never use constructor injection
constructor(private apiService: ApiService) {}
```

### Signals

```typescript
// Mutable state
protected readonly count = signal<number>(0);

// Derived state
protected readonly doubled = computed(() => this.count() * 2);

// Update
this.count.set(5);
this.count.update(prev => prev + 1);
```

Template access — always call as a function:
```html
<p>{{ count() }}</p>
<p *ngIf="content()">{{ content()?.brand.name }}</p>
```

### Access Modifier Convention

| Target | Modifier |
|--------|----------|
| Injected service | `private readonly` |
| Signal (exposed to template) | `protected readonly` |
| Constant (not for template) | `private readonly` |
| Lifecycle constants | `private readonly` |

## File Naming

- Components: `<name>-page.component.ts` / `.html` / `.scss`
- Services: `<name>.service.ts`
- Types: defined in `frontend/src/app/types.ts` (centralized, not per-file)
- Naming: always kebab-case for file names, PascalCase for class names

## SCSS

- Use component-scoped SCSS (the `.scss` file paired with the component)
- Prefer CSS Grid and Flexbox — no third-party layout library
- Use `clamp()` for responsive font sizes and spacing: `font-size: clamp(1rem, 3vw, 2rem)`
- Use BEM-like flat selectors: `.hero`, `.hero-copy`, `.hero-media` — avoid deep nesting
- Do not use `!important`

## Types

All shared interfaces live in `frontend/src/app/types.ts`. Key types:

- `Product` — id, slug, name, shortDescription, description, price, compareAtPrice?, images[], videoUrl?, benefits[], featured?, badge?
- `SiteContent` — brand (`BrandContent`), about (`AboutContent`), contact (`ContactContent`)
- `Order` — extends `OrderFormValue` with id, productName, total, status
- `OrderFormValue` — checkout form fields (productId, quantity, customerName, email, phone, address, postalCode, city, paymentMethod, notes?)

When a new type is needed, add it to `types.ts` rather than declaring it inline in the component.

## Routing

Routes are declared in `frontend/src/app/app.routes.ts`. Use static paths in Portuguese (e.g. `sobre`, `contacto`). Dynamic segments use `:slug` format.

Always include a `title` property on each route: `title: 'Luz do Atlântico | <Page Title>'`.

The wildcard `**` redirect to `''` is already defined — do not add another catch-all.
