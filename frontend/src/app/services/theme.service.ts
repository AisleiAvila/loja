import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-preference';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly preference = signal<Theme>('system');
  readonly active = signal<'light' | 'dark'>('light');

  constructor() {
    if (!this.isBrowser) return;

    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      this.preference.set(stored);
    }

    this.apply(this.preference());

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', () => {
      if (this.preference() === 'system') this.apply('system');
    });
  }

  toggle(): void {
    const current = this.active();
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    this.preference.set(next);
    localStorage.setItem(STORAGE_KEY, next);
    this.apply(next);
  }

  reset(): void {
    this.preference.set('system');
    localStorage.removeItem(STORAGE_KEY);
    this.apply('system');
  }

  private apply(pref: Theme): void {
    if (!this.isBrowser) return;

    const resolved: 'light' | 'dark' =
      pref === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : pref;

    this.active.set(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }
}
