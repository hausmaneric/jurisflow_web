import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

type CaseAiInsights = {
  summary: string;
  health_score: number;
  risk_level: string;
  open_tasks: number;
  overdue_tasks: number;
  upcoming_appointments: number;
  documents_count: number;
  messages_count: number;
  next_appointment_at?: string;
  next_actions: string[];
  communication_suggestion: string;
  document_suggestion: string;
};

type CaseSyncDiagnosis = {
  datajud?: { ready: boolean; court?: string; court_label?: string; base_url?: string };
  tribunal?: { ready: boolean; certificate?: any; connector?: any; expired_certificates?: number };
  case?: { normalized_case_number?: string; lawyer_id?: string };
  checks?: Array<{ key: string; label: string; ready: boolean; message: string }>;
};

@Component({
  selector: 'app-process-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './process-detail-page.component.html',
  styleUrl: './process-detail-page.component.scss'
})
export class ProcessDetailPageComponent implements OnInit {
  loading = false;
  errorMessage = '';
  operationMessage = '';
  processId = '';
  syncing = false;

  process: any = null;
  aiInsights: CaseAiInsights | null = null;
  syncDiagnosis: CaseSyncDiagnosis | null = null;
  agendaItems: Array<{ id?: string; title: string; type: string; when: string; owner: string; status: string; location: string }> = [];
  documents: Array<{ id?: string; title: string; type: string; createdAt: string }> = [];
  communications: Array<{ id?: string; title: string; channel: string; when: string; recipient: string }> = [];
  syncLogs: any[] = [];
  historyRows: Array<{ kind: string; title: string; subtitle: string; when: string; targetId?: string }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  async ngOnInit(): Promise<void> {
    this.processId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.processId) {
      await this.router.navigate(['/plataforma/processos']);
      return;
    }

