import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { firstValueFrom } from 'rxjs';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-document-template-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule],
  templateUrl: './document-template-form-page.component.html',
  styleUrl: './document-template-form-page.component.scss'
})
export class DocumentTemplateFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly variableSuggestions = [
    '{{ cliente_nome }}',
    '{{ cliente_email }}',
    '{{ cliente_telefone }}',
    '{{ cliente_documento }}',
    '{{ processo_numero }}',
    '{{ processo_titulo }}',
    '{{ processo_area }}',
    '{{ data_atual }}',
    '{{ escritorio_nome }}'
  ];

  readonly fileTypeOptions = ['html', 'pdf', 'docx', 'txt'];

  templateId = '';
  loading = false;
  saving = false;
  errorMessage = '';

  form = this.fb.group({
    name: ['', Validators.required],
    category: ['general'],
    file_type: ['html'],
    template_body: ['', Validators.required],
    variables: ['[]'],
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

  get previewBody(): string {
    const content = this.form.controls.template_body.value?.trim();
    return content || 'O conteudo do modelo aparecera aqui conforme voce preencher o texto.';
  }

  get variablesPreview(): string[] {
    const rawValue = this.form.controls.variables.value?.trim();
    if (!rawValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return [];
    }

    return [];
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
        await firstValueFrom(this.api.update('document-templates', this.templateId, payload as any));
      } else {
        await firstValueFrom(this.api.create('document-templates', payload as any));
      }
      await this.router.navigate(['/plataforma/modelos-documento']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao salvar o modelo de documento.';
    } finally {
      this.saving = false;
    }
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(this.api.get<any>('document-templates', this.templateId));
      const data = response?.data ?? {};
      this.form.patchValue({
        ...data,
        variables: typeof data.variables === 'string' ? data.variables : JSON.stringify(data.variables ?? [], null, 2)
      });
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o modelo.';
    } finally {
      this.loading = false;
    }
  }
}
