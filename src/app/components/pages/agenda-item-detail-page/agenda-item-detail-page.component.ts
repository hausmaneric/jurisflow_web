import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

type RelatedItem = {
  id: string;
  title: string;
  subtitle: string;
  when?: string;
};

@Component({
  selector: 'app-agenda-item-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './agenda-item-detail-page.component.html',
  styleUrl: './agenda-item-detail-page.component.scss'
})
export class AgendaItemDetailPageComponent implements OnInit {
  itemId = '';
  loading = false;
  errorMessage = '';
  item: any = null;
  relatedDocuments: RelatedItem[] = [];
  relatedCommunications: RelatedItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  get isTask(): boolean {
    return this.item?.item_kind === 'task';
  }

  get sourceId(): string {
    if (!this.item) {
      return this.itemId;
    }
    return this.item.source_id ?? (String(this.item.id).includes(':') ? String(this.item.id).split(':', 2)[1] : this.item.id);
  }

  get calendarTitle(): string {
    return this.item?.title || 'Item da agenda';
  }

  get calendarDescription(): string {
    const blocks = [
      this.item?.description || this.item?.notes || '',
      this.item?.client_name ? `Cliente: ${this.item.client_name}` : '',
      this.item?.case_number ? `Processo: ${this.item.case_number}` : '',
      this.item?.location ? `Local: ${this.item.location}` : ''
    ].filter(Boolean);

    return blocks.join('\n');
  }

  get calendarLocation(): string {
    return this.item?.location || '';
  }

  get calendarStart(): Date | null {
    return this.parseDate(this.item?.start_at || this.item?.due_at || this.item?.end_at || this.item?.created_at);
  }

  get calendarEnd(): Date | null {
    if (this.item?.end_at) {
      return this.parseDate(this.item.end_at);
    }

    const start = this.calendarStart;
    if (!start) {
      return null;
    }

    const end = new Date(start.getTime());
    end.setHours(end.getHours() + 1);
    return end;
  }

  async ngOnInit(): Promise<void> {
    this.itemId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.itemId) {
      await this.router.navigate(['/plataforma/agenda']);
      return;
    }

