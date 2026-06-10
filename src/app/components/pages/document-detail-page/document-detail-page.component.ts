import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';
import { DocumentAttachmentRow, DocumentSignatureRequestRow, DocumentVersionRow } from '../../../models/jurisflow.models';

type RelatedHistoryItem = {
  kind: 'agenda' | 'communication';
  label: string;
  title: string;
  subtitle: string;
  when: string;
  targetId?: string;
};

@Component({
  selector: 'app-document-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule],
  templateUrl: './document-detail-page.component.html',
  styleUrl: './document-detail-page.component.scss'
})
export class DocumentDetailPageComponent implements OnInit {
  documentId = '';
  loading = false;
  processingOcr = false;
  savingOcr = false;
  uploadingVersion = false;
  uploadingAttachment = false;
  promotingVersion = false;
  removingVersion = false;
  removingAttachment = false;
  creatingSignatureRequest = false;
  updatingSignatureRequest = false;
  errorMessage = '';
  successMessage = '';
  document: any = null;
  ocrResult: any = null;
  documentInsights: any = null;
  ocrReviewedText = '';
  relatedHistory: RelatedHistoryItem[] = [];
  versions: DocumentVersionRow[] = [];
  attachments: DocumentAttachmentRow[] = [];
  signatureRequests: DocumentSignatureRequestRow[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  async ngOnInit(): Promise<void> {
    this.documentId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.documentId) {
      await this.router.navigate(['/plataforma/documentos']);
      return;
    }

    await this.loadDocument();
  }

  async goToEdit(): Promise<void> {
    await this.router.navigate(['/plataforma/documentos', this.documentId, 'editar']);
  }

  async openClient(): Promise<void> {
    const clientId = this.document?.client_id;
    if (!clientId) {
      this.errorMessage = 'Este documento ainda nao possui cliente vinculado.';
      return;
    }
    await this.router.navigate(['/plataforma/clientes', clientId]);
  }

  async openProcess(): Promise<void> {
    const caseId = this.document?.case_id;
    if (!caseId) {
      this.errorMessage = 'Este documento ainda nao possui processo vinculado.';
      return;
    }
    await this.router.navigate(['/plataforma/processos', caseId]);
  }

  async createRelatedCommunication(): Promise<void> {
    await this.router.navigate(['/plataforma/comunicacoes/nova'], {
      queryParams: {
        client: this.document?.client_id ?? '',
        case: this.document?.case_id ?? ''
      }
    });
  }

  openDocument(): void {
    const fileUrl = this.document?.file_url;
    if (!fileUrl) {
      this.errorMessage = 'Este documento ainda nao possui um arquivo disponivel para visualizacao.';
      return;
    }

    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }

  downloadDocument(): void {
    this.downloadFile(this.document?.file_url, this.document?.title ?? 'documento');
  }

