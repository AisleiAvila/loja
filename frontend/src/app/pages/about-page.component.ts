import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { ApiService } from '../services/api.service';
import { SiteContent } from '../types';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss'
})
export class AboutPageComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly content = signal<SiteContent | null>(null);

  ngOnInit(): void {
    this.apiService.getContent().subscribe((content) => this.content.set(content));
  }
}
