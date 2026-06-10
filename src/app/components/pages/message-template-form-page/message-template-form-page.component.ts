import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { firstValueFrom } from 'rxjs';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-message-template-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule],
  templateUrl: './message-template-form-page.component.html',
  styleUrl: './message-template-form-page.component.scss'
})
export class MessageTemplateFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly subjectPlaceholder = 'Ex.: Atualizacao do processo {{ processo_numero }}';

  readonly channelOptions = [
    { value: 'email', label: 'E-mail' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'sms', label: 'SMS' },
    { value: 'internal', label: 'Interno' }
  ];

  readonly variableSuggestions = [
    '{{ cliente_nome }}',
    '{{ cliente_email }}',
    '{{ cliente_telefone }}',
    '{{ processo_numero }}',
    '{{ processo_titulo }}',
    '{{ responsavel_nome }}',
    '{{ data_atual }}',
    '{{ hora_atual }}'
  ];

  templateId = '';
  loading = false;
  saving = false;
  errorMessage = '';

  form = this.fb.group({
    name: ['', Validators.required],
    channel: ['email', Validators.required],
    subject: [''],
    body: ['', Validators.required],
    active: [true]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  get isEdit(): boolean {
    return !!this.templateId;
  }

  get previewSubject(): string {
    if (this.form.controls.channel.value === 'email') {
      return this.form.controls.subject.value?.trim() || 'Assunto do e-mail aparecera aqui.';
    }
    return 'Este canal nao utiliza assunto.';
  }

  get previewBody(): string {
    const body = this.form.controls.body.value?.trim();
    return body || 'O corpo da mensagem aparecera aqui conforme voce preencher o modelo.';
  }

  async ngOnInit(): Promise<void> {
    this.templateId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.isEdit) {
      await this.load();
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const payload = this.form.getRawValue();

    try {
      if (this.isEdit) {
        await firstValueFrom(this.api.update('message-templates', this.templateId, payload as any));
      } else {
        await firstValueFrom(this.api.create('message-templates', payload as any));
      }
      await this.router.navigate(['/plataforma/modelos-comunicacao']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao salvar o modelo de comunicacao.';
    } finally {
      this.saving = false;
    }
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(this.api.get<any>('message-templates', this.templateId));
      this.form.patchValue(response?.data ?? {});
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o modelo.';
    } finally {
      this.loading = false;
    }
  }
}