  async processOcr(): Promise<void> {
    if (this.processingOcr) {
      return;
    }

    this.processingOcr = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      const response = await firstValueFrom(this.api.postPath<any>(`documents/${this.documentId}/ocr`, {}));
      this.ocrResult = response?.data ?? null;
      this.ocrReviewedText = this.ocrResult?.reviewed_text || this.ocrResult?.extracted_text || '';
      this.successMessage = 'OCR do documento processado com sucesso.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel processar o OCR do documento.';
    } finally {
      this.processingOcr = false;
    }
  }

  async saveOcrReview(): Promise<void> {
    if (this.savingOcr) {
      return;
    }

    this.savingOcr = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      const response = await firstValueFrom(
        this.api.putPath<any>(`documents/${this.documentId}/ocr`, {
          reviewed_text: this.ocrReviewedText,
          status: 'reviewed'
        })
      );
      this.ocrResult = response?.data ?? this.ocrResult;
      this.successMessage = 'Texto revisado do OCR salvo com sucesso.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel salvar a revisao do OCR.';
    } finally {
      this.savingOcr = false;
    }
  }

  openVersion(version: DocumentVersionRow): void {
    window.open(version.fileUrl, '_blank', 'noopener,noreferrer');
  }

  downloadVersion(version: DocumentVersionRow): void {
    this.downloadFile(version.fileUrl, version.title || version.versionLabel || 'versao-documento');
  }

  async makeCurrentVersion(version: DocumentVersionRow): Promise<void> {
    if (!version.id || version.isCurrent || this.promotingVersion) {
      return;
    }

    this.promotingVersion = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await firstValueFrom(this.api.update('document-versions', version.id, { is_current: true }));
      this.successMessage = `A versao ${version.versionLabel} agora e a versao atual do documento.`;
      await this.loadVersions();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel definir a versao atual.';
    } finally {
      this.promotingVersion = false;
    }
  }

  async removeVersion(version: DocumentVersionRow): Promise<void> {
    if (!version.id || version.isCurrent || this.removingVersion) {
      return;
    }

    this.removingVersion = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await firstValueFrom(this.api.delete('document-versions', version.id));
      this.successMessage = `Versao ${version.versionLabel} removida com sucesso.`;
      await this.loadVersions();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel remover a versao.';
    } finally {
      this.removingVersion = false;
    }
  }

  openAttachment(attachment: DocumentAttachmentRow): void {
    window.open(attachment.fileUrl, '_blank', 'noopener,noreferrer');
  }

  downloadAttachment(attachment: DocumentAttachmentRow): void {
    this.downloadFile(attachment.fileUrl, attachment.title || 'anexo-documento');
  }

  async removeAttachment(attachment: DocumentAttachmentRow): Promise<void> {
    if (!attachment.id || this.removingAttachment) {
      return;
    }

    this.removingAttachment = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await firstValueFrom(this.api.delete('document-attachments', attachment.id));
      this.successMessage = 'Anexo removido com sucesso.';
      await this.loadAttachments();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel remover o anexo.';
    } finally {
      this.removingAttachment = false;
    }
  }

  async createSignatureRequest(): Promise<void> {
    if (this.creatingSignatureRequest) {
      return;
    }

    const signerName = this.document?.client_name || this.document?.client_id || '';
    const signerEmail = this.document?.client_email || '';
    if (!signerName) {
      this.errorMessage = 'Vincule um cliente ao documento antes de solicitar assinatura digital.';
      return;
    }

    this.creatingSignatureRequest = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await firstValueFrom(
        this.api.create('document-signature-requests', {
          document_id: this.documentId,
          signer_name: signerName,
          signer_email: signerEmail,
          signer_document: this.document?.client_document || '',
          signer_role: 'Cliente',
          status: 'sent',
          notes: 'Solicitacao criada a partir do detalhe do documento.'
        })
      );

      this.successMessage = 'Solicitacao de assinatura digital criada com sucesso.';
      await this.loadSignatureRequests();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel criar a solicitacao de assinatura.';
    } finally {
      this.creatingSignatureRequest = false;
    }
  }

  async cancelSignatureRequest(request: DocumentSignatureRequestRow): Promise<void> {
    if (!request.id || this.updatingSignatureRequest) {
      return;
    }

    this.updatingSignatureRequest = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await firstValueFrom(this.api.update('document-signature-requests', request.id, { status: 'cancelled' }));
      this.successMessage = 'Solicitacao de assinatura cancelada.';
      await this.loadSignatureRequests();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel cancelar a solicitacao.';
    } finally {
      this.updatingSignatureRequest = false;
    }
  }

  async markSignatureRequestAsSent(request: DocumentSignatureRequestRow): Promise<void> {
    if (!request.id || this.updatingSignatureRequest) {
      return;
    }

    this.updatingSignatureRequest = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await firstValueFrom(this.api.update('document-signature-requests', request.id, { status: 'sent' }));
      this.successMessage = 'Solicitacao atualizada como enviada.';
      await this.loadSignatureRequests();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel atualizar a solicitacao.';
    } finally {
      this.updatingSignatureRequest = false;
    }
  }

  copySignatureLink(request: DocumentSignatureRequestRow): void {
    const link = this.signatureLink(request);
    if (!link) {
      this.errorMessage = 'Esta solicitacao ainda nao possui link publico disponivel.';
      return;
    }

    void navigator.clipboard.writeText(link);
    this.successMessage = 'Link publico de assinatura copiado.';
  }

  openSignatureLink(request: DocumentSignatureRequestRow): void {
    const link = this.signatureLink(request);
    if (!link) {
      this.errorMessage = 'Esta solicitacao ainda nao possui link publico disponivel.';
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
  }

  signatureLink(request: DocumentSignatureRequestRow): string {
    if (!request.accessToken) {
      return '';
    }

    const origin = window.location.origin;
    return `${origin}/assinatura/${request.accessToken}`;
  }

  async handleVersionSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || this.uploadingVersion) {
      return;
    }

    this.uploadingVersion = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const uploadData = await this.uploadFile(file);
      const nextVersion = this.buildNextVersionLabel();

      await firstValueFrom(
        this.api.create('document-versions', {
          document_id: this.documentId,
          created_by: this.document?.uploaded_by ?? '',
          version_label: nextVersion,
          title: file.name.replace(/\.[^.]+$/, ''),
          file_url: uploadData.file_url,
          file_type: uploadData.file_type ?? this.detectFileType(file.name, file.type),
          notes: 'Versao adicionada pelo fluxo web.',
          is_current: true
        })
      );

      this.successMessage = `Nova versao ${nextVersion} adicionada com sucesso.`;
      await this.loadVersions();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao adicionar nova versao.';
    } finally {
      this.uploadingVersion = false;
      if (input) {
        input.value = '';
      }
    }
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
        this.api.create('document-attachments', {
          document_id: this.documentId,
          uploaded_by: this.document?.uploaded_by ?? '',
          title: file.name.replace(/\.[^.]+$/, ''),
          file_url: uploadData.file_url,
          file_type: uploadData.file_type ?? this.detectFileType(file.name, file.type),
          notes: 'Anexo adicionado pelo fluxo web.'
        })
      );

      this.successMessage = 'Anexo adicionado com sucesso.';
      await this.loadAttachments();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao adicionar anexo.';
    } finally {
      this.uploadingAttachment = false;
      if (input) {
        input.value = '';
      }
    }
  }

  async openHistoryItem(item: RelatedHistoryItem): Promise<void> {
    if (item.kind === 'agenda') {
      await this.router.navigate(['/plataforma/agenda']);
      return;
    }

    if (item.kind === 'communication' && item.targetId) {
      await this.router.navigate(['/plataforma/comunicacoes', item.targetId]);
    }
  }

  statusLabel(value?: string): string {
    const status = String(value || '').toLowerCase();
    if (status === 'pending') return 'Pendente';
    if (status === 'sent') return 'Enviada';
    if (status === 'viewed') return 'Visualizada';
    if (status === 'signed') return 'Assinada';
    if (status === 'cancelled') return 'Cancelada';
    return value || '-';
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('pt-BR');
  }

  formatDateTime(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  private async loadDocument(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await firstValueFrom(this.api.get<any>('documents', this.documentId));
      this.document = response?.data ?? null;
      await Promise.all([
        this.loadRelatedHistory(),
        this.loadVersions(),
        this.loadAttachments(),
        this.loadSignatureRequests(),
        this.loadOcrResult(),
        this.loadDocumentInsights()
      ]);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o documento.';
    } finally {
      this.loading = false;
    }
  }

  private async loadVersions(): Promise<void> {
    const response = await firstValueFrom(this.api.list<any>('document-versions', { document_id: this.documentId, limit: 20 }));
    this.versions = (response?.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      documentId: row.document_id ?? '',
      versionLabel: row.version_label ?? 'v1',
      title: row.title ?? 'Versao',
      fileUrl: row.file_url ?? '',
      fileType: row.file_type ?? '',
      notes: row.notes ?? '',
      isCurrent: !!row.is_current,
      createdAt: row.created_at ?? ''
    }));
  }

  private async loadAttachments(): Promise<void> {
    const response = await firstValueFrom(this.api.list<any>('document-attachments', { document_id: this.documentId, limit: 20 }));
    this.attachments = (response?.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      documentId: row.document_id ?? '',
      title: row.title ?? 'Anexo',
      fileUrl: row.file_url ?? '',
      fileType: row.file_type ?? '',
      notes: row.notes ?? '',
      createdAt: row.created_at ?? ''
    }));
  }

  private async loadSignatureRequests(): Promise<void> {
    const response = await firstValueFrom(this.api.list<any>('document-signature-requests', { document_id: this.documentId, limit: 20 }));
    this.signatureRequests = (response?.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      documentId: row.document_id ?? '',
      signerName: row.signer_name ?? 'Assinante',
      signerEmail: row.signer_email ?? '',
      signerDocument: row.signer_document ?? '',
      signerRole: row.signer_role ?? '',
      status: row.status ?? 'pending',
      accessToken: row.access_token ?? '',
      notes: row.notes ?? '',
      sentAt: row.sent_at ?? '',
      viewedAt: row.viewed_at ?? '',
      signedAt: row.signed_at ?? '',
      cancelledAt: row.cancelled_at ?? '',
      createdAt: row.created_at ?? ''
    }));
  }

  private async loadOcrResult(): Promise<void> {
    const response = await firstValueFrom(this.api.getPath<any>(`documents/${this.documentId}/ocr`));
    this.ocrResult = response?.data && Object.keys(response.data).length ? response.data : null;
    this.ocrReviewedText = this.ocrResult?.reviewed_text || this.ocrResult?.extracted_text || '';
  }

  private async loadDocumentInsights(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.getPath<any>(`ai/document-insights/${this.documentId}`));
      this.documentInsights = response?.data ?? null;
    } catch {
      this.documentInsights = null;
    }
  }

  private async loadRelatedHistory(): Promise<void> {
    const clientId = this.document?.client_id ?? '';
    const caseId = this.document?.case_id ?? '';

    const [agendaResponse, messagesResponse] = await Promise.all([
      firstValueFrom(this.api.list<any>('agenda-items', { client_id: clientId, case_id: caseId, limit: 10 })),
      firstValueFrom(this.api.list<any>('messages', { client_id: clientId, case_id: caseId, limit: 10 }))
    ]);

    this.relatedHistory = [
      ...((agendaResponse?.data ?? []).map((row: any) => ({
        kind: 'agenda' as const,
        label: 'Agenda',
        title: row.title ?? 'Item da agenda',
        subtitle: `${row.item_type ?? row.item_kind ?? 'agenda'} - ${row.status ?? 'open'}`,
        when: this.formatDateTime(row.start_at ?? row.due_at ?? row.created_at)
      }))),
      ...((messagesResponse?.data ?? []).map((row: any) => ({
        kind: 'communication' as const,
        label: 'Comunicacao',
        title: row.subject ?? 'Comunicacao',
        subtitle: `${row.channel ?? 'email'} - ${row.recipient ?? '-'}`,
        when: this.formatDateTime(row.sent_at ?? row.created_at),
        targetId: String(row.id ?? '')
      })))
    ]
      .sort((a, b) => this.parseDateTime(b.when) - this.parseDateTime(a.when))
      .slice(0, 8);
  }

  private async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const uploadResponse = await firstValueFrom(this.api.uploadPath<any>('documents/upload', formData));
    return uploadResponse?.data ?? {};
  }

  private buildNextVersionLabel(): string {
    const current = this.versions.length + 1;
    return `v${current}`;
  }

  private downloadFile(fileUrl?: string, fileName?: string): void {
    if (!fileUrl) {
      this.errorMessage = 'Nenhum arquivo disponivel para download.';
      return;
    }

    const anchor = window.document.createElement('a');
    anchor.href = fileUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.download = fileName ?? 'arquivo';
    anchor.click();
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
