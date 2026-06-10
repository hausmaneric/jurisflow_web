import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-document-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule, DropDownListModule, TextBoxModule],
  templateUrl: './document-form-page.component.html',
  styleUrl: './document-form-page.component.scss'
})
export class DocumentFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  documentId = '';
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  clients: Array<{ id: string; name: string }> = [];
  cases: Array<{ id: string; title: string }> = [];
  templates: Array<{ id: string; name: string; category?: string; fileType?: string; body?: string }> = [];
  generatedContent = '';
  selectedFileName = '';
  selectedFileSize = '';
  private objectUrl = '';
  private selectedFile: File | null = null;

  readonly statusOptions = ['active', 'pending', 'expired'];
  readonly fileTypeOptions = ['PDF', 'DOCX', 'XLSX', 'PNG', 'JPG', 'ZIP'];

  form = this.fb.group({
    client_id: [''],
    case_id: [''],
    template_id: [''],
    title: ['', Validators.required],
    file_url: ['', Validators.required],
    file_type: ['PDF'],
    status: ['active', Validators.required]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  get isEdit(): boolean {
    return this.documentId.trim().length > 0;
  }

  async ngOnInit(): Promise<void> {
    this.documentId = this.route.snapshot.paramMap.get('id') ?? '';
    await this.loadOptions();
    if (this.isEdit) {
      await this.loadDocument();
    } else {
      this.applyInitialQueryParams();
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      if (this.selectedFile) {
        const formData = new FormData();
        formData.append('file', this.selectedFile);
        const uploadResponse = await firstValueFrom(this.api.uploadPath<any>('documents/upload', formData));
        const uploadData = uploadResponse?.data ?? {};
        this.form.patchValue({
          file_url: uploadData.file_url ?? this.form.get('file_url')?.value ?? '',
          file_type: uploadData.file_type ?? this.form.get('file_type')?.value ?? 'PDF'
        });
      }

      if (this.isEdit) {
        await firstValueFrom(this.api.update('documents', this.documentId, this.form.getRawValue()));
      } else {
        await firstValueFrom(this.api.create('documents', this.form.getRawValue()));
      }
      this.successMessage = 'Documento salvo com sucesso.';
      await this.router.navigate(['/plataforma/documentos']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao salvar documento.';
    } finally {
      this.saving = false;
    }
  }

  async generateFromTemplate(): Promise<void> {
    const templateId = this.form.get('template_id')?.value ?? '';
    if (!templateId || this.saving) {
      this.errorMessage = 'Selecione um modelo para gerar o conteudo do documento.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const client = this.clients.find((item) => item.id === (this.form.get('client_id')?.value ?? ''));
      const legalCase = this.cases.find((item) => item.id === (this.form.get('case_id')?.value ?? ''));
      const response = await firstValueFrom(
        this.api.postPath<any>('documents/generate', {
          template_id: templateId,
          context: {
            client: {
              id: client?.id ?? '',
              name: client?.name ?? ''
            },
            case: {
              id: legalCase?.id ?? '',
              title: legalCase?.title ?? ''
            },
            document: {
              title: this.form.get('title')?.value ?? ''
            }
          }
        })
      );

      const generated = response?.data ?? {};
      const template = this.templates.find((item) => item.id === templateId);
      this.generatedContent = generated.content ?? '';
      this.form.patchValue({
        title: this.form.get('title')?.value || generated.template_name || template?.name || '',
        file_type: generated.file_type || template?.fileType || this.form.get('file_type')?.value || 'PDF'
      });
      this.successMessage = response?.message ?? 'Documento gerado com sucesso a partir do modelo.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao gerar documento pelo modelo.';
    } finally {
      this.saving = false;
    }
  }

  applyTemplate(templateId: string): void {
    const template = this.templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    this.form.patchValue({
      title: this.form.get('title')?.value || template.name || '',
      file_type: this.form.get('file_type')?.value || template.fileType || 'PDF'
    });
    if (!this.generatedContent && template.body) {
      this.generatedContent = template.body;
    }
  }

  handleSelectedFile(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.objectUrl = URL.createObjectURL(file);
    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.selectedFileSize = this.formatBytes(file.size);

    const inferredType = this.detectFileType(file.name, file.type);
    const title = file.name.replace(/\.[^.]+$/, '');

    this.form.patchValue({
      title: this.form.get('title')?.value || title,
      file_url: this.objectUrl,
      file_type: inferredType
    });

    this.successMessage = 'Arquivo selecionado com sucesso. Revise os dados e salve o documento.';
    this.errorMessage = '';
  }

  private async loadOptions(): Promise<void> {
    try {
      const [clients, cases, templates] = await Promise.all([
        firstValueFrom(this.api.list<any>('clients', { limit: 200 })),
        firstValueFrom(this.api.list<any>('cases', { limit: 200 })),
        firstValueFrom(this.api.list<any>('document-templates', { limit: 200 }))
      ]);
      this.clients = (clients.data ?? []).map((item) => ({ id: item.id, name: item.name ?? item.full_name ?? 'Cliente' }));
      this.cases = (cases.data ?? []).map((item) => ({ id: item.id, title: item.title ?? item.case_number ?? item.id }));
      this.templates = (templates.data ?? []).map((item) => ({
        id: item.id,
        name: item.name ?? 'Modelo',
        category: item.category ?? '',
        fileType: item.file_type ?? 'PDF',
        body: item.template_body ?? ''
      }));
    } catch {
      this.clients = [];
      this.cases = [];
      this.templates = [];
    }
  }

  private async loadDocument(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(this.api.get<any>('documents', this.documentId));
      if (response?.data) {
        this.form.patchValue({
          client_id: response.data.client_id ?? '',
          case_id: response.data.case_id ?? '',
          template_id: response.data.template_id ?? '',
          title: response.data.title ?? '',
          file_url: response.data.file_url ?? '',
          file_type: response.data.file_type ?? 'PDF',
          status: response.data.status ?? 'active'
        });
      }
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o documento.';
    } finally {
      this.loading = false;
    }
  }

  private applyInitialQueryParams(): void {
    const templateId = this.route.snapshot.queryParamMap.get('template') ?? '';
    const clientId = this.route.snapshot.queryParamMap.get('client') ?? '';
    const caseId = this.route.snapshot.queryParamMap.get('case') ?? '';
    const fileType = this.route.snapshot.queryParamMap.get('fileType') ?? '';

    this.form.patchValue({
      template_id: templateId,
      client_id: clientId,
      case_id: caseId,
      file_type: fileType || this.form.get('file_type')?.value || 'PDF'
    });

    if (templateId) {
      this.applyTemplate(templateId);
    }
  }

  private detectFileType(name?: string, mimeType?: string): string {
    const extension = String(name ?? '').split('.').pop()?.toUpperCase() ?? '';
    if (this.fileTypeOptions.includes(extension)) {
      return extension;
    }

    const mime = String(mimeType ?? '').toLowerCase();
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('word')) return 'DOCX';
    if (mime.includes('sheet') || mime.includes('excel')) return 'XLSX';
    if (mime.includes('png')) return 'PNG';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPG';
    if (mime.includes('zip')) return 'ZIP';
    return 'PDF';
  }

  private formatBytes(size: number): string {
    if (size <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const value = size / 1024 ** index;
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  }
}
