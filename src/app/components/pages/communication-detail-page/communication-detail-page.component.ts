import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { CommunicationAttachmentRow } from '../../../models/jurisflow.models';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

type RelatedHistoryItem = {
  kind: 'document' | 'agenda';
  label: string;
  title: string;
  subtitle: string;
  when: string;
  targetId?: string;
};

@Component({
  selector: 'app-communication-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './communication-detail-page.component.html',
  styleUrl: './communication-detail-page.component.scss'
})
export class CommunicationDetailPageComponent implements OnInit {
  communicationId = '';
  loading = false;
  uploadingAttachment = false;
  updatingStatus = false;
  removingAttachment = false;
  errorMessage = '';
  successMessage = '';
  communication: any = null;
  communicationInsights: any = null;
  relatedHistory: RelatedHistoryItem[] = [];
  attachments: CommunicationAttachmentRow[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  async ngOnInit(): Promise<void> {
    this.communicationId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.communicationId) {
      await this.router.navigate(['/plataforma/comunicacoes']);
      return;
    }

    await this.loadCommunication();
  }

  get statusLabel(): string {
    const status = String(this.communication?.status ?? '').toLowerCase();
    switch (status) {
      case 'sent':
        return 'Enviada';
      case 'draft':
        return 'Rascunho';
      case 'scheduled':
        return 'Agendada';
      case 'failed':
        return 'Falha registrada';
      case 'queued':
        return 'Na fila';
      default:
        return this.communication?.status || 'Sem status';
    }
  }

  async goToEdit(): Promise<void> {
    await this.router.navigate(['/plataforma/comunicacoes', this.communicationId, 'editar']);
  }

  async openClient(): Promise<void> {
    const clientId = this.communication?.client_id;
    if (!clientId) {
      this.errorMessage = 'Esta comunicacao ainda nao possui cliente vinculado.';
      return;
    }
    await this.router.navigate(['/plataforma/clientes', clientId]);
  }

  async openProcess(): Promise<void> {
    const caseId = this.communication?.case_id;
    if (!caseId) {
      this.errorMessage = 'Esta comunicacao ainda nao possui processo vinculado.';
      return;
    }
    await this.router.navigate(['/plataforma/processos', caseId]);
  }

  async createRelatedDocument(): Promise<void> {
    await this.router.navigate(['/plataforma/documentos/novo'], {
      queryParams: {
        client: this.communication?.client_id ?? '',
        case: this.communication?.case_id ?? ''
      }
    });
  }

  async createAgendaFollowUp(): Promise<void> {
    await this.router.navigate(['/plataforma/agenda/novo'], {
      queryParams: {
        client: this.communication?.client_id ?? '',
        case: this.communication?.case_id ?? '',
        title: `Follow-up: ${this.communication?.subject || 'Comunicacao'}`
      }
    });
  }

  async markAsSent(): Promise<void> {
    await this.updateCommunicationStatus('sent', 'Comunicacao marcada como enviada com sucesso.');
  }

  async markAsDraft(): Promise<void> {
    await this.updateCommunicationStatus('draft', 'Comunicacao retornou para rascunho.');
  }

  async markAsFailed(): Promise<void> {
    await this.updateCommunicationStatus('failed', 'Falha de envio registrada com sucesso.');
  }

