import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { ApiService } from './api.service';
import { SiteContent } from '../types';

@Injectable({ providedIn: 'root' })
export class ContentStoreService {
  private readonly apiService = inject(ApiService);
  private cache$: Observable<SiteContent> | null = null;

  getContent(): Observable<SiteContent> {
    if (!this.cache$) {
      this.cache$ = this.apiService.getContent().pipe(shareReplay(1));
    }
    return this.cache$;
  }

  invalidate(): void {
    this.cache$ = null;
  }
}
