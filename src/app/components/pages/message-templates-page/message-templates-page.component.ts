import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-message-templates-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, ConfirmDialogComponent],
  templateUrl: './message-templates-page.component.html',
  styleUrl: './message-templates-page.component.scss'
})
export class MessageTemplatesPageComponent implements OnInit {
  loading = false;
  errorMessage = '';
  searchTerm = '';
  templates: any[] = [];
  pendingRemoval: any | null = null;

  constructor(
    private api: JurisflowApiService,
    private router: Router
  ) {}

  get filteredTemplates(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.templates.filter((item) => {
      const haystack = [item?.name, item?.channel, item?.subject, item?.body]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !term || haystack.includes(term);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await firstValueFrom(this.api.list<any>('message-templates', { limit: 200 }));
      this.templates = response?.data ?? [];
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar os modelos de comunicacao.';
    } finally {
      this.loading = false;
    }
  }

  openCreate(): void {
    void this.router.navigate(['/plataforma/modelos-comunicacao/novo']);
  }

  openEdit(item: any): void {
    if (!item?.id) return;
    void this.router.navigate(['/plataforma/modelos-comunicacao', item.id, 'editar']);
  }

  useTemplate(item: any): void {
    if (!item?.id) return;
    void this.router.navigate(['/plataforma/comunicacoes/nova'], {
      queryParams: { template: item.id, channel: item.channel ?? '' }
    });
  }

  previewText(item: any): string {
    const body = String(item?.body ?? '').replace(/\s+/g, ' ').trim();
    return body.length > 120 ? `${body.slice(0, 120)}...` : body || 'Sem conteudo de previa.';
  }

  requestRemove(item: any): void {
    if (!item?.id) {
      return;
    }
    this.pendingRemoval = item;
  }

  cancelRemove(): void {
    this.pendingRemoval = null;
  }

  async confirmRemove(): Promise<void> {
    const item = this.pendingRemoval;
    if (!item?.id) {
      return;
    }
    this.pendingRemoval = null;
    await firstValueFrom(this.api.delete('message-templates', item.id));
    await this.load();
  }
}
