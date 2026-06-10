import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

type ClientOption = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
};

type CaseOption = {
  id: string;
  title: string;
  caseNumber?: string;
  clientName?: string;
};

type TemplateOption = {
  id: string;
  name: string;
  channel: string;
  subject?: string;
  body?: string;
};

type SaveMode = 'draft' | 'send';

@Component({
  selector: 'app-communication-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule, DropDownListModule, TextBoxModule],
  templateUrl: './communication-form-page.component.html',
  styleUrl: './communication-form-page.component.scss'
})
export class CommunicationFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  messageId = '';
  loading = false;
  saving = false;
  currentAction: SaveMode | 'template' | '' = '';
  errorMessage = '';
  successMessage = '';

  clients: ClientOption[] = [];
  cases: CaseOption[] = [];
  templates: TemplateOption[] = [];

  readonly channelOptions = ['whatsapp', 'email', 'push'];
  readonly statusOptions = ['queued', 'sent', 'scheduled', 'failed', 'draft'];

  form = this.fb.group({
    client_id: [''],
    case_id: [''],
    template_id: [''],
    channel: ['email', Validators.required],
    recipient: ['', Validators.required],
    subject: [''],
    body: ['', Validators.required],
    status: ['draft', Validators.required]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  get isEdit(): boolean {
    return this.messageId.trim().length > 0;
  }

  get selectedClient(): ClientOption | undefined {
    const clientId = this.form.get('client_id')?.value ?? '';
    return this.clients.find((item) => item.id === clientId);
  }

  get selectedCase(): CaseOption | undefined {
    const caseId = this.form.get('case_id')?.value ?? '';
    return this.cases.find((item) => item.id === caseId);
  }

  get selectedTemplate(): TemplateOption | undefined {
    const templateId = this.form.get('template_id')?.value ?? '';
    return this.templates.find((item) => item.id === templateId);
  }

  get previewRecipientHint(): string {
    const channel = this.form.get('channel')?.value ?? 'email';
    if (channel === 'whatsapp') return 'WhatsApp do cliente ou do contato responsavel';
    if (channel === 'push') return 'Destino interno do sistema';
    return 'E-mail do cliente ou do contato responsavel';
  }

  get communicationStatusLabel(): string {
    const status = this.form.get('status')?.value ?? 'draft';
    switch (status) {
      case 'sent':
        return 'Enviada';
      case 'scheduled':
        return 'Agendada';
      case 'failed':
        return 'Com falha';
      case 'queued':
        return 'Na fila';
      default:
        return 'Rascunho';
    }
  }

  async ngOnInit(): Promise<void> {
    this.messageId = this.route.snapshot.paramMap.get('id') ?? '';
    await this.loadOptions();

    this.form.get('client_id')?.valueChanges.subscribe((clientId) => {
      this.prefillRecipient(clientId as string);
      this.renderTemplateIfSelected();
    });

    this.form.get('case_id')?.valueChanges.subscribe(() => {
      this.renderTemplateIfSelected();
    });

    this.form.get('channel')?.valueChanges.subscribe(() => {
      const clientId = this.form.get('client_id')?.value ?? '';
      this.prefillRecipient(clientId);
      this.renderTemplateIfSelected();
    });

    if (this.isEdit) {
      await this.loadMessage();
    } else {
      this.applyInitialQueryParams();
    }
  }

  async saveDraft(): Promise<void> {
    await this.persistCommunication('draft');
  }

  async sendNow(): Promise<void> {
    await this.persistCommunication('send');
  }

  async sendFromTemplate(): Promise<void> {
    const templateId = this.form.get('template_id')?.value ?? '';
    const recipient = this.form.get('recipient')?.value ?? '';
    if (!templateId || !recipient || this.saving) {
      this.errorMessage = 'Selecione um modelo e informe o destinatario para enviar pelo fluxo de modelo.';
      return;
    }

    if (!this.form.get('body')?.value) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Revise a mensagem antes de enviar.';
      return;
    }

    this.currentAction = 'template';
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      const payload = {
        template_id: templateId,
        recipient,
        client_id: this.form.get('client_id')?.value ?? '',
        case_id: this.form.get('case_id')?.value ?? '',
        channel: this.form.get('channel')?.value ?? 'email',
        context: {
          recipient,
          subject: this.form.get('subject')?.value ?? '',
          body: this.form.get('body')?.value ?? '',
          client_name: this.selectedClient?.name ?? '',
          case_number: this.selectedCase?.caseNumber ?? this.selectedCase?.title ?? '',
          canal: this.form.get('channel')?.value ?? 'email'
        }
      };
      const response = await firstValueFrom(this.api.postPath<any>('messages/send-template', payload));
      this.successMessage = response?.message ?? 'Mensagem enviada com sucesso pelo modelo.';
      await this.router.navigate(['/plataforma/comunicacoes']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao enviar comunicacao pelo modelo.';
    } finally {
      this.saving = false;
      this.currentAction = '';
    }
  }

  applyTemplate(templateId: string): void {
    const template = this.templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    this.form.patchValue({
      channel: template.channel || this.form.get('channel')?.value || 'email',
      subject: this.renderTemplateText(template.subject || ''),
      body: this.renderTemplateText(template.body || '')
    });
  }

  private async persistCommunication(mode: SaveMode): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.currentAction = mode;
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      ...this.form.getRawValue(),
      status: mode === 'send' ? 'sent' : 'draft'
    };

    try {
      if (this.isEdit) {
        await firstValueFrom(this.api.update('messages', this.messageId, payload));
      } else {
        await firstValueFrom(this.api.create('messages', payload));
      }
      this.successMessage = mode === 'send'
        ? 'Comunicacao enviada e registrada com sucesso.'
        : 'Rascunho salvo com sucesso.';
      await this.router.navigate(['/plataforma/comunicacoes']);
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : (mode === 'send' ? 'Falha ao enviar comunicacao.' : 'Falha ao salvar rascunho.');
    } finally {
      this.saving = false;
      this.currentAction = '';
    }
  }

  private renderTemplateIfSelected(): void {
    const templateId = this.form.get('template_id')?.value ?? '';
    if (!templateId || this.isEdit) {
      return;
    }

    const template = this.templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    this.form.patchValue({
      subject: this.renderTemplateText(template.subject || ''),
      body: this.renderTemplateText(template.body || '')
    }, { emitEvent: false });
  }

  private renderTemplateText(value: string): string {
    if (!value) {
      return '';
    }

    const client = this.selectedClient;
    const caseItem = this.selectedCase;
    const channel = this.form.get('channel')?.value ?? 'email';

    return value
      .replace(/\{\{\s*cliente_nome\s*\}\}/gi, client?.name ?? 'Cliente')
      .replace(/\{\{\s*cliente_email\s*\}\}/gi, client?.email ?? '-')
      .replace(/\{\{\s*cliente_telefone\s*\}\}/gi, client?.phone ?? '-')
      .replace(/\{\{\s*processo_numero\s*\}\}/gi, caseItem?.caseNumber ?? caseItem?.title ?? '-')
      .replace(/\{\{\s*processo_titulo\s*\}\}/gi, caseItem?.title ?? '-')
      .replace(/\{\{\s*canal\s*\}\}/gi, channel)
      .replace(/\{\{\s*data_atual\s*\}\}/gi, new Date().toLocaleDateString('pt-BR'));
  }

  private prefillRecipient(clientId: string): void {
    if (!clientId || this.form.get('recipient')?.value) {
      return;
    }

    const client = this.clients.find((item) => item.id === clientId);
    const channel = this.form.get('channel')?.value ?? 'email';
    const fallbackRecipient = channel === 'whatsapp'
      ? (client?.phone || client?.email || client?.name || '')
      : (client?.email || client?.phone || client?.name || '');

    if (fallbackRecipient) {
      this.form.patchValue({ recipient: fallbackRecipient }, { emitEvent: false });
    }
  }

  private async loadOptions(): Promise<void> {
    try {
      const [clients, cases, templates] = await Promise.all([
        firstValueFrom(this.api.list<any>('clients', { limit: 200 })),
        firstValueFrom(this.api.list<any>('cases', { limit: 200 })),
        firstValueFrom(this.api.list<any>('message-templates', { limit: 200 }))
      ]);
      this.clients = (clients.data ?? []).map((item) => ({
        id: item.id,
        name: item.name ?? item.full_name ?? 'Cliente',
        email: item.email ?? '',
        phone: item.phone ?? '',
        document: item.document ?? ''
      }));
      this.cases = (cases.data ?? []).map((item) => ({
        id: item.id,
        title: item.title ?? item.case_number ?? item.id,
        caseNumber: item.case_number ?? '',
        clientName: item.client_name ?? ''
      }));
      this.templates = (templates.data ?? []).map((item) => ({
        id: item.id,
        name: item.name ?? 'Modelo',
        channel: item.channel ?? 'email',
        subject: item.subject ?? '',
        body: item.body ?? ''
      }));
    } catch {
      this.clients = [];
      this.cases = [];
      this.templates = [];
    }
  }

  private async loadMessage(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(this.api.get<any>('messages', this.messageId));
      if (response?.data) {
        this.form.patchValue({
          client_id: response.data.client_id ?? '',
          case_id: response.data.case_id ?? '',
          template_id: response.data.template_id ?? '',
          channel: response.data.channel ?? 'email',
          recipient: response.data.recipient ?? response.data.recipient_name ?? '',
          subject: response.data.subject ?? '',
          body: response.data.body ?? '',
          status: response.data.status ?? 'draft'
        });
      }
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar a comunicacao.';
    } finally {
      this.loading = false;
    }
  }

  private applyInitialQueryParams(): void {
    const templateId = this.route.snapshot.queryParamMap.get('template') ?? '';
    const clientId = this.route.snapshot.queryParamMap.get('client') ?? '';
    const caseId = this.route.snapshot.queryParamMap.get('case') ?? '';
    const channel = this.route.snapshot.queryParamMap.get('channel') ?? '';

    this.form.patchValue({
      template_id: templateId,
      client_id: clientId,
      case_id: caseId,
      channel: channel || this.form.get('channel')?.value || 'email'
    });

    if (clientId) {
      this.prefillRecipient(clientId);
    }

    if (templateId) {
      this.applyTemplate(templateId);
    }
  }
}
