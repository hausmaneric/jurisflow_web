import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-client-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './client-detail-page.component.html',
  styleUrl: './client-detail-page.component.scss'
})
export class ClientDetailPageComponent implements OnInit {
  loading = false;
  errorMessage = '';
  clientId = '';

  client: any = null;
  clientInsights: any = null;
  processRows: Array<{ id?: string; number: string; title: string; status: string; updatedAt: string }> = [];
  financialRows: Array<{ label: string; value: string; status: string }> = [];
  communicationRows: Array<{ id?: string; subject: string; channel: string; when: string; owner: string }> = [];
  documentRows: Array<{ id?: string; title: string; type: string; when: string }> = [];
  agendaRows: Array<{ id?: string; title: string; type: string; when: string; status: string }> = [];
  historyRows: Array<{ kind: string; title: string; subtitle: string; when: string; targetId?: string }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  async ngOnInit(): Promise<void> {
    this.clientId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.clientId) {
      await this.router.navigate(['/plataforma/clientes']);
      return;
    }

    await this.loadClient();
  }

  async goToEdit(): Promise<void> {
    await this.router.navigate(['/plataforma/clientes', this.clientId, 'editar']);
  }

  async createAgendaItem(): Promise<void> {
    await this.router.navigate(['/plataforma/agenda/novo'], {
      queryParams: {
        client: this.clientId
      }
    });
  }

  async createDocument(): Promise<void> {
    await this.router.navigate(['/plataforma/documentos/novo'], {
      queryParams: {
        client: this.clientId
      }
    });
  }

  async createCommunication(): Promise<void> {
    await this.router.navigate(['/plataforma/comunicacoes/nova'], {
      queryParams: {
        client: this.clientId
      }
    });
  }

  async openProcess(processId?: string): Promise<void> {
    if (!processId) {
      return;
    }
    await this.router.navigate(['/plataforma/processos', processId]);
  }

  async openAgendaItem(agendaItemId?: string): Promise<void> {
    if (!agendaItemId) {
      return;
    }
    await this.router.navigate(['/plataforma/agenda', agendaItemId]);
  }

  async openDocument(documentId?: string): Promise<void> {
    if (!documentId) {
      return;
    }
    await this.router.navigate(['/plataforma/documentos', documentId]);
  }

  async openCommunication(messageId?: string): Promise<void> {
    if (!messageId) {
      return;
    }
    await this.router.navigate(['/plataforma/comunicacoes', messageId]);
  }

  async openHistoryRow(row: { kind: string; targetId?: string }): Promise<void> {
    if (row.kind === 'Documento') {
      await this.openDocument(row.targetId);
      return;
    }

    if (row.kind === 'Comunicacao') {
      await this.openCommunication(row.targetId);
      return;
    }

    if (row.kind === 'Agenda') {
      if (row.targetId) {
        await this.openAgendaItem(row.targetId);
        return;
      }

      await this.router.navigate(['/plataforma/agenda'], {
        queryParams: {
          client: this.clientId
        }
      });
    }
  }

  private async loadClient(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const [clientResponse, casesResponse, messagesResponse, documentsResponse, agendaResponse, financialResponse] = await Promise.all([
        firstValueFrom(this.api.get<any>('clients', this.clientId)),
        firstValueFrom(this.api.list<any>('cases', { client_id: this.clientId, limit: 20 })),
        firstValueFrom(this.api.list<any>('messages', { client_id: this.clientId, limit: 20 })),
        firstValueFrom(this.api.list<any>('documents', { client_id: this.clientId, limit: 20 })),
        firstValueFrom(this.api.list<any>('agenda-items', { client_id: this.clientId, limit: 20 })),
        firstValueFrom(this.api.list<any>('financial-entries', { client_id: this.clientId, limit: 100 }))
      ]);

      this.client = clientResponse?.data ?? null;
      try {
        const insightsResponse = await firstValueFrom(this.api.getPath<any>(`ai/client-insights/${this.clientId}`));
        this.clientInsights = insightsResponse?.data ?? null;
      } catch {
        this.clientInsights = null;
      }

      this.processRows = (casesResponse?.data ?? []).map((row) => ({
        id: row.id,
        number: row.case_number ?? row.id,
        title: row.title ?? 'Processo sem titulo',
        status: row.status ?? 'open',
        updatedAt: this.formatDate(row.updated_at ?? row.created_at)
      }));

      this.communicationRows = (messagesResponse?.data ?? []).map((row) => ({
        id: row.id,
        subject: row.subject ?? 'Comunicacao',
        channel: row.channel ?? 'email',
        when: this.formatDateTime(row.sent_at ?? row.created_at),
        owner: row.created_by_name ?? row.recipient ?? '-'
      }));

      this.documentRows = (documentsResponse?.data ?? []).map((row) => ({
        id: row.id,
        title: row.title ?? 'Documento',
        type: row.document_type ?? row.file_type ?? 'Arquivo',
        when: this.formatDateTime(row.created_at)
      }));

      this.agendaRows = (agendaResponse?.data ?? []).map((row) => ({
        id: row.id,
        title: row.title ?? 'Item da agenda',
        type: row.item_type ?? (row.item_kind === 'task' ? 'Tarefa' : 'Compromisso'),
        when: this.formatDateTime(row.start_at ?? row.due_at ?? row.created_at),
        status: row.status ?? 'open'
      }));

      this.financialRows = this.buildFinancialRows(financialResponse?.data ?? []);

      this.historyRows = [
        ...this.agendaRows.map((row) => ({
          kind: 'Agenda',
          title: row.title,
          subtitle: `${row.type} - ${row.status}`,
          when: row.when,
          targetId: row.id
        })),
        ...this.documentRows.map((row) => ({
          kind: 'Documento',
          title: row.title,
          subtitle: row.type,
          when: row.when,
          targetId: row.id
        })),
        ...this.communicationRows.map((row) => ({
          kind: 'Comunicacao',
          title: row.subject,
          subtitle: `${row.channel} - ${row.owner}`,
          when: row.when,
          targetId: row.id
        }))
      ]
        .sort((a, b) => this.parseDateTime(b.when) - this.parseDateTime(a.when))
        .slice(0, 12);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o cliente.';
    } finally {
      this.loading = false;
    }
  }

  initials(name?: string): string {
    return (name ?? 'CL')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private buildFinancialRows(entries: any[]): Array<{ label: string; value: string; status: string }> {
    const income = entries
      .filter((row) => String(row.entry_type ?? '').toLowerCase() !== 'expense')
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const pending = entries
      .filter((row) => {
        const status = String(row.status ?? '').toLowerCase();
        return status !== 'paid' && status !== 'received';
      })
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const settled = entries
      .filter((row) => {
        const status = String(row.status ?? '').toLowerCase();
        return status === 'paid' || status === 'received';
      })
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    return [
      { label: 'Total faturado', value: this.formatCurrency(income), status: 'Receita' },
      { label: 'Em aberto', value: this.formatCurrency(pending), status: 'Pendente' },
      { label: 'Liquidado', value: this.formatCurrency(settled), status: 'Recebido' }
    ];
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  private formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('pt-BR');
  }

  private formatDateTime(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  private parseDateTime(value?: string): number {
    if (!value || value === '-') return 0;
    const normalized = value.includes('/')
      ? value.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')
      : value;
    const parsed = Date.parse(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
