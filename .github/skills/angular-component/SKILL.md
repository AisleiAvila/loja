---
name: angular-component
description: 'Criar componente Angular, new Angular component, page component, standalone component, service Angular. Use for generating any new Angular component or service following the project conventions: standalone, signals, inject(), strict TypeScript, SCSS co-located files.'
user-invocable: false
---

# Angular Component — Loja Luz do Atlântico

## When to Use

Activate this skill whenever the user asks to:
- Create a new page, component, or service in the Angular frontend
- Add a new route to the application
- Scaffold any `.component.ts / .html / .scss` set of files

## File Structure

All **page components** go in `frontend/src/app/pages/` and follow the co-located three-file pattern:

```
frontend/src/app/pages/
  <name>-page.component.ts
  <name>-page.component.html
  <name>-page.component.scss
```

General **shared components** (non-page) go in `frontend/src/app/components/<name>/`.

**Services** go in `frontend/src/app/services/<name>.service.ts`.

## Component Template

Use this structure for every new component. Do **not** use a `constructor()` — inject dependencies via `inject()`.

```typescript
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-<name>-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './<name>-page.component.html',
  styleUrl: './<name>-page.component.scss'
})
export class <Name>PageComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly someData = signal<SomeType | null>(null);

  ngOnInit(): void {
    // fetch data here
  }
}
```

Key rules:
- `standalone: true` — always, no NgModules
- Dependencies injected with `inject()`, not constructor parameters
- State declared as `signal<T>()` (mutable) or `computed()` (derived)
- Access modifiers: `private readonly` for injected services, `protected readonly` for signals exposed to the template
- Add only the Angular modules actually used in the template to `imports: []`

## Service Template

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class <Name>Service {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getSomething(): Observable<SomeType> {
    return this.http.get<SomeType>(`${this.baseUrl}/something`);
  }
}
```

## Adding a Route

After creating the component, register it in `frontend/src/app/app.routes.ts` following the existing pattern:

```typescript
{
  path: '<route-path>',
  component: <Name>PageComponent,
  title: 'Luz do Atlântico | <Page Title>'
}
```

Import the component at the top of the file alongside the other page imports.

## TypeScript Conventions

See full TypeScript and SCSS conventions in [./references/conventions.md](./references/conventions.md).

Quick rules:
- `tsconfig.json` has `"strict": true`, `"noImplicitReturns": true`, `"noImplicitOverride": true`
- All signals must be typed: `signal<Product[]>([])`, never `signal([])`
- Use the `?.` safe navigation operator in templates for optional values
- In templates, call signals as functions: `{{ content()?.brand.name }}`

## Checklist

Before finishing:
- [ ] Three co-located files created (`.ts`, `.html`, `.scss`)
- [ ] `standalone: true` set
- [ ] No `constructor()` used — all deps via `inject()`
- [ ] All signals are explicitly typed
- [ ] Only required modules in `imports: []`
- [ ] Route added to `app.routes.ts` (if page component)
- [ ] TypeScript compiles without errors (`strict` mode)
