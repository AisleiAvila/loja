# Angular Refactoring Patterns

## 1. Constructor Injection → inject()

```typescript
// ❌ Before
export class MyComponent {
  constructor(
    private readonly apiService: ApiService,
    private readonly router: Router
  ) {}
}

// ✅ After
export class MyComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
}
```

## 2. NgModule → Standalone

```typescript
// ❌ Before
@NgModule({
  declarations: [MyComponent],
  imports: [CommonModule, RouterModule]
})
export class MyModule {}

// ✅ After — no module file needed
@Component({
  selector: 'app-my',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my.component.html',
  styleUrl: './my.component.scss'
})
export class MyComponent {}
```

## 3. BehaviorSubject / Subject → signal()

```typescript
// ❌ Before
products$ = new BehaviorSubject<Product[]>([]);
loading$ = new BehaviorSubject<boolean>(false);

loadProducts() {
  this.loading$.next(true);
  this.api.getProducts().subscribe(p => {
    this.products$.next(p);
    this.loading$.next(false);
  });
}
```

```typescript
// ✅ After
protected readonly products = signal<Product[]>([]);
protected readonly loading = signal(false);

loadProducts(): void {
  this.loading.set(true);
  this.apiService.getProducts().subscribe(products => {
    this.products.set(products);
    this.loading.set(false);
  });
}
```

Template — always call signals as functions:
```html
<!-- ❌ Before (async pipe) -->
<div *ngFor="let p of products$ | async">

<!-- ✅ After -->
<div *ngFor="let p of products()">
```

## 4. Computed Values (replace derived local variables)

```typescript
// ❌ Before — recalculated on every change detection cycle
get featuredProducts(): Product[] {
  return this.products.filter(p => p.featured);
}

// ✅ After — memoized, recalculates only when products() changes
protected readonly featuredProducts = computed(() =>
  this.products().filter(p => p.featured)
);
```

## 5. Access Modifier Pattern

```typescript
// Order: private readonly > protected readonly > protected
export class MyComponent {
  // Services — private
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  // Config constants — private
  private readonly pageSize = 10;

  // State for templates — protected
  protected readonly items = signal<Item[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly filteredItems = computed(() => this.items().filter(...));
}
```

## 6. ngOnInit pattern

Always implement `OnInit` when data is loaded on initialization:

```typescript
export class MyComponent implements OnInit {
  ngOnInit(): void {
    this.apiService.getSomething().subscribe(data => {
      this.data.set(data);
    });
  }
}
```

## 7. Route Parameters (ActivatedRoute)

```typescript
// ✅ Project pattern — subscribe to paramMap in ngOnInit
ngOnInit(): void {
  this.route.paramMap.subscribe(params => {
    const slug = params.get('slug');
    if (!slug) return;

    this.apiService.getProductBySlug(slug).subscribe(product => {
      this.product.set(product);
    });
  });
}
```

## 8. Template Syntax Quick Reference

| Pattern | Syntax |
|---------|--------|
| Signal in template | `{{ value() }}` |
| Optional signal | `{{ content()?.brand.name }}` |
| Conditional render | `*ngIf="isLoading()"` |
| List render | `*ngFor="let item of items()"` |
| Class binding | `[class.active]="isActive()"` |
| Event binding | `(click)="handleClick()"` |
| Two-way (forms) | `[(ngModel)]="field"` (requires `FormsModule`) |

## 9. Imports to include per module used

| Template feature | Import needed |
|-----------------|---------------|
| `*ngIf`, `*ngFor`, `ngClass` | `CommonModule` |
| `[routerLink]`, `routerLinkActive` | `RouterLink` |
| `[(ngModel)]` | `FormsModule` |
| `[formGroup]` | `ReactiveFormsModule` |
| `\| currency` | `CurrencyPipe` |
| `\| date` | `DatePipe` |
| `\| async` | `AsyncPipe` |
