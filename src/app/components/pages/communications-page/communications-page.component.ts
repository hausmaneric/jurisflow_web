import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';
import { JurisflowDataService } from '../../../services/jurisflow-data.service';

type MessageTemplateRow = {
  id: string;
  name: string;
  channel: string;
  subject?: string;
  description?: string;
};

@Component({
  selector: 'app-communications-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, ConfirmDialogComponent],
  templateUrl: './communications-page.component.html',
  styleUrl: './communications-page.component.scss'
})
export class CommunicationsPageComponent implements OnInit {
  searchTerm = '';
  channelFilter = 'todos';
  statusFilter = 'todos';
  selectedMessageIndex = 0;
  templates: MessageTemplateRow[] = [];
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

  get filteredMessages(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.data.communications.filter((message) => {
      const matchesChannel = this.channelFilter === 'todos' || String(message.canal).toLowerCase() === this.channelFilter;
      const matchesStatus = this.statusFilter === 'todos' || String(message.status).toLowerCase() === this.statusFilter;
      const haystack = [message.assunto, message.processoCliente, message.destinatario, message.canal]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      return matchesChannel && matchesStatus && matchesSearch;
    });
  }

  get selectedMessage(): any | null {
    return this.filteredMessages[this.selectedMessageIndex] ?? this.filteredMessages[0] ?? null;
  }

  get filteredTemplates(): MessageTemplateRow[] {
    if (this.channelFilter === 'todos') {
      return this.templates.slice(0, 5);
    }

    return this.templates
      .filter((template) => String(template.channel).toLowerCase() === this.channelFilter)
      .slice(0, 5);
  }

  get relatedDocuments(): any[] {
    const message = this.selectedMessage;
    if (!message) {
      return [];
    }

    return this.data.documents
      .filter((document) => {
        const sameClient = message.clientId && document.clientId && message.clientId === document.clientId;
        const sameCase = message.caseId && document.caseId && message.caseId === document.caseId;
        return sameClient || sameCase;
      })
      .slice(0, 4);
  }

  get sentCount(): number {
    return this.data.communications.filter((item) => item.status === 'Enviada').length;
  }

  get scheduledCount(): number {
    return this.data.communications.filter((item) => item.status === 'Agendada').length;
  }

  get failedCount(): number {
    return this.data.communications.filter((item) => item.status === 'Falha').length;
  }

  selectMessage(index: number): void {
    this.selectedMessageIndex = index;
  }

  openCreate(): void {
    void this.router.navigate(['/plataforma/comunicacoes/nova']);
  }

  openFromTemplate(template: MessageTemplateRow): void {
    void this.router.navigate(['/plataforma/comunicacoes/nova'], {
      queryParams: {
        template: template.id,
        client: this.selectedMessage?.clientId ?? '',
        case: this.selectedMessage?.caseId ?? '',
        channel: template.channel ?? ''
      }
    });
  }

  openRelatedDocument(): void {
    void this.router.navigate(['/plataforma/documentos/novo'], {
      queryParams: {
        client: this.selectedMessage?.clientId ?? '',
        case: this.selectedMessage?.caseId ?? ''
      }
    });
  }

  openDetails(message: any): void {
    const id = message?.id ?? message?.uuid ?? '';
    if (!id) {
      void this.router.navigate(['/plataforma/comunicacoes/nova']);
      return;
    }

    void this.router.navigate(['/plataforma/comunicacoes', id]);
  }

  openEdit(message: any): void {
    const id = message?.id ?? message?.uuid ?? '';
    if (!id) {
      void this.router.navigate(['/plataforma/comunicacoes/nova']);
      return;
    }

    void this.router.navigate(['/plataforma/comunicacoes', id, 'editar']);
  }

  openDocument(document: any): void {
    const id = document?.id ?? '';
    if (!id) {
      return;
    }

    void this.router.navigate(['/plataforma/documentos', id]);
  }

  requestRemove(message: any): void {
    if (!message?.id) {
      return;
    }
    this.pendingRemoval = message;
  }

  cancelRemove(): void {
    this.pendingRemoval = null;
  }

  async confirmRemove(): Promise<void> {
    const message = this.pendingRemoval;
    const id = message?.id ?? '';
    if (!id) {
      return;
    }

    this.pendingRemoval = null;
    await firstValueFrom(this.api.delete('messages', id));
    await this.data.loadRemoteContext(true);
    this.selectedMessageIndex = 0;
  }

  private async loadTemplates(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.list<any>('message-templates', { limit: 20 }));
      this.templates = (response?.data ?? []).map((item) => ({
        id: String(item.id ?? ''),
        name: item.name ?? 'Modelo',
        channel: item.channel ?? 'email',
        subject: item.subject ?? '',
        description: item.description ?? item.body ?? ''
      }));
    } catch {
      this.templates = [];
    }
  }
}
