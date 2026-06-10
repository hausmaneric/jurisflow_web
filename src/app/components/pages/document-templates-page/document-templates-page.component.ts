import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-document-templates-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, ConfirmDialogComponent],
  templateUrl: './document-templates-page.component.html',
  styleUrl: './document-templates-page.component.scss'
})
export class DocumentTemplatesPageComponent implements OnInit {
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
      const haystack = [item?.name, item?.category, item?.file_type, item?.template_body]
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
      const response = await firstValueFrom(this.api.list<any>('document-templates', { limit: 200 }));
      this.templates = response?.data ?? [];
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar os modelos de documento.';
    } finally {
      this.loading = false;
    }
  }

  openCreate(): void {
    void this.router.navigate(['/plataforma/modelos-documento/novo']);
  }

  openEdit(item: any): void {
    if (!item?.id) return;
    void this.router.navigate(['/plataforma/modelos-documento', item.id, 'editar']);
  }

  useTemplate(item: any): void {
    if (!item?.id) return;
    void this.router.navigate(['/plataforma/documentos/novo'], {
      queryParams: { template: item.id }
    });
  }

  previewText(item: any): string {
    const body = String(item?.template_body ?? '').replace(/\s+/g, ' ').trim();
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
    await firstValueFrom(this.api.delete('document-templates', item.id));
    await this.load();
  }
}