    await this.loadProcess();
  }

  async goToEdit(): Promise<void> {
    await this.router.navigate(['/plataforma/processos', this.processId, 'editar']);
  }

  async createAgendaItem(): Promise<void> {
    await this.router.navigate(['/plataforma/agenda/novo'], {
      queryParams: {
        case: this.processId,
        client: this.process?.client_id ?? ''
      }
    });
  }

  async createDocument(): Promise<void> {
    await this.router.navigate(['/plataforma/documentos/novo'], {
      queryParams: {
        case: this.processId,
        client: this.process?.client_id ?? ''
      }
    });
  }

  async createCommunication(): Promise<void> {
    await this.router.navigate(['/plataforma/comunicacoes/nova'], {
      queryParams: {
        case: this.processId,
        client: this.process?.client_id ?? '',
        body: this.aiInsights?.communication_suggestion ?? ''
      }
    });
  }

  async createSuggestedDocument(): Promise<void> {
    await this.router.navigate(['/plataforma/documentos/novo'], {
      queryParams: {
        case: this.processId,
        client: this.process?.client_id ?? '',
        title: this.aiInsights?.document_suggestion ?? 'Documento sugerido'
      }
    });
  }

  async syncDataJud(): Promise<void> {
    await this.runSync('sync-datajud', 'Consulta gratuita DataJud concluida.');
  }

  async syncTribunal(): Promise<void> {
    await this.runSync('sync-tribunal', 'Consulta ao tribunal concluida com certificado do advogado.');
  }

  async syncFull(): Promise<void> {
    await this.runSync('sync-full', 'Sincronizacao completa concluida.');
  }

  async openClient(): Promise<void> {
    const clientId = this.process?.client_id;
    if (!clientId) {
      this.errorMessage = 'Este processo ainda nao possui cliente vinculado.';
      return;
    }

    await this.router.navigate(['/plataforma/clientes', clientId]);
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
          case: this.processId,
          client: this.process?.client_id ?? ''
        }
      });
    }
  }

  async loadProcess(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const [processResponse, agendaResponse, documentsResponse, messagesResponse, syncLogsResponse, diagnosisResponse, aiResponse] = await Promise.all([
        firstValueFrom(this.api.get<any>('cases', this.processId)),
        firstValueFrom(this.api.list<any>('agenda-items', { case_id: this.processId, limit: 20 })),
        firstValueFrom(this.api.list<any>('documents', { case_id: this.processId, limit: 20 })),
        firstValueFrom(this.api.list<any>('messages', { case_id: this.processId, limit: 20 })),
        firstValueFrom(this.api.list<any>('case-sync-logs', { case_id: this.processId, limit: 20 })),
        firstValueFrom(this.api.getPath<CaseSyncDiagnosis>(`cases/${this.processId}/sync-diagnosis`)),
        firstValueFrom(this.api.getPath<CaseAiInsights>(`ai/case-insights/${this.processId}`))
      ]);

      this.process = processResponse?.data ?? null;
      this.aiInsights = aiResponse?.data ?? null;
      this.syncDiagnosis = diagnosisResponse?.data ?? null;
      this.agendaItems = (agendaResponse?.data ?? []).map((row) => ({
        id: row.id,
        title: row.title ?? 'Item da agenda',
        type: row.item_type ?? (row.item_kind === 'task' ? 'Tarefa' : 'Compromisso'),
        when: this.formatDateTime(row.start_at ?? row.due_at ?? row.created_at),
        owner: row.owner_user_name ?? row.assigned_user_name ?? row.client_name ?? '-',
        status: row.status ?? 'open',
        location: row.location ?? '-'
      }));
      this.documents = (documentsResponse?.data ?? []).map((row) => ({
        id: row.id,
        title: row.title ?? 'Documento',
        type: row.file_type ?? row.status ?? 'arquivo',
        createdAt: this.formatDate(row.created_at)
      }));
      this.communications = (messagesResponse?.data ?? []).map((row) => ({
        id: row.id,
        title: row.subject ?? 'Comunicacao',
        channel: row.channel ?? 'email',
        when: this.formatDateTime(row.sent_at ?? row.created_at),
        recipient: row.recipient ?? row.recipient_name ?? '-'
      }));
      this.syncLogs = syncLogsResponse?.data ?? [];

      this.historyRows = [
        ...this.agendaItems.map((row) => ({
          kind: 'Agenda',
          title: row.title,
          subtitle: `${row.type} - ${row.status}`,
          when: row.when,
          targetId: row.id
        })),
        ...this.documents.map((row) => ({
          kind: 'Documento',
          title: row.title,
          subtitle: row.type,
          when: row.createdAt,
          targetId: row.id
        })),
        ...this.communications.map((row) => ({
          kind: 'Comunicacao',
          title: row.title,
          subtitle: `${row.channel} - ${row.recipient}`,
          when: row.when,
          targetId: row.id
        }))
      ]
        .sort((a, b) => this.parseDateTime(b.when) - this.parseDateTime(a.when))
        .slice(0, 12);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o processo.';
    } finally {
      this.loading = false;
    }
  }

  private async runSync(path: string, success: string): Promise<void> {
    if (this.syncing) {
      return;
    }
    this.syncing = true;
    this.operationMessage = '';
    try {
      const response = await firstValueFrom(this.api.postPath<any>(`cases/${this.processId}/${path}`, {}));
      if (!response?.status) {
        throw new Error(response?.message || 'Nao foi possivel sincronizar o processo.');
      }
      await this.loadProcess();
      this.operationMessage = response.message || success;
    } catch (error) {
      this.operationMessage = error instanceof Error ? error.message : 'Nao foi possivel sincronizar o processo.';
    } finally {
      this.syncing = false;
    }
  }

  syncReady(kind: 'datajud' | 'tribunal'): boolean {
    if (kind === 'datajud') {
      return Boolean(this.syncDiagnosis?.datajud?.ready);
    }
    return Boolean(this.syncDiagnosis?.tribunal?.ready);
  }

  riskLabel(value?: string): string {
    const risk = String(value || '').toLowerCase();
    if (risk === 'alto') return 'Alto risco';
    if (risk === 'medio') return 'Risco moderado';
    if (risk === 'baixo') return 'Risco controlado';
    return value || '-';
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