    await this.loadItem();
  }

  async goToEdit(): Promise<void> {
    if (!this.item?.id) {
      return;
    }

    await this.router.navigate(['/plataforma/agenda', this.item.id, 'editar'], {
      queryParams: this.isTask ? { kind: 'task' } : undefined
    });
  }

  async openClient(): Promise<void> {
    const clientId = this.item?.client_id;
    if (!clientId) {
      this.errorMessage = 'Este item da agenda ainda nao possui cliente vinculado.';
      return;
    }

    await this.router.navigate(['/plataforma/clientes', clientId]);
  }

  async openProcess(): Promise<void> {
    const caseId = this.item?.case_id;
    if (!caseId) {
      this.errorMessage = 'Este item da agenda ainda nao possui processo vinculado.';
      return;
    }

    await this.router.navigate(['/plataforma/processos', caseId]);
  }

  async createRelatedDocument(): Promise<void> {
    await this.router.navigate(['/plataforma/documentos/novo'], {
      queryParams: {
        client: this.item?.client_id || '',
        case: this.item?.case_id || ''
      }
    });
  }

  async createRelatedCommunication(): Promise<void> {
    await this.router.navigate(['/plataforma/comunicacoes/nova'], {
      queryParams: {
        client: this.item?.client_id || '',
        case: this.item?.case_id || ''
      }
    });
  }

  async openDocument(documentId: string): Promise<void> {
    await this.router.navigate(['/plataforma/documentos', documentId]);
  }

  async openCommunication(messageId: string): Promise<void> {
    await this.router.navigate(['/plataforma/comunicacoes', messageId]);
  }

  downloadIcs(): void {
    const start = this.calendarStart;
    const end = this.calendarEnd;
    if (!start || !end) {
      this.errorMessage = 'Nao foi possivel gerar o arquivo de calendario para este item.';
      return;
    }

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//JurisFlow//Agenda//PT-BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${this.item?.id || this.itemId}@jurisflow`,
      `DTSTAMP:${this.toUtcIcs(new Date())}`,
      `DTSTART:${this.toUtcIcs(start)}`,
      `DTEND:${this.toUtcIcs(end)}`,
      `SUMMARY:${this.escapeIcs(this.calendarTitle)}`,
      `DESCRIPTION:${this.escapeIcs(this.calendarDescription)}`,
      `LOCATION:${this.escapeIcs(this.calendarLocation)}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.slugify(this.calendarTitle || 'agenda-item')}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  openGoogleCalendar(): void {
    const start = this.calendarStart;
    const end = this.calendarEnd;
    if (!start || !end) {
      this.errorMessage = 'Nao foi possivel abrir este item no Google Calendar.';
      return;
    }

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: this.calendarTitle,
      details: this.calendarDescription,
      location: this.calendarLocation,
      dates: `${this.toUtcIcs(start)}/${this.toUtcIcs(end)}`
    });

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener');
  }

  openOutlookCalendar(): void {
    const start = this.calendarStart;
    const end = this.calendarEnd;
    if (!start || !end) {
      this.errorMessage = 'Nao foi possivel abrir este item no Outlook.';
      return;
    }

    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: this.calendarTitle,
      body: this.calendarDescription,
      location: this.calendarLocation,
      startdt: start.toISOString(),
      enddt: end.toISOString()
    });

    window.open(`https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`, '_blank', 'noopener');
  }

  private async loadItem(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(this.api.get<any>('agenda-items', this.itemId));
      this.item = response?.data ?? null;
      await this.loadRelatedContext();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o item da agenda.';
    } finally {
      this.loading = false;
    }
  }

  private async loadRelatedContext(): Promise<void> {
    const clientId = this.item?.client_id ?? '';
    const caseId = this.item?.case_id ?? '';

    const [documentsResponse, messagesResponse] = await Promise.all([
      firstValueFrom(this.api.list<any>('documents', { client_id: clientId, case_id: caseId, limit: 6 })),
      firstValueFrom(this.api.list<any>('messages', { client_id: clientId, case_id: caseId, limit: 6 }))
    ]);

    this.relatedDocuments = (documentsResponse?.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      title: row.title ?? 'Documento',
      subtitle: row.file_type ?? row.document_type ?? 'Arquivo',
      when: this.formatDateTime(row.created_at)
    }));

    this.relatedCommunications = (messagesResponse?.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      title: row.subject ?? 'Comunicacao',
      subtitle: `${row.channel ?? 'email'} - ${row.recipient ?? '-'}`,
      when: this.formatDateTime(row.sent_at ?? row.created_at)
    }));
  }

  formatDateTime(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  labelStatus(): string {
    const value = String(this.item?.status ?? '').toLowerCase();
    if (value === 'scheduled') return 'Agendado';
    if (value === 'confirmed') return 'Confirmado';
    if (value === 'done' || value === 'completed') return 'Concluido';
    if (value === 'open' || value === 'pending') return 'Pendente';
    if (value === 'in_progress') return 'Em andamento';
    if (value === 'canceled' || value === 'cancelled') return 'Cancelado';
    return this.item?.status ?? '-';
  }

  labelPriority(): string {
    const value = String(this.item?.priority ?? '').toLowerCase();
    if (value === 'high') return 'Alta';
    if (value === 'medium') return 'Media';
    if (value === 'low') return 'Baixa';
    if (value === 'urgent') return 'Urgente';
    return this.item?.priority ?? 'Agenda';
  }

  labelKind(): string {
    if (this.isTask) {
      return 'Tarefa';
    }
    const type = this.item?.item_type ?? this.item?.type ?? 'Compromisso';
    return String(type).charAt(0).toUpperCase() + String(type).slice(1);
  }

  private parseDate(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toUtcIcs(date: Date): string {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  }

  private escapeIcs(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
