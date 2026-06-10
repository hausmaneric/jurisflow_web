import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { UploaderModule } from '@syncfusion/ej2-angular-inputs';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';
import { JurisflowDataService } from '../../../services/jurisflow-data.service';

type DocumentTemplateRow = {
  id: string;
  name: string;
  category?: string;
  fileType?: string;
};

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, UploaderModule, ConfirmDialogComponent],
  templateUrl: './documents-page.component.html',
  styleUrl: './documents-page.component.scss'
})
export class DocumentsPageComponent implements OnInit {
  searchTerm = '';
  typeFilter = 'todos';
  folderFilter = 'todas';
  selectedDocumentIndex = 0;
  templates: DocumentTemplateRow[] = [];
  pendingRemoval: any | null = null;

  constructor(
    public data: JurisflowDataService,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.data.loadRemoteContext();
    await this.loadTemplates();
  }

  get filteredDocuments(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.data.documents.filter((document) => {
      const matchesType = this.typeFilter === 'todos' || String(document.tipo).toLowerCase() === this.typeFilter;
      const matchesFolder = this.folderFilter === 'todas' || document.pasta === this.folderFilter;
      const haystack = [document.nome, document.processoCliente, document.pasta, document.tipo].join(' ').toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      return matchesType && matchesFolder && matchesSearch;
    });
  }

  get selectedDocument(): any | null {
    return this.filteredDocuments[this.selectedDocumentIndex] ?? this.filteredDocuments[0] ?? null;
  }

  get documentTypes(): string[] {
    return Array.from(new Set(this.data.documents.map((document) => document.tipo))).sort((a, b) => a.localeCompare(b));
  }

  get documentFolders(): string[] {
    return Array.from(new Set(this.data.documents.map((document) => document.pasta))).sort((a, b) => a.localeCompare(b));
  }

  get filteredTemplates(): DocumentTemplateRow[] {
    if (this.folderFilter === 'todas') {
      return this.templates.slice(0, 5);
    }

    return this.templates
      .filter((template) => (template.category ?? 'Geral') === this.folderFilter)
      .slice(0, 5);
  }

  get relatedCommunications(): any[] {
    const document = this.selectedDocument;
    if (!document) {
      return [];
    }

    return this.data.communications
      .filter((message) => {
        const sameClient = document.clientId && message.clientId && document.clientId === message.clientId;
        const sameCase = document.caseId && message.caseId && document.caseId === message.caseId;
        return sameClient || sameCase;
      })
      .slice(0, 4);
  }

  selectDocument(index: number): void {
    this.selectedDocumentIndex = index;
  }

  openCreate(): void {
    void this.router.navigate(['/plataforma/documentos/novo']);
  }

  openFromTemplate(template: DocumentTemplateRow): void {
    void this.router.navigate(['/plataforma/documentos/novo'], {
      queryParams: {
        template: template.id,
        client: this.selectedDocument?.clientId ?? '',
        case: this.selectedDocument?.caseId ?? '',
        fileType: template.fileType ?? ''
      }
    });
  }

  openRelatedCommunication(): void {
    void this.router.navigate(['/plataforma/comunicacoes/nova'], {
      queryParams: {
        client: this.selectedDocument?.clientId ?? '',
        case: this.selectedDocument?.caseId ?? ''
      }
    });
  }

  openDetails(document: any): void {
    const id = document?.id ?? document?.uuid ?? '';
    if (!id) {
      return;
    }

    void this.router.navigate(['/plataforma/documentos', id]);
  }

  openEdit(document: any): void {
    const id = document?.id ?? document?.uuid ?? '';
    if (!id) {
      return;
    }

    void this.router.navigate(['/plataforma/documentos', id, 'editar']);
  }

  requestRemove(document: any): void {
    if (!document?.id) {
      return;
    }
    this.pendingRemoval = document;
  }

  cancelRemove(): void {
    this.pendingRemoval = null;
  }

  async confirmRemove(): Promise<void> {
    const document = this.pendingRemoval;
    const id = document?.id ?? '';
    if (!id) {
      return;
    }

    this.pendingRemoval = null;
    await firstValueFrom(this.api.delete('documents', id));
    await this.data.loadRemoteContext(true);
  }

  openFile(document: any): void {
    const fileUrl = document?.fileUrl ?? '';
    if (!fileUrl) {
      return;
    }

    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }

  downloadFile(document: any): void {
    const fileUrl = document?.fileUrl ?? '';
    if (!fileUrl) {
      return;
    }

    const anchor = window.document.createElement('a');
    anchor.href = fileUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.download = document?.nome ?? 'documento';
    anchor.click();
  }

  openCommunication(message: any): void {
    const id = message?.id ?? '';
    if (!id) {
      return;
    }

    void this.router.navigate(['/plataforma/comunicacoes', id]);
  }

  private async loadTemplates(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.list<any>('document-templates', { limit: 20 }));
      this.templates = (response?.data ?? []).map((item) => ({
        id: String(item.id ?? ''),
        name: item.name ?? 'Modelo',
        category: item.category ?? 'Geral',
        fileType: item.file_type ?? 'PDF'
      }));
    } catch {
      this.templates = [];
    }
  }
}