  async handleAttachmentSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || this.uploadingAttachment) {
      return;
    }

    this.uploadingAttachment = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const uploadData = await this.uploadFile(file);
      await firstValueFrom(
        this.api.create('message-attachments', {
          message_id: this.communicationId,
          uploaded_by: this.communication?.created_by ?? '',
          title: file.name.replace(/\.[^.]+$/, ''),
          file_url: uploadData.file_url,
          file_type: uploadData.file_type ?? this.detectFileType(file.name, file.type),
          notes: 'Anexo adicionado pelo fluxo web.'
        })
      );

      this.successMessage = 'Anexo adicionado com sucesso.';
      await this.loadAttachments();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao adicionar anexo a comunicacao.';
    } finally {
      this.uploadingAttachment = false;
      if (input) {
        input.value = '';
      }
    }
  }

  openAttachment(attachment: CommunicationAttachmentRow): void {
    window.open(attachment.fileUrl, '_blank', 'noopener,noreferrer');
  }

  downloadAttachment(attachment: CommunicationAttachmentRow): void {
    if (!attachment.fileUrl) {
      this.errorMessage = 'Nenhum arquivo disponivel para download.';
      return;
    }

    const anchor = window.document.createElement('a');
    anchor.href = attachment.fileUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.download = attachment.title || 'anexo-comunicacao';
    anchor.click();
  }

  async removeAttachment(attachment: CommunicationAttachmentRow): Promise<void> {
    if (!attachment.id || this.removingAttachment) {
      return;
    }

    this.removingAttachment = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await firstValueFrom(this.api.delete('message-attachments', attachment.id));
      this.successMessage = 'Anexo removido com sucesso.';
      await this.loadAttachments();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel remover o anexo.';
    } finally {
      this.removingAttachment = false;
    }
  }

  async openHistoryItem(item: RelatedHistoryItem): Promise<void> {
    if (item.kind === 'agenda') {
      await this.router.navigate(['/plataforma/agenda']);
      return;
    }

    if (item.kind === 'document' && item.targetId) {
      await this.router.navigate(['/plataforma/documentos', item.targetId]);
    }
  }

  formatDateTime(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  private async loadCommunication(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await firstValueFrom(this.api.get<any>('messages', this.communicationId));
      this.communication = response?.data ?? null;
      await Promise.all([this.loadRelatedHistory(), this.loadAttachments(), this.loadInsights()]);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar a comunicacao.';
    } finally {
      this.loading = false;
    }
  }

  private async loadAttachments(): Promise<void> {
    const response = await firstValueFrom(this.api.list<any>('message-attachments', { message_id: this.communicationId, limit: 20 }));
    this.attachments = (response?.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      messageId: row.message_id ?? '',
      title: row.title ?? 'Anexo',
      fileUrl: row.file_url ?? '',
      fileType: row.file_type ?? '',
      notes: row.notes ?? '',
      createdAt: row.created_at ?? ''
    }));
  }

  private async loadInsights(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.getPath<any>(`ai/communication-insights/${this.communicationId}`));
      this.communicationInsights = response?.data ?? null;
    } catch {
      this.communicationInsights = null;
    }
  }

  private async loadRelatedHistory(): Promise<void> {
    const clientId = this.communication?.client_id ?? '';
    const caseId = this.communication?.case_id ?? '';

    const [documentsResponse, agendaResponse] = await Promise.all([
      firstValueFrom(this.api.list<any>('documents', { client_id: clientId, case_id: caseId, limit: 10 })),
      firstValueFrom(this.api.list<any>('agenda-items', { client_id: clientId, case_id: caseId, limit: 10 }))
    ]);

    this.relatedHistory = [
      ...((documentsResponse?.data ?? []).map((row: any) => ({
        kind: 'document' as const,
        label: 'Documento',
        title: row.title ?? 'Documento',
        subtitle: row.file_type ?? row.document_type ?? 'arquivo',
        when: this.formatDateTime(row.created_at),
        targetId: String(row.id ?? '')
      }))),
      ...((agendaResponse?.data ?? []).map((row: any) => ({
        kind: 'agenda' as const,
        label: 'Agenda',
        title: row.title ?? 'Item da agenda',
        subtitle: `${row.item_type ?? row.item_kind ?? 'agenda'} - ${row.status ?? 'open'}`,
        when: this.formatDateTime(row.start_at ?? row.due_at ?? row.created_at)
      })))
    ]
      .sort((a, b) => this.parseDateTime(b.when) - this.parseDateTime(a.when))
      .slice(0, 8);
  }

  private async updateCommunicationStatus(status: 'sent' | 'draft' | 'failed', successMessage: string): Promise<void> {
    if (!this.communicationId || this.updatingStatus) {
      return;
    }

    this.updatingStatus = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await firstValueFrom(this.api.update('messages', this.communicationId, { status }));
      this.successMessage = successMessage;
      await this.loadCommunication();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel atualizar o status da comunicacao.';
    } finally {
      this.updatingStatus = false;
    }
  }

  private async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const uploadResponse = await firstValueFrom(this.api.uploadPath<any>('documents/upload', formData));
    return uploadResponse?.data ?? {};
  }

  private detectFileType(name?: string, mimeType?: string): string {
    const extension = String(name ?? '').split('.').pop()?.toUpperCase() ?? '';
    if (extension) {
      return extension;
    }

    const mime = String(mimeType ?? '').toLowerCase();
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('word')) return 'DOCX';
    if (mime.includes('sheet') || mime.includes('excel')) return 'XLSX';
    if (mime.includes('png')) return 'PNG';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPG';
    if (mime.includes('zip')) return 'ZIP';
    return 'ARQUIVO';
  }

  private parseDateTime(value?: string): number {
    if (!value || value === '-') return 0;
    const normalized = value.includes('/') ? value.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1') : value;
    const parsed = Date.parse(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
