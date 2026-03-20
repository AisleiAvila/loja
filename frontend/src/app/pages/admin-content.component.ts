import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';
import { SiteContent } from '../types';

@Component({
  selector: 'app-admin-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-content.component.html',
  styleUrl: './admin-content.component.scss'
})
export class AdminContentComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  readonly token = input.required<string>();
  readonly unauthorized = output<void>();

  protected readonly content = signal<SiteContent | null>(null);
  protected readonly feedback = signal('');

  ngOnInit(): void {
    this.apiService.getContent().subscribe({
      next: (content) => this.content.set(content),
      error: (err) => {
        if (err.status === 401) this.unauthorized.emit();
      }
    });
  }

  protected saveContent(): void {
    const token = this.token();
    const content = this.content();

    if (!token || !content) {
      return;
    }

    this.apiService.updateContent(token, content).subscribe({
      next: (updated) => {
        this.content.set(updated);
        this.feedback.set('Conteúdo institucional atualizado.');
      },
      error: (error) => {
        if (error.status === 401) { this.unauthorized.emit(); return; }
        this.feedback.set('Não foi possível atualizar o conteúdo.');
      }
    });
  }
}
